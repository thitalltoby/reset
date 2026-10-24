import { requireStaff } from '@/server/rbac';
import { adminCategories } from '@/server/products';
import { listMedia } from '@/server/media';
import { PageHeader } from '@/components/ui';
import { ProductForm } from '@/components/ProductForm';
import Link from 'next/link';

export const metadata = { title: 'Add product' };

export default async function NewProduct() {
  const user = await requireStaff('product.manage');
  const [cats, media] = await Promise.all([adminCategories(), listMedia()]);
  void user;
  return (
    <div><PageHeader title="Add a product" eyebrow={<Link href="/admin/products" className="!no-underline">← Products</Link>}>New products start as drafts. Publish when the price and details are right.</PageHeader>
      <ProductForm categories={cats.map((c) => ({ id: c.id, name: c.name, parent: c.parent?.name }))} media={media.map((m) => ({ id: m.id, title: m.title ?? 'Photo' }))} canEdit /></div>
  );
}
