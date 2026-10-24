import 'server-only';
import { createHmac } from 'node:crypto';
import { assertSafeUrl, EVENTS, type Adapter } from './core';
import { emailAdapter } from './providers/email';
import { smsAdapter } from './providers/sms';
import { analyticsAdapter } from './providers/analytics';
import { paystackAdapter } from './providers/paystack';

export { assertSafeUrl, EVENTS } from './core';
export type { Adapter, ConfigField, EventName, IntegrationState } from './core';

const webhook: Adapter = {
  key: 'webhook',
  name: 'Outbound webhook',
  category: 'Automation / CRM / Accounting middleware',
  purpose: 'Sends signed JSON events (new order, order status change, prescription received, enquiry received, low stock) to any HTTPS endpoint — for example an inventory or accounting system, or an automation tool such as Zapier or n8n that the pharmacy already uses.',
  state: 'implemented',
  kind: 'events',
  verification: 'Tested against a local mock receiver, including the signature check.',
  requirements: ['An HTTPS endpoint that accepts POST requests', 'A shared secret so the receiver can verify the X-Reset-Signature header'],
  fields: [
    { key: 'url', label: 'Endpoint URL', placeholder: 'https://example.com/hooks/reset', required: true },
    { key: 'secret', label: 'Signing secret', secret: true, help: 'Used to compute an HMAC-SHA256 of the body. Share it with the receiver.', required: true },
  ],
  events: [...EVENTS],
  async test(config, secrets) {
    const body = JSON.stringify({ event: 'ping', at: new Date().toISOString() });
    const res = await post(config.url ?? '', secrets.secret ?? '', 'ping', body);
    return { ok: res.ok, message: res.ok ? `The endpoint answered ${res.status}.` : `The endpoint answered ${res.status}.` };
  },
  async handle(event, payload, config, secrets) {
    const body = JSON.stringify({ event, at: new Date().toISOString(), data: payload });
    const res = await post(config.url ?? '', secrets.secret ?? '', event, body);
    if (!res.ok) throw new Error(`Endpoint answered ${res.status}`);
    return { summary: `Delivered ${event} (${res.status})` };
  },
};

async function post(url: string, secret: string, event: string, body: string) {
  const u = await assertSafeUrl(url);
  const sig = createHmac('sha256', secret).update(body).digest('hex');
  return fetch(u, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Reset-Event': event, 'X-Reset-Signature': `sha256=${sig}`, 'User-Agent': 'ResetPharmacy/1.0' },
    body,
    redirect: 'manual',
    signal: AbortSignal.timeout(10_000),
  });
}


export const ADAPTERS: Adapter[] = [paystackAdapter, emailAdapter, smsAdapter, analyticsAdapter, webhook];

export const adapterByKey = (key: string) => ADAPTERS.find((a) => a.key === key);
