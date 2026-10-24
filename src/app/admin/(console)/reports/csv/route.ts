import { NextResponse } from 'next/server';
import { getSessionUser } from '@/server/session';
import { ordersCsv } from '@/server/reports';
import { can, isStaff } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const u = await getSessionUser();
  if (!u || !isStaff(u.role) || !can(u.role, 'report.view')) return new NextResponse('Not found', { status: 404 });
  const days = Math.min(365, Math.max(1, Number(new URL(req.url).searchParams.get('days')) || 30));
  return new NextResponse(await ordersCsv(u, days), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="reset-orders-${days}d.csv"`, 'Cache-Control': 'private, no-store' } });
}
