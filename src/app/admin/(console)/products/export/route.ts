import { NextResponse } from 'next/server';
import { getSessionUser } from '@/server/session';
import { exportProductsCsv } from '@/server/products';
import { can, isStaff } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const u = await getSessionUser();
  if (!u || !isStaff(u.role) || !can(u.role, 'product.view')) return new NextResponse('Not found', { status: 404 });
  return new NextResponse(await exportProductsCsv(u), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="reset-products-${new Date().toISOString().slice(0, 10)}.csv"`, 'Cache-Control': 'private, no-store' } });
}
