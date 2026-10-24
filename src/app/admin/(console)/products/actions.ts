'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { bool, files, runAction, str, type FormState } from '@/server/action-utils';
import { actionStaff } from '@/server/rbac';
import { adjustStock, deleteCategory, deleteProduct, importProductsCsv, saveCategory, saveProduct, setProductsStatus, type ImportReport } from '@/server/products';
import { saveMedia, deleteMedia } from '@/server/media';
import { invalid } from '@/server/errors';
import type { PublishStatus } from '@/generated/prisma/enums';

function productRaw(fd: FormData, image: string, gallery: string[]) {
  return {
    name: str(fd, 'name'), slug: str(fd, 'slug'), sku: str(fd, 'sku'), barcode: str(fd, 'barcode'), brand: str(fd, 'brand'), categoryId: str(fd, 'categoryId'),
    summary: str(fd, 'summary'), description: str(fd, 'description'), howToUse: str(fd, 'howToUse'), warnings: str(fd, 'warnings'), ingredients: str(fd, 'ingredients'),
    nafdacNumber: str(fd, 'nafdacNumber'), classification: str(fd, 'classification') || 'OTC', packSize: str(fd, 'packSize'), groupKey: str(fd, 'groupKey'),
    price: str(fd, 'price'), compareAt: str(fd, 'compareAt'), reorderLevel: str(fd, 'reorderLevel') || 5, maxPerOrder: str(fd, 'maxPerOrder') || 10,
    status: str(fd, 'status') || 'DRAFT', featured: bool(fd, 'featured'), art: str(fd, 'art') || 'pill', image, tags: str(fd, 'tags'),
    manufacturer: str(fd, 'manufacturer'), activeIngredients: str(fd, 'activeIngredients'), strength: str(fd, 'strength'), storage: str(fd, 'storage'), brandConfirmed: bool(fd, 'brandConfirmed'),
    infoStatus: str(fd, 'infoStatus') || 'AWAITING', infoSource: str(fd, 'infoSource'), imageAlt: str(fd, 'imageAlt'), imageSource: str(fd, 'imageSource'), imageRights: str(fd, 'imageRights') || 'NONE',
    packMarket: str(fd, 'packMarket'), priceConfirmed: bool(fd, 'priceConfirmed'), gallery,
  };
}

export async function saveProductAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const u = await actionStaff('product.manage');
    const id = str(fd, 'id') || null;
    let image = str(fd, 'image');
    const upload = files(fd, 'photo')[0];
    if (upload) image = (await saveMedia(u, upload, str(fd, 'photoAlt') || `${str(fd, 'name')} pack`)).id;
    // Gallery: keep the ticked existing pictures, then add any new uploads
    const gallery = fd.getAll('galleryKeep').map(String);
    for (const f of files(fd, 'galleryAdd').slice(0, 8)) gallery.push(`/media/${(await saveMedia(u, f, `${str(fd, 'name')}: extra photo`)).id}`);
    const row = await saveProduct(u, id, productRaw(fd, image, gallery));
    revalidatePath('/admin/products');
    revalidatePath('/', 'layout');
    if (!id) redirect(`/admin/products/${row.id}?created=1`);
    return 'Saved.';
  });
}

export async function bulkStatusAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const u = await actionStaff('product.manage');
    const ids = fd.getAll('ids').map(String);
    const n = await setProductsStatus(u, ids, str(fd, 'status') as PublishStatus);
    revalidatePath('/admin/products');
    revalidatePath('/', 'layout');
    return `${n} product${n === 1 ? '' : 's'} updated.`;
  });
}

export async function deleteProductAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const u = await actionStaff('product.manage');
    const msg = await deleteProduct(u, str(fd, 'id'));
    revalidatePath('/', 'layout');
    redirect(`/admin/products?notice=${encodeURIComponent(msg)}`);
  });
}

export async function adjustStockAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const u = await actionStaff('inventory.manage');
    const balance = await adjustStock(u, str(fd, 'productId'), { mode: str(fd, 'mode') === 'set' ? 'set' : 'add', quantity: Number(str(fd, 'quantity')), reason: str(fd, 'reason'), note: str(fd, 'note') });
    revalidatePath('/admin', 'layout');
    revalidatePath('/', 'layout');
    return `Stock is now ${balance}.`;
  });
}

export async function saveCategoryAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => {
    const u = await actionStaff('product.manage');
    await saveCategory(u, str(fd, 'id') || null, { name: str(fd, 'name'), slug: str(fd, 'slug'), blurb: str(fd, 'blurb'), art: str(fd, 'art') || 'pill', parentId: str(fd, 'parentId'), sortOrder: str(fd, 'sortOrder') || 0, visible: bool(fd, 'visible') });
    revalidatePath('/admin/categories');
    revalidatePath('/', 'layout');
    return 'Saved.';
  });
}

export async function deleteCategoryAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => { await deleteCategory(await actionStaff('product.manage'), str(fd, 'id')); revalidatePath('/admin/categories'); revalidatePath('/', 'layout'); });
}

export async function deleteMediaAction(_p: FormState, fd: FormData): Promise<FormState> {
  return runAction(async () => { await deleteMedia(await actionStaff('product.manage'), str(fd, 'id')); revalidatePath('/admin/products'); });
}

export type ImportState = ({ report?: ImportReport; error?: string; fields?: Record<string, string>; ok?: boolean; message?: string; nonce?: number }) | null;

export async function importAction(_p: ImportState, fd: FormData): Promise<ImportState> {
  try {
    const u = await actionStaff('product.manage');
    const f = files(fd, 'csv')[0];
    if (!f) throw invalid('Choose a CSV file.', { csv: 'Required.' });
    if (f.size > 2_000_000) throw invalid('Keep the file under 2 MB (about 5,000 products).', { csv: 'Too large.' });
    const apply = str(fd, 'mode') === 'apply';
    const report = await importProductsCsv(u, await f.text(), apply);
    if (apply) { revalidatePath('/admin/products'); revalidatePath('/', 'layout'); }
    return { ok: true, report, nonce: Date.now() };
  } catch (e) {
    if (e instanceof Error && 'digest' in e) throw e;
    return { ok: false, error: e instanceof Error ? e.message : 'Could not read that file.', nonce: Date.now() };
  }
}
