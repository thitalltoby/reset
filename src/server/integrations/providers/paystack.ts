import 'server-only';
import { httpCall, providerError, type Adapter } from '../core';
import { env } from '../../env';
import { keyMode } from '../../paystack';

export const paystackAdapter: Adapter = {
  key: 'paystack',
  name: 'Paystack payments',
  category: 'Payments',
  purpose: 'Takes card, bank-transfer and USSD payments at checkout. The shop only marks an order paid after Paystack confirms the payment and the amount matches the order, either on the customer’s return or through a signed callback (webhook).',
  state: 'implemented',
  kind: 'site',
  verification: 'Payment start, verification, signature checking and the failed, abandoned and amount-mismatch cases are tested against a local mock of the Paystack API. Not yet run against Paystack itself: use your test keys (sk_test_…) and Paystack’s test cards before switching to live keys.',
  requirements: [
    'A Paystack business account (test keys are available straight away; live keys need Paystack to verify the business)',
    'The secret key (sk_test_… or sk_live_…)',
    'In the Paystack dashboard, set the webhook URL to  <your site>/api/webhooks/paystack  so payments are confirmed even if a customer closes the page',
  ],
  fields: [
    { key: 'secretKey', label: 'Secret key', secret: true, required: true, placeholder: 'sk_test_…', help: 'Stored encrypted; never shown again. Leave blank to keep the saved key.' },
  ],
  events: [],
  validate(_c, secrets) {
    const k = secrets.secretKey ?? '';
    if (k && !/^sk_(test|live)_[A-Za-z0-9]{10,}$/.test(k)) throw new Error('That does not look like a Paystack secret key. It starts with sk_test_ or sk_live_.');
  },
  async test(_config, secrets) {
    const key = secrets.secretKey ?? env.PAYSTACK_SECRET_KEY;
    if (!key) return { ok: false, message: 'No secret key is saved yet.' };
    const r = await httpCall(`${env.PAYSTACK_API_BASE}/transaction/totals`, { headers: { Authorization: `Bearer ${key}` } });
    return r.ok ? { ok: true, message: `Paystack accepted the key (${keyMode(key)} mode).` } : { ok: false, message: `Paystack refused the key (${providerError(r)}).` };
  },
};
