import { requireStaff } from '@/server/rbac';
import { db } from '@/server/db';
import { PageHeader, Badge } from '@/components/ui';
import { ActionForm, Field, SubmitButton } from '@/components/ActionForm';
import { formatNaira } from '@/lib/money';
import { fmtDate, toDateInput } from '@/lib/format';
import { deleteCouponAction, deletePromotionAction, saveCouponAction, savePromotionAction } from '../content-actions';

export const metadata = { title: 'Promotions and codes' };

type P = { id: string; title: string; body: string; ctaLabel: string; ctaHref: string; tone: string; couponCode: string | null; startsAt: Date | null; endsAt: Date | null; visible: boolean; sortOrder: number };
function PForm({ p }: { p?: P }) {
  return (
    <ActionForm action={savePromotionAction} className="space-y-3" resetOnSuccess={!p}>
      {p && <input type="hidden" name="id" value={p.id} />}
      <Field name="title" label="Headline" required defaultValue={p?.title} />
      <Field name="body" label="Supporting line" defaultValue={p?.body} maxLength={240} />
      <div className="grid gap-3 sm:grid-cols-3"><Field name="ctaLabel" label="Button text" defaultValue={p?.ctaLabel ?? 'Shop now'} /><Field name="ctaHref" label="Button goes to" defaultValue={p?.ctaHref ?? '/shop'} hint="/shop or an https:// address" /><Field name="tone" type="select" label="Look" defaultValue={p?.tone ?? 'MINT'} options={[{ value: 'MINT', label: 'Soft mint' }, { value: 'GREEN', label: 'Deep green' }, { value: 'RED', label: 'Alert red' }]} /></div>
      <div className="grid gap-3 sm:grid-cols-4"><Field name="couponCode" label="Show code (optional)" defaultValue={p?.couponCode} /><Field name="startsAt" type="date" label="Starts" defaultValue={toDateInput(p?.startsAt)} /><Field name="endsAt" type="date" label="Ends" defaultValue={toDateInput(p?.endsAt)} /><Field name="sortOrder" type="number" min={0} label="Order" defaultValue={p?.sortOrder ?? 0} /></div>
      <Field name="visible" type="checkbox" label="Show on the website" defaultValue={p?.visible ?? false} />
      <SubmitButton className="btn btn-primary btn-sm">{p ? 'Save' : 'Add banner'}</SubmitButton>
    </ActionForm>
  );
}

type C = { id: string; code: string; description: string; kind: string; value: number; minSubtotalKobo: number; startsAt: Date | null; endsAt: Date | null; usageLimit: number | null; usedCount: number; active: boolean };
function CForm({ c }: { c?: C }) {
  return (
    <ActionForm action={saveCouponAction} className="space-y-3" resetOnSuccess={!c}>
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="grid gap-3 sm:grid-cols-3"><Field name="code" label="Code" required defaultValue={c?.code} /><Field name="kind" type="select" label="Type" defaultValue={c?.kind ?? 'PERCENT'} options={[{ value: 'PERCENT', label: 'Percentage off' }, { value: 'FIXED', label: 'Fixed amount off (₦)' }]} /><Field name="value" type="number" step="0.01" min={1} label="Value" required hint="Percent (1–90) or naira" defaultValue={c ? (c.kind === 'FIXED' ? c.value / 100 : c.value) : ''} /></div>
      <Field name="description" label="Note for staff" defaultValue={c?.description} />
      <div className="grid gap-3 sm:grid-cols-4"><Field name="minSubtotal" type="number" step="0.01" min={0} label="Minimum basket (₦)" defaultValue={c ? c.minSubtotalKobo / 100 : 0} /><Field name="startsAt" type="date" label="Starts" defaultValue={toDateInput(c?.startsAt)} /><Field name="endsAt" type="date" label="Ends" defaultValue={toDateInput(c?.endsAt)} /><Field name="usageLimit" type="number" min={1} label="Max uses" defaultValue={c?.usageLimit ?? ''} /></div>
      <Field name="active" type="checkbox" label="Code works at checkout" defaultValue={c?.active ?? true} />
      <SubmitButton className="btn btn-primary btn-sm">{c ? 'Save' : 'Add code'}</SubmitButton>
    </ActionForm>
  );
}

export default async function Promotions() {
  await requireStaff('promo.manage');
  const [promos, coupons] = await Promise.all([db.promotion.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] }), db.coupon.findMany({ orderBy: { createdAt: 'desc' } })]);
  return (
    <div className="max-w-4xl space-y-10">
      <PageHeader title="Promotions and codes" eyebrow="Sell">Banners on the home page and discount codes at checkout. Discounts are worked out on the server, never trusted from the browser.</PageHeader>
      <section aria-labelledby="bn">
        <h2 id="bn" className="mb-3">Banners</h2>
        <details className="panel panel-pad mb-4"><summary className="cursor-pointer font-display font-semibold">Add a banner</summary><div className="mt-4"><PForm /></div></details>
        <ul className="space-y-3">{promos.map((p) => (
          <li key={p.id} className="panel"><details><summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-4"><span className="font-medium">{p.title}</span><span className="flex gap-2">{p.endsAt && <Badge>until {fmtDate(p.endsAt)}</Badge>}{p.visible ? <Badge tone="good">Shown</Badge> : <Badge>Hidden</Badge>}</span></summary>
            <div className="space-y-4 border-t border-line p-4"><PForm p={p} /><ActionForm action={deletePromotionAction}><input type="hidden" name="id" value={p.id} /><SubmitButton className="btn btn-danger btn-sm">Delete banner</SubmitButton></ActionForm></div></details></li>
        ))}</ul>
        {promos.length === 0 && <p className="text-muted">No banners.</p>}
      </section>
      <section aria-labelledby="cp">
        <h2 id="cp" className="mb-3">Discount codes</h2>
        <details className="panel panel-pad mb-4"><summary className="cursor-pointer font-display font-semibold">Add a code</summary><div className="mt-4"><CForm /></div></details>
        <ul className="space-y-3">{coupons.map((c) => (
          <li key={c.id} className="panel"><details><summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-4"><span className="font-display font-semibold">{c.code} <span className="font-body text-sm font-normal text-muted">{c.kind === 'PERCENT' ? `${c.value}% off` : `${formatNaira(c.value)} off`} · used {c.usedCount}{c.usageLimit ? ` of ${c.usageLimit}` : ''}</span></span>{c.active ? <Badge tone="good">On</Badge> : <Badge>Off</Badge>}</summary>
            <div className="space-y-4 border-t border-line p-4"><CForm c={c} /><ActionForm action={deleteCouponAction}><input type="hidden" name="id" value={c.id} /><SubmitButton className="btn btn-danger btn-sm">Delete or switch off</SubmitButton></ActionForm></div></details></li>
        ))}</ul>
        {coupons.length === 0 && <p className="text-muted">No codes.</p>}
      </section>
    </div>
  );
}
