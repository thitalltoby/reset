import 'server-only';
import { db } from './db';
import { enqueueJob, registerJob, runDueJobs } from './jobs';
import { rescanHeldDocuments } from './scan';
import { expireUnpaidOrders } from './orders';
import './integrations/events'; // registers integration_event

registerJob('maintenance', async () => {
  await expireUnpaidOrders();
  await rescanHeldDocuments().catch((e) => console.error('[scan] rescan failed', e));
  // housekeeping: expired sessions/tokens, stale rate-limit windows, abandoned baskets, finished jobs older than 30 days
  await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await db.mfaChallenge.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await db.authToken.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 7 * 86_400_000) } } });
  await db.rateLimit.deleteMany({ where: { windowStart: { lt: new Date(Date.now() - 86_400_000) } } });
  await db.cart.deleteMany({ where: { updatedAt: { lt: new Date(Date.now() - 45 * 86_400_000) } } });
  await db.webhookEvent.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 90 * 86_400_000) } } });
  // sign-in, reset and verification emails carry single-use links; once delivered, keep the audit row but not the link
  await db.notificationEvent.updateMany({
    where: { type: { startsWith: 'auth.' }, status: { in: ['SENT', 'SKIPPED', 'FAILED'] }, createdAt: { lt: new Date(Date.now() - 3_600_000) }, NOT: { body: '[removed after delivery]' } },
    data: { body: '[removed after delivery]' },
  });
  await db.job.deleteMany({ where: { status: 'DONE', finishedAt: { lt: new Date(Date.now() - 30 * 86_400_000) } } });
});

/** Called every minute by the worker or the cron endpoint. Expiring unpaid orders runs every slot so held stock is released promptly. */
export async function tick() {
  const slot = Math.floor(Date.now() / 60_000);
  await enqueueJob('maintenance', {}, { dedupeKey: `maintenance:${slot}`, maxAttempts: 2 });
  return runDueJobs(50);
}

/** Opportunistic delivery right after a user action; the worker/cron remains the reliable path for retries. */
export async function kick() {
  try {
    await runDueJobs(10);
  } catch (e) {
    console.error('[jobs] kick failed', e);
  }
}
