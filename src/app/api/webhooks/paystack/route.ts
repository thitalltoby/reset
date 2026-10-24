import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { paystackConfig, verifySignature } from '@/server/paystack';
import { confirmByReference } from '@/server/orders';
import { kick } from '@/server/handlers';

export const dynamic = 'force-dynamic';

/**
 * Paystack calls this when a payment succeeds, even if the customer closed the page. Three safeguards:
 *  1. the body must carry a valid HMAC-SHA512 signature made with our secret key;
 *  2. the payload is never trusted: we ask Paystack's verify endpoint what actually happened;
 *  3. applying a result is idempotent, so repeated or overlapping deliveries change nothing.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 200_000) return new NextResponse('Too large', { status: 413 });
  const cfg = await paystackConfig();
  if (!cfg) return new NextResponse('Not configured', { status: 404 });
  if (!verifySignature(raw, req.headers.get('x-paystack-signature'), cfg.secret)) return new NextResponse('Invalid signature', { status: 401 });
  let body: { event?: string; data?: { id?: number | string; reference?: string } };
  try { body = JSON.parse(raw); } catch { return new NextResponse('Bad request', { status: 400 }); }
  const reference = body.data?.reference;
  const handled = ['charge.success'];
  if (!body.event || !handled.includes(body.event) || !reference) return NextResponse.json({ received: true, ignored: true });
  const key = `paystack:${body.event}:${body.data?.id ?? reference}`;
  try {
    const result = await confirmByReference(reference);
    await db.webhookEvent.upsert({ where: { key }, create: { key, provider: 'paystack' }, update: {} });
    await kick();
    return NextResponse.json({ received: true, outcome: result.outcome });
  } catch (e) {
    console.error('[paystack webhook] could not apply', e);
    return new NextResponse('Try again', { status: 500 }); // Paystack retries on a non-2xx answer
  }
}
