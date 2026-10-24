import { NextResponse } from 'next/server';
import { getSessionUser } from '@/server/session';
import { PRODUCT_CSV_TEMPLATE } from '@/server/products';
import { can, isStaff } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const u = await getSessionUser();
  if (!u || !isStaff(u.role) || !can(u.role, 'product.manage')) return new NextResponse('Not found', { status: 404 });
  return new NextResponse(PRODUCT_CSV_TEMPLATE, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="reset-products-template.csv"' } });
}
