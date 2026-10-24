import { NextResponse, type NextRequest } from 'next/server';
import { confirmByReference } from '@/server/orders';
import { env } from '@/server/env';

export const dynamic = 'force-dynamic';

/** Paystack sends the customer back here. We never trust the query string: the payment is verified with Paystack first. */
export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get('reference') || req.nextUrl.searchParams.get('trxref') || '';
  const to = (p: string) => NextResponse.redirect(new URL(p, env.APP_URL));
  if (!/^[A-Za-z0-9_-]{6,80}$/.test(ref)) return to('/track');
  try {
    const r = await confirmByReference(ref);
    return to(r.token ? `/order/${r.token}?paid=${r.outcome}` : '/track');
  } catch {
    return to('/track?error=1');
  }
}
