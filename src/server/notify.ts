import 'server-only';
import { db } from './db';
import { env } from './env';
import { enqueueJob, registerJob } from './jobs';
import { activeMailProvider, sendMail } from './mail';
import { getSetting } from './settings';
import { emailTemplate } from './email-templates';

export interface QueuedEmail {
  type: string;
  to: string;
  subject: string;
  body: string;
  html?: string;
  refId?: string;
}

/** Record the message in the outbox and queue it for delivery. Never throws into the caller's business flow. */
export async function enqueueEmail(m: QueuedEmail): Promise<string | null> {
  try {
    const ev = await db.notificationEvent.create({
      data: { type: m.type, toAddress: m.to.toLowerCase(), subject: m.subject, body: m.html ? JSON.stringify({ text: m.body, html: m.html }) : m.body, refId: m.refId, status: 'QUEUED' },
    });
    await enqueueJob('send_notification', { id: ev.id }, { dedupeKey: `notif:${ev.id}` });
    return ev.id;
  } catch (e) {
    console.error('[notify] could not queue email', e);
    return null;
  }
}

const MAX_ATTEMPTS = 5;

export async function deliverNotification(id: string): Promise<void> {
  const ev = await db.notificationEvent.findUnique({ where: { id } });
  if (!ev || ev.status === 'SENT' || ev.status === 'SKIPPED') return;
  let text = ev.body;
  let html: string | undefined;
  if (ev.body.startsWith('{"text"')) {
    try {
      const parsed = JSON.parse(ev.body) as { text: string; html: string };
      text = parsed.text;
      html = parsed.html;
    } catch {
      /* plain body */
    }
  }
  try {
    const r = await sendMail({ to: ev.toAddress, subject: ev.subject, text, html });
    await db.notificationEvent.update({
      where: { id },
      data: { status: r.status, provider: r.provider, providerMessageId: r.messageId, error: r.detail ?? null, attempts: { increment: 1 }, sentAt: r.status === 'SENT' ? new Date() : null },
    });
  } catch (e) {
    const msg = (e instanceof Error ? e.message : String(e)).slice(0, 400);
    const attempts = ev.attempts + 1;
    await db.notificationEvent.update({ where: { id }, data: { attempts, error: msg, status: attempts >= MAX_ATTEMPTS ? 'FAILED' : 'QUEUED' } });
    throw e; // let the queue back off and retry
  }
}

registerJob('send_notification', async (p: { id: string }) => deliverNotification(p.id));

export type InternalKind = 'newOrderTo' | 'prescriptionTo' | 'enquiryTo' | 'lowStockTo';

/** Who hears about new orders, prescriptions, enquiries and low stock: the configured list, or every active Super Admin and Manager. */
export async function internalRecipients(kind: InternalKind): Promise<string[]> {
  const s = await getSetting('notifications');
  const configured = s[kind].filter(Boolean);
  if (configured.length) return configured;
  const roles = kind === 'prescriptionTo' ? (['PHARMACIST', 'MANAGER', 'SUPER_ADMIN'] as const) : (['MANAGER', 'SUPER_ADMIN'] as const);
  const users = await db.user.findMany({ where: { isActive: true, role: { in: [...roles] } }, select: { email: true } });
  return users.map((u) => u.email);
}

/** Staff alerts carry no health details: they name the reference and link to the console. */
export async function notifyInternal(kind: InternalKind, subject: string, heading: string, paragraphs: string[], path: string, details?: [string, string][], refId?: string) {
  const to = await internalRecipients(kind);
  const tpl = emailTemplate({ heading, paragraphs, details, cta: { label: 'Open in the console', url: `${env.APP_URL}${path}` } });
  await Promise.all(to.map((addr) => enqueueEmail({ type: `internal.${kind}`, to: addr, subject, ...tpl, refId })));
}

export const emailProviderName = async () => (await activeMailProvider()).name;
