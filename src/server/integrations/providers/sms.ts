import 'server-only';
import { db } from '../../db';
import { env } from '../../env';
import { httpCall, maskPhone, providerError, toE164, type Adapter } from '../core';

export interface SmsConfig { provider: string; sender?: string; accountId?: string; baseUrl?: string; countryCode?: string }

const BASE: Record<string, string> = { twilio: 'https://api.twilio.com', termii: 'https://api.ng.termii.com', africastalking: 'https://api.africastalking.com' };

/** Send one SMS. Returns the provider's message id. Throws if the provider refuses it. */
export async function sendSms(c: SmsConfig, token: string, toE164digits: string, body: string): Promise<string> {
  const base = (c.baseUrl || BASE[c.provider] || '').replace(/\/$/, '');
  if (c.provider === 'twilio') {
    const form = new URLSearchParams({ To: `+${toE164digits}`, From: c.sender ?? '', Body: body });
    const r = await httpCall(`${base}/2010-04-01/Accounts/${encodeURIComponent(c.accountId ?? '')}/Messages.json`, { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${c.accountId}:${token}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form });
    if (!r.ok) throw new Error(`Twilio responded ${providerError(r)}`);
    return String((r.json as { sid?: string } | null)?.sid ?? '');
  }
  if (c.provider === 'termii') {
    const r = await httpCall(`${base}/api/sms/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: toE164digits, from: c.sender, sms: body, type: 'plain', channel: 'generic', api_key: token }) });
    const j = r.json as { code?: string; message_id?: string; message?: string } | null;
    if (!r.ok || (j?.code && j.code !== 'ok')) throw new Error(`Termii responded ${r.status}: ${j?.message ?? 'unknown error'}`);
    return String(j?.message_id ?? '');
  }
  if (c.provider === 'africastalking') {
    const form = new URLSearchParams({ username: c.accountId ?? '', to: `+${toE164digits}`, message: body });
    if (c.sender) form.set('from', c.sender);
    const r = await httpCall(`${base}/version1/messaging`, { method: 'POST', headers: { apiKey: token, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: form });
    const rec = (r.json as { SMSMessageData?: { Recipients?: { statusCode: number; status: string; messageId?: string }[]; Message?: string } } | null)?.SMSMessageData?.Recipients?.[0];
    if (!r.ok || !rec || ![100, 101, 102].includes(rec.statusCode)) throw new Error(`Africa’s Talking responded ${r.status}: ${rec?.status ?? 'no recipient result'}`);
    return String(rec.messageId ?? '');
  }
  throw new Error('Unknown SMS provider.');
}

/** Short order texts. Never includes prices, items or personal detail beyond the order number. */
export function messageFor(event: string, payload: Record<string, unknown>): string | null {
  const ref = String(payload.number ?? '');
  if (!ref) return null;
  const link = `${env.APP_URL.replace(/\/$/, '')}/track`;
  if (event === 'order.placed') return `Reset Pharmacy: we have your order ${ref}. Track it: ${link}`;
  if (event === 'order.status_changed') {
    const to = String(payload.to ?? '');
    const say: Record<string, string> = {
      READY: 'is ready for collection',
      OUT_FOR_DELIVERY: 'is on its way to you',
      COMPLETED: 'is complete. Thank you',
      CANCELLED: 'has been cancelled. Please check your email',
    };
    return say[to] ? `Reset Pharmacy: order ${ref} ${say[to]}.` : null;
  }
  return null;
}

/** The order's phone number, but only if the customer ticked the text-message box at checkout. */
export async function consentedNumber(orderNumber: string, countryCode?: string): Promise<{ digits: string } | { skip: string }> {
  const o = await db.order.findUnique({ where: { number: orderNumber }, select: { phone: true, smsOptIn: true } });
  if (!o) return { skip: 'order not found' };
  if (!o.smsOptIn) return { skip: 'customer did not opt in to text messages' };
  const digits = toE164(o.phone, countryCode || '234');
  return digits ? { digits } : { skip: 'no valid phone number on the order' };
}

export const smsAdapter: Adapter = {
  key: 'sms',
  name: 'SMS',
  category: 'Messaging',
  kind: 'events',
  purpose: 'Texts the customer when their order is received, ready, on its way, complete or cancelled, but only if they ticked the text-message box at checkout. A message is logged as “accepted by the provider”, not as delivered: delivery receipts are not collected.',
  state: 'implemented',
  requirements: ['An account with Twilio, Termii or Africa’s Talking and, for Nigerian numbers, a registered sender ID', 'API credentials', 'The pharmacy’s agreement to the message wording'],
  verification: 'Tested against local mock servers that check the exact requests. Not yet verified with a live provider account, and the endpoints for Termii and Africa’s Talking were written from their public documentation: run “Send a test message” before relying on it.',
  fields: [
    { key: 'provider', label: 'Provider', type: 'select', required: true, options: [{ value: 'termii', label: 'Termii' }, { value: 'africastalking', label: 'Africa’s Talking' }, { value: 'twilio', label: 'Twilio' }] },
    { key: 'sender', label: 'Sender ID or number', required: true, help: 'Twilio: your Twilio number or messaging service. Termii and Africa’s Talking: the approved sender ID.' },
    { key: 'accountId', label: 'Account SID (Twilio) or username (Africa’s Talking)', showFor: { key: 'provider', values: ['twilio', 'africastalking'] } },
    { key: 'apiKey', label: 'API key or auth token', secret: true, required: true },
    { key: 'countryCode', label: 'Default country code for local numbers', placeholder: '234' },
    { key: 'testNumber', label: 'Number for test messages', placeholder: '+234…' },
    { key: 'baseUrl', label: 'API base URL (advanced)', help: 'Leave blank. For a sandbox or regional endpoint only.' },
  ],
  events: ['order.placed', 'order.status_changed'],
  validate(config, secrets) {
    if (['twilio', 'africastalking'].includes(config.provider ?? '') && !config.accountId) throw new Error('Account SID or username is required for this provider.');
    if (config.testNumber && !toE164(config.testNumber, config.countryCode || '234')) throw new Error('The test number is not a valid phone number.');
    void secrets;
  },
  async test(config, secrets) {
    const n = toE164(config.testNumber ?? '', config.countryCode || '234');
    if (!n) throw new Error('Save a valid test number first.');
    const id = await sendSms(config as unknown as SmsConfig, secrets.apiKey ?? '', n, 'Reset Pharmacy: test message. No action needed.');
    return { ok: true, message: `The provider accepted a test message to ${maskPhone(n)}${id ? ` (id ${id.slice(0, 40)})` : ''}. Confirm it arrived on the handset.` };
  },
  async handle(event, payload, config, secrets) {
    const p = payload as Record<string, unknown>;
    const text = messageFor(event, p);
    if (!text) return { summary: 'Skipped: no customer message for this event' };
    const target = await consentedNumber(String(p.number ?? ''), config.countryCode);
    if ('skip' in target) return { summary: `Skipped: ${target.skip}` };
    const id = await sendSms(config as unknown as SmsConfig, secrets.apiKey ?? '', target.digits, text);
    return { summary: `Accepted by provider for ${maskPhone(target.digits)}${id ? ` (${id.slice(0, 30)})` : ''}` };
  },
};
