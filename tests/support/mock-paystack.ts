/**
 * A stand-in for the Paystack API, for local development and automated tests ONLY.
 * It is not Paystack and proves nothing about live payments: before launch the flow must be run once
 * against Paystack test mode with real test keys (see docs/LAUNCH_DEPENDENCIES.md).
 *
 *   npx tsx tests/support/mock-paystack.ts            (listens on :4010)
 *
 * The app talks to it when PAYSTACK_API_BASE=http://localhost:4010 and INTEGRATIONS_ALLOW_LOCAL=1.
 */
import http from 'node:http';
import { createHmac } from 'node:crypto';

export interface MockTx { reference: string; amount: number; email: string; status: 'pending' | 'success' | 'failed' | 'abandoned'; callback: string; currency: string }

export function startMockPaystack(port = 4010, secret = 'sk_test_mock', webhookUrl = '') {
  const txs = new Map<string, MockTx>();
  /** Test hook: change what Paystack will report for a reference (e.g. a different amount). */
  const overrides = new Map<string, Partial<{ amount: number; currency: string }>>();

  const send = (res: http.ServerResponse, code: number, body: unknown, type = 'application/json') => { res.writeHead(code, { 'content-type': type }); res.end(typeof body === 'string' ? body : JSON.stringify(body)); };
  const readBody = (req: http.IncomingMessage) => new Promise<string>((ok) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => ok(d)); });

  async function fireWebhook(tx: MockTx, event = 'charge.success') {
    if (!webhookUrl) return;
    const body = JSON.stringify({ event, data: { reference: tx.reference, status: tx.status, amount: overrides.get(tx.reference)?.amount ?? tx.amount, currency: tx.currency, channel: 'card' } });
    await fetch(webhookUrl, { method: 'POST', headers: { 'content-type': 'application/json', 'x-paystack-signature': createHmac('sha512', secret).update(body).digest('hex') }, body }).catch(() => undefined);
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${port}`);
    if (req.method === 'POST' && url.pathname === '/transaction/initialize') {
      if (req.headers.authorization !== `Bearer ${secret}`) return send(res, 401, { status: false, message: 'Invalid key' });
      const b = JSON.parse((await readBody(req)) || '{}');
      if (!b.reference || !b.amount || !b.email) return send(res, 400, { status: false, message: 'Missing fields' });
      txs.set(b.reference, { reference: b.reference, amount: b.amount, email: b.email, status: 'pending', callback: b.callback_url, currency: b.currency ?? 'NGN' });
      return send(res, 200, { status: true, message: 'Authorization URL created', data: { authorization_url: `http://localhost:${port}/pay/${encodeURIComponent(b.reference)}`, access_code: 'ac_mock', reference: b.reference } });
    }
    if (req.method === 'GET' && url.pathname.startsWith('/transaction/verify/')) {
      if (req.headers.authorization !== `Bearer ${secret}`) return send(res, 401, { status: false, message: 'Invalid key' });
      const ref = decodeURIComponent(url.pathname.split('/').pop() ?? '');
      const tx = txs.get(ref);
      if (!tx) return send(res, 404, { status: false, message: 'Transaction reference not found' });
      const o = overrides.get(ref);
      return send(res, 200, { status: true, message: 'Verification successful', data: { status: tx.status, amount: o?.amount ?? tx.amount, currency: o?.currency ?? tx.currency, channel: 'card', gateway_response: tx.status === 'success' ? 'Successful' : tx.status === 'failed' ? 'Declined' : 'Pending', reference: ref } });
    }
    if (url.pathname.startsWith('/pay/')) {
      const ref = decodeURIComponent(url.pathname.slice(5));
      const tx = txs.get(ref);
      if (!tx) return send(res, 404, 'Unknown payment', 'text/plain');
      const outcome = url.searchParams.get('outcome');
      if (outcome) {
        tx.status = outcome === 'success' ? 'success' : outcome === 'fail' ? 'failed' : 'abandoned';
        if (tx.status === 'success') await fireWebhook(tx);
        res.writeHead(302, { location: `${tx.callback}?reference=${encodeURIComponent(ref)}&trxref=${encodeURIComponent(ref)}` });
        return res.end();
      }
      return send(res, 200, `<!doctype html><title>Mock Paystack</title><body style="font-family:sans-serif;max-width:28rem;margin:3rem auto"><h1>Mock Paystack (test only)</h1><p>Pay <b id="amt">₦${(tx.amount / 100).toLocaleString('en-NG')}</b> for ${tx.reference}</p><p><a id="ok" href="?outcome=success">Pay successfully</a> · <a id="no" href="?outcome=fail">Decline</a> · <a id="ab" href="?outcome=abandon">Abandon</a></p></body>`, 'text/html');
    }
    send(res, 404, { status: false, message: 'Not found' });
  });

  return new Promise<{ port: number; txs: Map<string, MockTx>; overrides: typeof overrides; fireWebhook: typeof fireWebhook; close: () => Promise<void> }>((ok) =>
    server.listen(port, () => ok({ port, txs, overrides, fireWebhook, close: () => new Promise<void>((r) => server.close(() => r())) })));
}

if (process.argv[1]?.endsWith('mock-paystack.ts')) {
  startMockPaystack(Number(process.env.MOCK_PAYSTACK_PORT ?? 4010), process.env.PAYSTACK_SECRET_KEY || 'sk_test_mock', process.env.MOCK_WEBHOOK_URL ?? 'http://localhost:3000/api/webhooks/paystack').then((m) => console.log(`Mock Paystack on :${m.port}`));
}
