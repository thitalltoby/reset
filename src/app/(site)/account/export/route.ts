import { NextResponse } from 'next/server';
import { getSessionUser } from '@/server/session';
import { exportMyData } from '@/server/account';

export const dynamic = 'force-dynamic';

export async function GET() {
  const u = await getSessionUser();
  if (!u || u.role !== 'CUSTOMER') return NextResponse.redirect(new URL('/login?next=/account/profile', process.env.APP_URL ?? 'http://localhost:3000'));
  const data = await exportMyData(u.id);
  return new NextResponse(JSON.stringify(data, null, 2), { headers: { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="reset-pharmacy-my-data.json"', 'Cache-Control': 'private, no-store' } });
}
