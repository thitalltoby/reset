import 'server-only';
import { db } from './db';
import { audit } from './audit';
import { AppError, conflict, invalid, notFound } from './errors';
import { assertCan, actorOf, type Principal } from './rbac';
import { clientIp, rateLimit } from './rate-limit';
import { nextNumber } from './orders';
import { enqueueEmail, notifyInternal } from './notify';
import { emailTemplate } from './email-templates';
import { emitEvent } from './integrations/events';
import { enquirySchema, fieldErrors } from '@/lib/validation';
import type { EnquiryStatus, EnquiryType } from '@/generated/prisma/enums';

export const ENQUIRY_TYPE_LABELS: Record<EnquiryType, string> = { GENERAL: 'General question', PRODUCT: 'About a product', SERVICE: 'About a service', FEEDBACK: 'Feedback', COMPLAINT: 'Complaint' };
export const ENQUIRY_STATUS_LABELS: Record<EnquiryStatus, string> = { NEW: 'New', IN_PROGRESS: 'In progress', RESOLVED: 'Resolved' };

/** A contact-form message. Do not put medical details here: the form says so and the email repeats it. */
export async function submitEnquiry(raw: unknown, honeypot = ''): Promise<{ number: string }> {
  // A hidden field real visitors never see: bots fill it. Pretend success so they learn nothing.
  if (honeypot.trim()) return { number: 'EN-000000' };
  const p = enquirySchema.safeParse(raw);
  if (!p.success) throw invalid('Please check the highlighted fields.', fieldErrors(p.error));
  const d = p.data;
  const ip = await clientIp();
  if (!(await rateLimit(`enq:ip:${ip}`, 6, 3600)) || !(await rateLimit(`enq:email:${d.email}`, 4, 3600))) throw new AppError('RATE_LIMITED', 'Too many messages sent. Please try again later, or call the pharmacy.');
  const product = d.productSlug ? await db.product.findUnique({ where: { slug: d.productSlug }, select: { id: true } }) : null;
  const number = await nextNumber('EN', 'enquiry', 100001);
  const e = await db.enquiry.create({
    data: { number, type: d.type as EnquiryType, name: d.name, email: d.email, phone: d.phone ?? null, message: d.message, productId: product?.id ?? null, serviceSlug: d.serviceSlug ?? null },
  });
  const tpl = emailTemplate({
    heading: `Thanks, ${d.name.split(' ')[0]} — we have your message`,
    paragraphs: ['A member of the team will reply by email. If it is urgent, please call the pharmacy.', 'Please do not reply with prescription or health details by email; a pharmacist will tell you the safest way to share them.'],
    details: [['Reference', number]],
  });
  await enqueueEmail({ type: 'enquiry.received', to: d.email, subject: `Reset Pharmacy: we received your message (${number})`, ...tpl, refId: e.id });
  await notifyInternal('enquiryTo', `New enquiry ${number}`, `New enquiry ${number}`, [`${ENQUIRY_TYPE_LABELS[e.type]} from ${d.name}.`], `/admin/enquiries/${e.id}`, undefined, e.id);
  await emitEvent('enquiry.received', { number, type: e.type }, e.id);
  return { number };
}

export async function listEnquiries(user: Principal, f: { status?: string; type?: string; q?: string } = {}) {
  assertCan(user, 'enquiry.manage');
  const q = f.q?.trim();
  return db.enquiry.findMany({
    where: {
      ...(f.status ? { status: f.status as EnquiryStatus } : {}),
      ...(f.type ? { type: f.type as EnquiryType } : {}),
      ...(q ? { OR: [{ number: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }, { message: { contains: q, mode: 'insensitive' } }] } : {}),
    },
    include: { assignee: { select: { name: true } }, product: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
}

export async function getEnquiry(user: Principal, id: string) {
  assertCan(user, 'enquiry.manage');
  return db.enquiry.findUnique({ where: { id }, include: { assignee: { select: { id: true, name: true } }, product: { select: { id: true, name: true, slug: true } } } });
}

export async function updateEnquiry(user: Principal, id: string, patch: { status?: EnquiryStatus; staffNote?: string; assigneeId?: string | null }) {
  assertCan(user, 'enquiry.manage');
  const e = await db.enquiry.findUnique({ where: { id } });
  if (!e) throw notFound('Enquiry not found.');
  if (patch.assigneeId) {
    const a = await db.user.findFirst({ where: { id: patch.assigneeId, isActive: true, role: { not: 'CUSTOMER' } } });
    if (!a) throw invalid('Choose a staff member.');
  }
  if (patch.staffNote !== undefined && patch.staffNote.length > 3000) throw invalid('Keep the note under 3,000 characters.');
  if (patch.status && patch.status === e.status && patch.staffNote === undefined && patch.assigneeId === undefined) throw conflict('Nothing to change.');
  await db.enquiry.update({
    where: { id },
    data: {
      ...(patch.status ? { status: patch.status, resolvedAt: patch.status === 'RESOLVED' ? new Date() : null } : {}),
      ...(patch.staffNote !== undefined ? { staffNote: patch.staffNote.trim() || null } : {}),
      ...(patch.assigneeId !== undefined ? { assigneeId: patch.assigneeId } : {}),
    },
  });
  await audit(actorOf(user), 'enquiry.updated', 'Enquiry', id, { status: patch.status, assigned: patch.assigneeId });
}

export const enquiryMailto = (e: { email: string; number: string }) => `mailto:${e.email}?subject=${encodeURIComponent(`Reset Pharmacy: ${e.number}`)}`;
