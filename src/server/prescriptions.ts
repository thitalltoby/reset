import 'server-only';
import { db } from './db';
import { env } from './env';
import { randomToken } from './crypto';
import { audit } from './audit';
import { AppError, conflict, invalid, notFound } from './errors';
import { assertCan, actorOf, type Principal } from './rbac';
import { getSetting } from './settings';
import { clientIp, rateLimit } from './rate-limit';
import { deleteStored, saveUpload, MAX_FILES_PER_UPLOAD, type StoredFile } from './storage';
import { nextNumber } from './orders';
import { enqueueEmail, notifyInternal } from './notify';
import { emailTemplate } from './email-templates';
import { emitEvent } from './integrations/events';
import { fieldErrors, rxSchema } from '@/lib/validation';
import { RX_LABELS, RX_NEXT } from '@/lib/order-flow';
import type { RxStatus } from '@/generated/prisma/enums';

export interface RxSubmission {
  name: string; email: string; phone: string; preference?: string; note?: string; consent: boolean;
  files: File[];
  userId?: string | null;
}

/**
 * A customer sends a prescription for a pharmacist to review. This is NOT an order and nothing is dispensed from it automatically:
 * the pharmacist checks the prescription and tells the customer what happens next.
 */
export async function submitPrescription(input: RxSubmission): Promise<{ number: string; token: string }> {
  const shop = await getSetting('shop');
  if (!shop.prescriptions) throw invalid('Prescription requests are not open online yet. Please contact the pharmacy.');
  const parsed = rxSchema.safeParse({ name: input.name, email: input.email, phone: input.phone, preference: input.preference || 'PICKUP', note: input.note, consent: input.consent });
  if (!parsed.success) throw invalid('Please check the highlighted fields.', fieldErrors(parsed.error));
  if (!input.files.length) throw invalid('Attach a photo or scan of the prescription.', { files: 'Required.' });
  if (input.files.length > MAX_FILES_PER_UPLOAD) throw invalid(`Attach at most ${MAX_FILES_PER_UPLOAD} files.`, { files: 'Too many files.' });
  const ip = await clientIp();
  if (!(await rateLimit(`rx:ip:${ip}`, 8, 3600)) || !(await rateLimit(`rx:email:${parsed.data.email}`, 5, 3600))) throw new AppError('RATE_LIMITED', 'Too many prescriptions sent. Please try again later, or call the pharmacy.');

  const stored: StoredFile[] = [];
  try {
    for (const f of input.files) stored.push(await saveUpload(f));
  } catch (e) {
    for (const s of stored) await deleteStored(s.storageKey).catch(() => undefined);
    throw e;
  }
  const d = parsed.data;
  const token = randomToken(18);
  const number = await nextNumber('RX', 'rx', 100001);
  const rx = await db.prescription.create({
    data: {
      number, trackToken: token, userId: input.userId ?? null,
      name: d.name, email: d.email, phone: d.phone, preference: d.preference, customerNote: d.note ?? null,
      documents: { create: stored.map((s, i) => ({ ...s, visibility: 'CUSTOMER' as const, title: `Prescription file ${i + 1}`, uploadedById: input.userId ?? null, uploadedByLabel: d.name })) },
      events: { create: { label: 'Received', actorLabel: 'Customer' } },
    },
  });
  const tpl = emailTemplate({
    heading: `We have your prescription, ${d.name.split(' ')[0]}`,
    paragraphs: [
      'A pharmacist will review it and tell you what happens next. Nothing is dispensed until the pharmacist has checked the prescription with you.',
      'This is a request for review, not an order. We will email you; you can also check progress with the link below.',
    ],
    details: [['Reference', rx.number]],
    cta: { label: 'Check progress', url: `${env.APP_URL}/prescriptions/${token}` },
    footnote: 'If this is urgent or about a medicine you need today, please call the pharmacy rather than waiting for an email.',
  });
  await enqueueEmail({ type: 'rx.received', to: d.email, subject: `Reset Pharmacy prescription ${rx.number} received`, ...tpl, refId: rx.id });
  // Staff alerts carry the reference only, never anything from the prescription
  await notifyInternal('prescriptionTo', `New prescription ${rx.number}`, `New prescription ${rx.number}`, ['A customer has sent a prescription for review.'], `/admin/prescriptions/${rx.id}`, undefined, rx.id);
  await emitEvent('prescription.received', { number: rx.number }, rx.id);
  return { number: rx.number, token };
}

