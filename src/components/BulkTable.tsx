'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ActionForm, SubmitButton } from './ActionForm';
import { Badge } from './ui';
import { formatNaira } from '@/lib/money';
import { bulkStatusAction } from '@/app/admin/(console)/products/actions';

interface Row { id: string; name: string; sku: string; category: string; price: number; stock: number; reorder: number; status: string; classification: string; demo: boolean; todo: string[] }

export function BulkTable({ rows, canEdit }: { rows: Row[]; canEdit: boolean }) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const all = sel.size === rows.length && rows.length > 0;
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  return (
    <ActionForm action={bulkStatusAction}>
      {canEdit && (
        <div className="mb-3 flex flex-wrap items-center gap-3" aria-live="polite">
          <span className="text-sm text-muted">{sel.size} selected</span>
          <SubmitButton name="status" value="PUBLISHED" className="btn btn-soft btn-sm">Publish</SubmitButton>
          <SubmitButton name="status" value="DRAFT" className="btn btn-outline btn-sm">Unpublish</SubmitButton>
        </div>
      )}
      <div className="table-wrap"><table className="table"><caption className="sr-only">Products</caption>
        <thead><tr>{canEdit && <th scope="col" className="w-10"><input type="checkbox" aria-label="Select all" checked={all} onChange={() => setSel(all ? new Set() : new Set(rows.map((r) => r.id)))} /></th>}<th scope="col">Product</th><th scope="col">Category</th><th scope="col">Sold as</th><th scope="col" className="num">Price</th><th scope="col" className="num">Stock</th><th scope="col">Catalogue check</th><th scope="col">Status</th></tr></thead>
        <tbody>{rows.map((p) => (
          <tr key={p.id}>
            {canEdit && <td><input type="checkbox" name="ids" value={p.id} checked={sel.has(p.id)} onChange={() => toggle(p.id)} aria-label={`Select ${p.name}`} /></td>}
            <td><Link href={`/admin/products/${p.id}`} className="font-medium">{p.name}</Link><span className="block text-xs text-muted">{p.sku}{p.demo ? ' · sample' : ''}</span></td>
            <td className="text-sm">{p.category}</td>
            <td className="text-sm">{p.classification === 'OTC' ? 'Over the counter' : p.classification === 'PHARMACY_ONLY' ? 'Pharmacist only' : 'Prescription'}</td>
            <td className="num">{formatNaira(p.price)}</td>
            <td className="num"><Badge tone={p.stock <= 0 ? 'bad' : p.stock <= p.reorder ? 'warn' : 'neutral'}>{p.stock}</Badge></td>
            <td className="text-xs">{p.todo.length === 0 ? <span className="text-muted">Complete</span> : <ul className="flex flex-wrap gap-1">{p.todo.map((t) => <li key={t}><Badge tone="warn">{t}</Badge></li>)}</ul>}</td>
            <td><Badge tone={p.status === 'PUBLISHED' ? 'good' : 'neutral'}>{p.status === 'PUBLISHED' ? 'Published' : 'Draft'}</Badge></td>
          </tr>
        ))}</tbody></table></div>
    </ActionForm>
  );
}
