import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/server/db';
import { submitPrescription, listPrescriptions, getPrescriptionForStaff, getPrescriptionByToken, changePrescriptionStatus, purgePrescriptionFiles, respondToPrescription } from '@/server/prescriptions';
import { signedFileUrl, verifyFileSignature } from '@/server/storage';
import { AppError } from '@/server/errors';
import { resetDb, openShop, makeUser, principal } from './helpers';

const pdf = () => new File([Buffer.from('%PDF-1.4\n%%EOF\n')], 'rx.pdf', { type: 'application/pdf' });
const input = (over: object = {}) => ({ name: 'Ada Okafor', email: 'ada@example.test', phone: '+234 800 000 0001', consent: true, files: [pdf()], ...over });
const code = (p: Promise<unknown>) => p.then(() => 'OK', (e) => (e instanceof AppError ? e.code : `ERR:${e}`));

beforeEach(async () => { await resetDb(); await openShop(); });

describe('sending a prescription', () => {
  it('needs consent, a file and the shop switch; and is a request for review, not an order', async () => {
    expect(await code(submitPrescription(input({ consent: false })))).toBe('VALIDATION');
    expect(await code(submitPrescription(input({ files: [] })))).toBe('VALIDATION');
    await openShop({ prescriptions: false });
    expect(await code(submitPrescription(input()))).toBe('VALIDATION');
    await openShop();
    const r = await submitPrescription(input());
    expect(r.number).toMatch(/^RX-\d+$/);
    expect(await db.order.count()).toBe(0);
    const rx = await db.prescription.findFirstOrThrow({ include: { documents: true } });
    expect(rx).toMatchObject({ status: 'RECEIVED' });
    expect(rx.documents).toHaveLength(1);
  });

  it('does not put prescription content into the alert sent to staff', async () => {
    await submitPrescription(input({ note: 'Metformin for my diabetes' }));
    const alerts = await db.notificationEvent.findMany({ where: { type: { startsWith: 'internal' } } });
    const all = await db.notificationEvent.findMany();
    for (const m of all) expect(m.subject + m.body).not.toMatch(/Metformin|diabetes/i);
    expect(alerts.length + all.length).toBeGreaterThan(0);
  });

  it('refuses a disallowed file type', async () => {
    expect(await code(submitPrescription(input({ files: [new File(['MZ'], 'virus.exe', { type: 'application/x-msdownload' })] })))).toBe('VALIDATION');
  });
});

describe('who can open prescriptions', () => {
  it('lists and opens only for pharmacists, managers and the super admin', async () => {
    await submitPrescription(input());
    const rx = await db.prescription.findFirstOrThrow();
    for (const role of ['STAFF', 'EDITOR', 'CUSTOMER'] as const) {
      const u = principal(await makeUser(role));
      expect(await code(listPrescriptions(u)), role).toBe('FORBIDDEN');
      expect(await code(getPrescriptionForStaff(u, rx.id)), role).toBe('FORBIDDEN');
      expect(await code(changePrescriptionStatus(u, rx.id, 'IN_REVIEW', ''))).toBe('FORBIDDEN');
    }
    for (const role of ['PHARMACIST', 'MANAGER', 'SUPER_ADMIN'] as const) {
      const u = principal(await makeUser(role));
      expect((await listPrescriptions(u)).length, role).toBe(1);
      expect((await getPrescriptionForStaff(u, rx.id))?.id).toBe(rx.id);
    }
  });

  it('records every time a prescription is opened', async () => {
    await submitPrescription(input());
    const rx = await db.prescription.findFirstOrThrow();
    const ph = principal(await makeUser('PHARMACIST'));
    await getPrescriptionForStaff(ph, rx.id);
    await getPrescriptionForStaff(ph, rx.id);
    expect(await db.auditEvent.count({ where: { action: 'prescription.viewed', entityId: rx.id, actorId: ph.id } })).toBe(2);
  });

  it('gives the customer progress by private link, without any file', async () => {
    const { token } = await submitPrescription(input());
    const v = await getPrescriptionByToken(token);
    expect(v?.fileCount).toBe(1);
    expect(JSON.stringify(v)).not.toMatch(/storageKey/);
    expect(await getPrescriptionByToken('short')).toBeNull();
    expect(await getPrescriptionByToken('x'.repeat(24))).toBeNull();
  });
});

describe('file links', () => {
  it('are bound to one person and one document, and expire', () => {
    const url = new URL(signedFileUrl('doc1', 'user1', 300), 'http://x');
    const q = (k: string) => url.searchParams.get(k)!;
    expect(verifyFileSignature('doc1', 'user1', Number(q('exp')), q('sig'))).toBe(true);
    expect(verifyFileSignature('doc1', 'user2', Number(q('exp')), q('sig'))).toBe(false);
    expect(verifyFileSignature('doc2', 'user1', Number(q('exp')), q('sig'))).toBe(false);
    expect(verifyFileSignature('doc1', 'user1', Number(q('exp')) + 600, q('sig'))).toBe(false);
    const old = new URL(signedFileUrl('doc1', 'user1', -10), 'http://x');
    expect(verifyFileSignature('doc1', 'user1', Number(old.searchParams.get('exp')), old.searchParams.get('sig')!)).toBe(false);
  });
});

describe('pharmacist workflow', () => {
  it('follows the allowed steps, needs a note for what the customer sees, and lets the customer answer', async () => {
    const { token } = await submitPrescription(input());
    const rx = await db.prescription.findFirstOrThrow();
    const ph = principal(await makeUser('PHARMACIST'));
    expect(await code(changePrescriptionStatus(ph, rx.id, 'COMPLETED', 'x'))).toBe('CONFLICT');      // cannot jump straight to completed
    await changePrescriptionStatus(ph, rx.id, 'IN_REVIEW', '');
    expect(await code(changePrescriptionStatus(ph, rx.id, 'NEEDS_INFO', ' '))).toBe('VALIDATION');   // note is required
    await changePrescriptionStatus(ph, rx.id, 'NEEDS_INFO', 'Please send a clearer photo.');
    await respondToPrescription(token, 'Here is a clearer one', [pdf()]);
    expect((await db.prescription.findUniqueOrThrow({ where: { id: rx.id } })).status).toBe('IN_REVIEW');
    expect(await db.document.count({ where: { prescriptionId: rx.id } })).toBe(2);
    expect(await code(respondToPrescription(token, 'again', []))).toBe('CONFLICT');                    // not waiting any more
    expect(await db.prescriptionEvent.count({ where: { prescriptionId: rx.id } })).toBeGreaterThanOrEqual(4);
  });

  it('removes the uploaded files only once the request is closed', async () => {
    await submitPrescription(input());
    const rx = await db.prescription.findFirstOrThrow();
    const ph = principal(await makeUser('PHARMACIST'));
    expect(await code(purgePrescriptionFiles(ph, rx.id))).not.toBe('OK');
    await changePrescriptionStatus(ph, rx.id, 'IN_REVIEW', '');
    await changePrescriptionStatus(ph, rx.id, 'DECLINED', 'We cannot supply this online. Please call us.');
    await purgePrescriptionFiles(ph, rx.id);
    expect(await db.document.count({ where: { prescriptionId: rx.id } })).toBe(0);
    expect(await db.prescription.count()).toBe(1);
  });
});