/** What the customer sees on their tracking page. Uploaded files and staff-only notes are not included. */
export async function getPrescriptionByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) return null;
  const rx = await db.prescription.findUnique({ where: { trackToken: token }, include: { events: { orderBy: { createdAt: 'asc' } }, documents: { select: { id: true } } } });
  if (!rx) return null;
  return { ...rx, fileCount: rx.documents.length };
}

/** The customer answers a "we need more information" request, optionally adding files. */
export async function respondToPrescription(token: string, note: string, files: File[]) {
  const rx = await db.prescription.findUnique({ where: { trackToken: token } });
  if (!rx) throw notFound('Prescription not found.');
  if (rx.status !== 'NEEDS_INFO') throw conflict('This prescription is not waiting for anything from you.');
  const text = note.trim();
  if (!text && !files.length) throw invalid('Write a reply or attach a file.', { note: 'Required.' });
  if (text.length > 1000) throw invalid('Keep your reply under 1,000 characters.', { note: 'Too long.' });
  if (files.length > MAX_FILES_PER_UPLOAD) throw invalid(`Attach at most ${MAX_FILES_PER_UPLOAD} files.`);
  if (!(await rateLimit(`rx:reply:${rx.id}`, 10, 3600))) throw new AppError('RATE_LIMITED', 'Too many replies. Please try again later.');
  const stored: StoredFile[] = [];
  try { for (const f of files) stored.push(await saveUpload(f)); } catch (e) { for (const s of stored) await deleteStored(s.storageKey).catch(() => undefined); throw e; }
  await db.$transaction(async (tx) => {
    for (const s of stored) await tx.document.create({ data: { ...s, visibility: 'CUSTOMER', title: 'Added by customer', prescriptionId: rx.id, uploadedByLabel: rx.name } });
    await tx.prescription.update({ where: { id: rx.id }, data: { status: 'IN_REVIEW' } });
    await tx.prescriptionEvent.create({ data: { prescriptionId: rx.id, label: 'Customer replied', note: text || `${stored.length} file${stored.length === 1 ? '' : 's'} added`, actorLabel: 'Customer' } });
  });
  await notifyInternal('prescriptionTo', `Prescription ${rx.number}: customer replied`, `Customer replied on ${rx.number}`, ['The customer has answered your question.'], `/admin/prescriptions/${rx.id}`, undefined, rx.id);
}

// ─── Staff ───────────────────────────────────────────────────────────

