import { requireStaff } from '@/server/rbac';
import { getSetting } from '@/server/settings';
import { env } from '@/server/env';
import { PageHeader, Alert } from '@/components/ui';
import { ActionForm, Field, SubmitButton } from '@/components/ActionForm';
import { saveCompanyAction, saveLegalAction, saveNoticeAction, saveNotificationsAction, saveSecurityAction, saveSeoAction, saveShopAction } from './actions';

export const metadata = { title: 'Settings' };

function Card({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return <section id={id} className="panel panel-pad scroll-mt-24" aria-labelledby={`${id}-h`}><h2 id={`${id}-h`} className="!text-lg mb-4">{title}</h2>{children}</section>;
}

export default async function Settings() {
  await requireStaff('settings.manage');
  const [c, s, n, nt, sec, seo, legal] = await Promise.all([getSetting('company'), getSetting('shop'), getSetting('notice'), getSetting('notifications'), getSetting('security'), getSetting('seo'), getSetting('legal')]);
  const demo = env.SITE_MODE !== 'live';
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Settings" eyebrow="System">Anything left empty is simply not shown to the public. Nothing here is filled in for you.</PageHeader>
      {demo && <Alert tone="warn">This site is in demo mode: sample products, services and articles are visible and search engines are told to stay away. Set <code>SITE_MODE=live</code> at launch (see the launch checklist).</Alert>}
      <Card id="company" title="Pharmacy details">
        <ActionForm action={saveCompanyAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2"><Field name="legalName" label="Registered name" defaultValue={c.legalName} /><Field name="tradingName" label="Trading name" defaultValue={c.tradingName} /></div>
          <Field name="tagline" label="Tagline" defaultValue={c.tagline} />
          <Field name="address" type="textarea" rows={2} label="Address" defaultValue={c.address} />
          <div className="grid gap-4 sm:grid-cols-3"><Field name="phone" type="tel" label="Phone" defaultValue={c.phone} /><Field name="email" type="email" label="Public email" defaultValue={c.email} /><Field name="whatsapp" label="WhatsApp number" hint="Digits with country code" defaultValue={c.whatsapp} /></div>
          <Field name="mapUrl" label="Map link" hint="Google Maps share link (https)" defaultValue={c.mapUrl} />
          <Field name="hours" type="textarea" rows={4} label="Opening hours" hint="One line per entry, e.g. Monday–Saturday: 8am–8pm" defaultValue={c.hours} />
          <div className="grid gap-4 sm:grid-cols-3"><Field name="registrationNumber" label="Company registration" defaultValue={c.registrationNumber} /><Field name="premisesLicence" label="PCN premises licence" defaultValue={c.premisesLicence} /><Field name="superintendentPharmacist" label="Superintendent pharmacist" defaultValue={c.superintendentPharmacist} /></div>
          <div className="grid gap-4 sm:grid-cols-4"><Field name="instagram" label="Instagram link" defaultValue={c.instagram} /><Field name="facebook" label="Facebook link" defaultValue={c.facebook} /><Field name="x" label="X link" defaultValue={c.x} /><Field name="tiktok" label="TikTok link" defaultValue={c.tiktok} /></div>
          <SubmitButton>Save details</SubmitButton>
        </ActionForm>
      </Card>
      <Card id="shop" title="Shop">
        <ActionForm action={saveShopAction} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field name="onlineShop" type="checkbox" label="Online buying is open" defaultValue={s.onlineShop} />
            <Field name="paystack" type="checkbox" label="Card, transfer and USSD (Paystack)" defaultValue={s.paystack} hint="Needs the Paystack keys and a successful test payment first." />
            <Field name="payOnDelivery" type="checkbox" label="Pay on delivery or pickup" defaultValue={s.payOnDelivery} />
            <Field name="delivery" type="checkbox" label="Offer delivery" defaultValue={s.delivery} hint="Also needs at least one active delivery zone." />
            <Field name="pickup" type="checkbox" label="Offer pickup" defaultValue={s.pickup} />
            <Field name="prescriptions" type="checkbox" label="Accept prescriptions online" defaultValue={s.prescriptions} hint="Only if a pharmacist will review them." />
          </div>
          <div className="grid gap-4 sm:grid-cols-2"><Field name="orderHoldMinutes" type="number" min={10} max={240} label="Minutes to hold stock for unpaid card orders" defaultValue={s.orderHoldMinutes} /><Field name="minOrder" type="number" min={0} step="0.01" label="Smallest order (₦, 0 for none)" defaultValue={s.minOrderKobo / 100} /></div>
          <Field name="pickupNote" type="textarea" rows={2} label="Pickup instructions" defaultValue={s.pickupNote} />
          <SubmitButton>Save shop settings</SubmitButton>
        </ActionForm>
      </Card>
      <Card id="notice" title="Announcement bar">
        <ActionForm action={saveNoticeAction} className="space-y-4">
          <Field name="enabled" type="checkbox" label="Show the announcement" defaultValue={n.enabled} />
          <Field name="text" label="Text" defaultValue={n.text} maxLength={140} />
          <div className="grid gap-4 sm:grid-cols-3"><Field name="href" label="Link (optional)" defaultValue={n.href} /><Field name="linkLabel" label="Link text" defaultValue={n.linkLabel} /><Field name="endsOn" type="date" label="Last day shown" defaultValue={n.endsOn} /></div>
          <SubmitButton>Save announcement</SubmitButton>
        </ActionForm>
      </Card>
      <Card id="notifications" title="Who gets alerts">
        <p className="mb-3 text-sm text-muted">One email per line. Empty means every active Super Admin and Manager.</p>
        <ActionForm action={saveNotificationsAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2"><Field name="newOrderTo" type="textarea" rows={3} label="New orders" defaultValue={nt.newOrderTo.join('\n')} /><Field name="prescriptionTo" type="textarea" rows={3} label="Prescriptions" defaultValue={nt.prescriptionTo.join('\n')} /><Field name="enquiryTo" type="textarea" rows={3} label="Enquiries" defaultValue={nt.enquiryTo.join('\n')} /><Field name="lowStockTo" type="textarea" rows={3} label="Low stock" defaultValue={nt.lowStockTo.join('\n')} /></div>
          <SubmitButton>Save</SubmitButton>
        </ActionForm>
      </Card>
      <Card id="seo" title="Search appearance">
        <ActionForm action={saveSeoAction} className="space-y-4">
          <Field name="siteName" label="Site name" required defaultValue={seo.siteName} />
          <Field name="description" type="textarea" rows={2} label="Default description" defaultValue={seo.description} hint="Up to 200 characters." />
          <Field name="pages" type="textarea" rows={4} label="Page overrides (optional)" hint="One per line: /path | Title | Description" defaultValue={Object.entries(seo.pages).map(([p, v]) => `${p} | ${v.title} | ${v.description}`).join('\n')} />
          <SubmitButton>Save</SubmitButton>
        </ActionForm>
      </Card>
      <Card id="legal" title="Policies">
        <p className="mb-3 text-sm text-muted">The privacy notice, terms and delivery policy are drafts until a qualified Nigerian legal adviser has reviewed them. Record the review here to remove the draft banner.</p>
        <ActionForm action={saveLegalAction} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field name="reviewedOn" type="date" label="Reviewed on" defaultValue={legal.reviewedOn} /><Field name="reviewedBy" label="Reviewed by" defaultValue={legal.reviewedBy} /></div><SubmitButton>Save</SubmitButton></ActionForm>
      </Card>
      <Card id="security" title="Staff sign-in security">
        <ActionForm action={saveSecurityAction} className="space-y-4"><Field name="requireStaffMfa" type="checkbox" label="Require two-factor sign-in for all staff" defaultValue={sec.requireStaffMfa} hint="Strongly recommended before launch." /><SubmitButton>Save</SubmitButton></ActionForm>
      </Card>
    </div>
  );
}
