import { NextResponse } from 'next/server';
import { suggest } from '@/server/catalog';
import { clientIp, rateLimit } from '@/server/rate-limit';

export const dynamic = 'force-dynamic';

/** Type-ahead for the shop search box: a few matching products and categories. Public data only. */
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get('q') ?? '').trim().slice(0, 60);
  if (q.length < 2) return NextResponse.json({ products: [], categories: [] });
  if (!(await rateLimit(`suggest:${await clientIp()}`, 120, 60))) return NextResponse.json({ products: [], categories: [] }, { status: 429 });
  return NextResponse.json(await suggest(q), { headers: { 'Cache-Control': 'private, max-age=30' } });
}