export async function listPrescriptions(user: Principal, f: { status?: string; q?: string } = {}) {
  assertCan(user, 'prescription.review');
  const q = f.q?.trim();
  return db.prescription.findMany({
    where: {
      ...(f.status ? { status: f.status as RxStatus } : {}),
      ...(q ? { OR: [{ number: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] } : {}),
    },
    include: { assignee: { select: { name: true } }, _count: { select: { documents: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
}

/** Opening a prescription is recorded: it is health information. */
export async function getPrescriptionForStaff(user: Principal, id: string) {
  assertCan(user, 'prescription.review');
  const rx = await db.prescription.findUnique({ where: { id }, include: { events: { orderBy: { createdAt: 'asc' } }, documents: { orderBy: { createdAt: 'asc' } }, assignee: { select: { id: true, name: true } } } });
  if (!rx) return null;
  await audit(actorOf(user), 'prescription.viewed', 'Prescription', id);
  return rx;
}

export async function assignPrescription(user: Principal, id: string, assigneeId: string | null) {
  assertCan(user, 'prescription.review');
  if (assigneeId) {
    const a = await db.user.findFirst({ where: { id: assigneeId, isActive: true, role: { in: ['PHARMACIST', 'MANAGER', 'SUPER_ADMIN'] } } });
    if (!a) throw invalid('Choose a pharmacist or manager.');
  }
  await db.prescription.update({ where: { id }, data: { assigneeId } });
  await db.prescriptionEvent.create({ data: { prescriptionId: id, label: assigneeId ? 'Assigned' : 'Unassigned', actorLabel: user.name } });
}

const CUSTOMER_COPY: Partial<Record<RxStatus, { subject: string; heading: string; line: string }>> = {
  IN_REVIEW: { subject: 'is with the pharmacist', heading: 'A pharmacist is reviewing your prescription', line: 'We will be in touch as soon as the review is done.' },
  NEEDS_INFO: { subject: 'needs more information', heading: 'We need a little more from you', line: 'The pharmacist has a question about your prescription. Please open your prescription page and reply.' },
  READY: { subject: 'has been reviewed', heading: 'Your prescription has been reviewed', line: 'The pharmacist has left you a note with what happens next.' },
  DECLINED: { subject: 'cannot be processed', heading: 'We are unable to process this prescription', line: 'The pharmacist has explained why. Please read the note, and speak to your prescriber or the pharmacy if you need help.' },
  COMPLETED: { subject: 'is complete', heading: 'Your prescription is complete', line: 'Thank you for choosing Reset Pharmacy.' },
  CANCELLED: { subject: 'was cancelled', heading: 'Your prescription request was cancelled', line: 'If this is not what you expected, please contact the pharmacy.' },
};

export async function changePrescriptionStatus(user: Principal, id: string, to: RxStatus, note: string) {
  assertCan(user, 'prescription.review');
  const rx = await db.prescription.findUnique({ where: { id } });
  if (!rx) throw notFound('Prescription not found.');
  if (!RX_NEXT[rx.status].includes(to)) throw conflict(`A prescription that is "${RX_LABELS[rx.status]}" cannot move to "${RX_LABELS[to]}".`);
  const text = note.trim();
  if (['NEEDS_INFO', 'READY', 'DECLINED'].includes(to) && !text) throw invalid('Write a note for the customer: they will see it.', { note: 'Required.' });
  if (text.length > 1500) throw invalid('Keep the note under 1,500 characters.', { note: 'Too long.' });
  const res = await db.prescription.updateMany({ where: { id, status: rx.status }, data: { status: to, pharmacistNote: text || rx.pharmacistNote, assigneeId: rx.assigneeId ?? user.id } });
  if (res.count !== 1) throw conflict('Someone else has just changed this prescription. Reload to see it.');
  await db.prescriptionEvent.create({ data: { prescriptionId: id, label: RX_LABELS[to], note: text || null, actorLabel: user.name } });
  await audit(actorOf(user), 'prescription.status', 'Prescription', id, { from: rx.status, to });
  const copy = CUSTOMER_COPY[to];
  if (copy) {
    const tpl = emailTemplate({
      heading: copy.heading,
      paragraphs: [copy.line, ...(text ? [`Pharmacist’s note: ${text}`] : [])],
      details: [['Reference', rx.number]],
      cta: { label: 'Open your prescription page', url: `${env.APP_URL}/prescriptions/${rx.trackToken}` },
    });
    await enqueueEmail({ type: 'rx.status', to: rx.email, subject: `Reset Pharmacy prescription ${rx.number} ${copy.subject}`, ...tpl, refId: id });
  }
}

/** Remove the files (not the record) once the prescription is closed, on request or as retention policy requires. */
export async function purgePrescriptionFiles(user: Principal, id: string) {
  assertCan(user, 'prescription.review');
  const rx = await db.prescription.findUnique({ where: { id }, include: { documents: true } });
  if (!rx) throw notFound('Prescription not found.');
  if (!['COMPLETED', 'DECLINED', 'CANCELLED'].includes(rx.status)) throw conflict('Only a closed prescription can have its files removed.');
  for (const d of rx.documents) await deleteStored(d.storageKey).catch(() => undefined);
  await db.document.deleteMany({ where: { prescriptionId: id } });
  await db.prescriptionEvent.create({ data: { prescriptionId: id, label: 'Uploaded files removed', actorLabel: user.name } });
  await audit(actorOf(user), 'prescription.files_removed', 'Prescription', id, { count: rx.documents.length });
}
