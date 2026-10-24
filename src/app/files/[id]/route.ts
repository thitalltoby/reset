import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { getSessionUser } from '@/server/session';
import { readStored, verifyFileSignature } from '@/server/storage';
import { isServable } from '@/server/scan';
import { can } from '@/lib/permissions';
import { audit } from '@/server/audit';

export const dynamic = 'force-dynamic';

/** Prescription files. Needs a short-lived signed link minted for the signed-in person, who must be allowed to open prescriptions. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const uid = url.searchParams.get('uid') ?? '';
  const user = await getSessionUser();
  if (!user || user.id !== uid || !verifyFileSignature(id, uid, Number(url.searchParams.get('exp')), url.searchParams.get('sig') ?? '')) return new NextResponse('Not found', { status: 404 });
  const d = await db.document.findUnique({ where: { id }, include: { prescription: { select: { userId: true } } } });
  if (!d || !d.prescriptionId || !isServable(d.scanStatus)) return new NextResponse('Not found', { status: 404 });
  const allowed = can(user.role, 'prescription.review') || (user.role === 'CUSTOMER' && d.prescription?.userId === user.id);
  if (!allowed) return new NextResponse('Not found', { status: 404 });
  const data = await readStored(d.storageKey).catch(() => null);
  if (!data) return new NextResponse('Not found', { status: 404 });
  await audit({ id: user.id, label: user.name }, 'prescription.file_opened', 'Document', id);
  return new NextResponse(new Uint8Array(data), {
    headers: { 'Content-Type': d.mimeType, 'Content-Length': String(data.length), 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store', 'Content-Disposition': `inline; filename="${encodeURIComponent(d.originalName)}"` },
  });
}
