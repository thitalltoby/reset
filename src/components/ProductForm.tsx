import Link from 'next/link';
import Image from 'next/image';
import { ActionForm, Field, SubmitButton } from './ActionForm';
import { ART_KEYS, ART_LABELS, ProductArt } from './ProductArt';
import { saveProductAction } from '@/app/admin/(console)/products/actions';
import type { Product } from '@/generated/prisma/client';

export interface MediaOpt { id: string; title: string }

export function ProductForm({ p, categories, media, canEdit }: { p?: Product; categories: { id: string; name: string; parent?: string | null }[]; media: MediaOpt[]; canEdit: boolean }) {
  const price = (k: number | null) => (k === null || k === undefined ? '' : String(k / 100));
  return (
    <ActionForm action={saveProductAction} encType="multipart/form-data" className="space-y-6">
      {p && <input type="hidden" name="id" value={p.id} />}
      <fieldset disabled={!canEdit} className="space-y-6">
        <section className="panel panel-pad space-y-4" aria-labelledby="pf1"><h2 id="pf1" className="!text-lg">Basics</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field name="name" label="Product name" required defaultValue={p?.name} className="md:col-span-2" />
            <Field name="sku" label="Stock code (SKU)" required defaultValue={p?.sku} hint="Your own unique code. Used for CSV import." />
            <Field name="brand" label="Brand" defaultValue={p?.brand} />
            <Field name="categoryId" type="select" label="Category" required defaultValue={p?.categoryId ?? ''} options={[{ value: '', label: 'Choose…' }, ...categories.map((c) => ({ value: c.id, label: c.parent ? `${c.parent} › ${c.name}` : c.name }))]} />
            <Field name="packSize" label="Pack size" defaultValue={p?.packSize} hint="For example “Pack of 20” or “100ml”." />
            <Field name="summary" label="One-line summary" required defaultValue={p?.summary} className="md:col-span-2" hint="Shown on product cards and in search." />
            <Field name="description" type="textarea" rows={5} label="Description" defaultValue={p?.description} className="md:col-span-2" />
          </div></section>
        <section className="panel panel-pad space-y-4" aria-labelledby="pf2"><h2 id="pf2" className="!text-lg">Price and selling rules</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Field name="price" label="Price (₦)" required defaultValue={price(p?.priceKobo ?? null)} inputMode="decimal" />
            <Field name="compareAt" label="Was price (₦, optional)" defaultValue={price(p?.compareAtKobo ?? null)} hint="Shows an offer badge. Must be higher than the price." inputMode="decimal" />
            <Field name="classification" type="select" label="How it is sold" defaultValue={p?.classification ?? 'OTC'} options={[
              { value: 'OTC', label: 'Over the counter: can be bought online' }, { value: 'PHARMACY_ONLY', label: 'Pharmacist only: shown, “ask the pharmacist”' }, { value: 'PRESCRIPTION', label: 'Prescription only: never shown online' },
            ]} hint="Prescription-only products are hidden from the public site." className="md:col-span-3" />
            <Field name="reorderLevel" type="number" label="Low-stock alert at" defaultValue={p?.reorderLevel ?? 5} min={0} />
            <Field name="maxPerOrder" type="number" label="Most per order" defaultValue={p?.maxPerOrder ?? 10} min={1} />
            <Field name="nafdacNumber" label="NAFDAC number" defaultValue={p?.nafdacNumber} hint="Enter it only from the pack or the NAFDAC register. Shown on the product page only if you enter it." />
            <Field name="priceConfirmed" type="checkbox" label="Price confirmed by a manager" defaultValue={p?.priceConfirmed ?? false} className="md:col-span-3" hint="Catalogue prices start as provisional sample prices. A product cannot be published until its price is confirmed." />
          </div></section>
        <section className="panel panel-pad space-y-4" aria-labelledby="pf3"><h2 id="pf3" className="!text-lg">Product information</h2>
          <Field name="howToUse" type="textarea" rows={3} label="How to use" defaultValue={p?.howToUse} />
          <Field name="warnings" type="textarea" rows={3} label="Warnings" defaultValue={p?.warnings} />
          <Field name="ingredients" type="textarea" rows={2} label="Ingredients" defaultValue={p?.ingredients} />
          <div className="grid gap-4 md:grid-cols-2"><Field name="barcode" label="Barcode" defaultValue={p?.barcode} /><Field name="groupKey" label="Size group" defaultValue={p?.groupKey} hint="Products sharing this word are offered as sizes of one another." /></div>
          <Field name="tags" label="Search tags" defaultValue={p?.tags.join(', ')} hint="Comma-separated words people might type." /></section>
        <section className="panel panel-pad space-y-4" aria-labelledby="pf3b"><h2 id="pf3b" className="!text-lg">Catalogue record</h2>
          <p className="text-sm text-muted">Details taken from the pack. Strength, active ingredients, directions, warnings and storage appear on the public page only when the information check below says <strong>Verified</strong>.</p>
          <div className="grid gap-4 md:grid-cols-2">
            <Field name="manufacturer" label="Manufacturer" defaultValue={p?.manufacturer} />
            <Field name="strength" label="Strength or concentration" defaultValue={p?.strength} hint="For example “500mg” or “1450ppm fluoride”." />
            <Field name="activeIngredients" label="Active ingredients" defaultValue={p?.activeIngredients} className="md:col-span-2" hint="With amounts, exactly as printed on the label." />
            <Field name="storage" label="Storage" defaultValue={p?.storage} className="md:col-span-2" />
            <Field name="brandConfirmed" type="checkbox" label="Brand and pack confirmed against the stock the pharmacy holds" defaultValue={p?.brandConfirmed ?? false} className="md:col-span-2" />
            <Field name="packMarket" label="Market printed on the pictured pack" defaultValue={p?.packMarket} hint="Leave empty for Nigerian packs. Shown to customers as “picture shows a pack made for …”." className="md:col-span-2" />
          </div></section>
        <section className="panel panel-pad space-y-4" aria-labelledby="pf3c"><h2 id="pf3c" className="!text-lg">Information check</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field name="infoStatus" type="select" label="Label information" defaultValue={p?.infoStatus ?? 'AWAITING'} options={[
              { value: 'AWAITING', label: 'Awaiting: nothing checked yet' }, { value: 'PROVISIONAL', label: 'Provisional: from a retailer or another market’s leaflet' }, { value: 'VERIFIED', label: 'Verified against this product’s own label or leaflet' },
            ]} className="md:col-span-2" />
            <Field name="infoSource" type="textarea" rows={3} label="Where it was checked" defaultValue={p?.infoSource} className="md:col-span-2" hint="Name the leaflet, pack or register, the date, and anything still to confirm. Required for Verified." />
          </div></section>
        <section className="panel panel-pad space-y-4" aria-labelledby="pf4"><h2 id="pf4" className="!text-lg">Picture</h2>
          <p className="text-sm text-muted">Use a clear photo of the pack on a plain white background (JPG, PNG or WebP). Until one is added, a “photo coming soon” tile is shown.</p>
          {p?.photo && <p className="flex items-center gap-3 text-sm"><span className="relative block h-16 w-16 flex-none overflow-hidden rounded-lg border border-line bg-white"><Image src={p.photo} alt="" fill sizes="64px" className="object-contain p-1" /></span><span>Built-in photo: <code>{p.photo}</code>. An uploaded or chosen photo below replaces it; choose “Built-in photo” to go back.</span></p>}
          <fieldset><legend className="label">Choose a photo from the library</legend>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-6">
              <label className="choice !flex-col !items-center !p-2 text-center text-xs"><input type="radio" name="image" value="" defaultChecked={!p?.imageId} className="accent-[#006b45]" /><ProductArt kind={p?.art ?? 'pill'} size={48} />{p?.photo ? 'Built-in photo' : 'No photo yet'}</label>
              {media.map((m) => <label key={m.id} className="choice !flex-col !items-center !p-2 text-center text-xs"><input type="radio" name="image" value={m.id} defaultChecked={p?.imageId === m.id} className="accent-[#006b45]" /><span className="relative block h-16 w-16"><Image src={`/media/${m.id}`} alt="" fill sizes="64px" className="object-contain" /></span><span className="line-clamp-2">{m.title}</span></label>)}
            </div></fieldset>
          <div className="grid gap-4 md:grid-cols-2"><Field name="photo" type="file" label="Or upload a new photo" accept=".jpg,.jpeg,.png,.webp" hint="It replaces the current photo. It is scanned before it is shown." /><Field name="photoAlt" label="Describe the new photo" hint="Short text for people who cannot see it. Needed with an upload." /></div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field name="imageAlt" label="Alt text for the current photo" defaultValue={p?.imageAlt} hint="What the pack looks like, for people who cannot see it." className="md:col-span-2" />
            <Field name="imageRights" type="select" label="Photo permission" defaultValue={p?.imageRights ?? 'NONE'} options={[
              { value: 'NONE', label: 'No photo yet' }, { value: 'CLIENT_SUPPLIED', label: 'Supplied to us: owner’s permission not confirmed' }, { value: 'MANUFACTURER_APPROVED', label: 'Manufacturer or distributor has approved it' }, { value: 'LICENSED', label: 'Licensed or bought from a photo library' }, { value: 'OWN_PHOTO', label: 'Photographed by the pharmacy' },
            ]} />
            <Field name="imageSource" label="Where the photo came from" defaultValue={p?.imageSource} hint="Source address or name, date, and who gave permission." />
          </div>
          <fieldset><legend className="label">More pictures</legend>
            {p && p.gallery.length > 0 && <ul className="mb-3 flex flex-wrap gap-3">{p.gallery.map((g) => <li key={g}><label className="choice !flex-col !items-center !p-2 text-center text-xs"><span className="relative block h-16 w-16"><Image src={g} alt="" fill sizes="64px" className="object-contain" /></span><span className="flex items-center gap-1.5"><input type="checkbox" name="galleryKeep" value={g} defaultChecked className="accent-[#006b45]" />Keep</span></label></li>)}</ul>}
            <Field name="galleryAdd" type="file" label="Add more photos" accept=".jpg,.jpeg,.png,.webp" multiple hint="Up to 8 in total. Same permission as above." />
          </fieldset>
          <Field name="art" type="select" label="Line illustration (used in the admin only)" defaultValue={p?.art ?? 'pill'} options={ART_KEYS.map((k) => ({ value: k, label: ART_LABELS[k] ?? k }))} /></section>
        <section className="panel panel-pad space-y-4" aria-labelledby="pf5"><h2 id="pf5" className="!text-lg">Visibility</h2>
          <div className="grid gap-4 md:grid-cols-2"><Field name="status" type="select" label="Status" defaultValue={p?.status ?? 'DRAFT'} options={[{ value: 'DRAFT', label: 'Draft: not on the website' }, { value: 'PUBLISHED', label: 'Published: visible in the shop' }]} /><Field name="featured" type="checkbox" label="Feature on the home page" defaultValue={p?.featured} className="md:pt-8" /></div>
          <Field name="slug" label="Web address (optional)" defaultValue={p?.slug} hint="Leave empty to create it from the name." /></section>
      </fieldset>
      {canEdit && <div className="flex flex-wrap gap-3"><SubmitButton className="btn btn-primary btn-lg">{p ? 'Save changes' : 'Create product'}</SubmitButton><Link href="/admin/products" className="btn btn-outline btn-lg">Cancel</Link></div>}
    </ActionForm>
  );
}
