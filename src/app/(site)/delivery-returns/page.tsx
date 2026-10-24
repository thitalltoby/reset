import type { Metadata } from 'next';
import { PageHero, DraftBanner } from '@/components/PageHero';
import { getSetting } from '@/server/settings';
import { getSite } from '@/server/site';
import { formatNaira } from '@/lib/money';
import { db } from '@/server/db';

export const metadata: Metadata = { title: 'Delivery & returns', description: 'How Reset Pharmacy delivers, how collection works, and what happens if something is wrong with your order.' };

export default async function DeliveryReturns() {
  const [legal, site] = await Promise.all([getSetting('legal'), getSite()]);
  const zones = site.shop.delivery ? await db.deliveryZone.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { feeKobo: 'asc' }] }) : [];
  return (
    <>
      <PageHero eyebrow="Policies" title="Delivery & returns" intro="How your order reaches you, and what we do if something is not right." />
      <div className="container-x py-10 md:py-14">
        <DraftBanner reviewed={!!legal.reviewedOn} />
        <div className="prose-reset">
          <h2>Delivery</h2>
          {site.shop.delivery ? <>
            <p>We deliver to the areas listed below. The delivery charge is shown at checkout before you pay{zones.some((z) => z.freeOverKobo !== null) ? ', and is waived on larger orders as shown' : ''}.</p>
            {zones.length > 0 && <table><thead><tr><th>Area</th><th>Charge</th><th>Free over</th><th>Usual time</th></tr></thead><tbody>{zones.map((z) => <tr key={z.id}><td>{z.name}{z.areas ? ` — ${z.areas}` : ''}</td><td>{formatNaira(z.feeKobo)}</td><td>{z.freeOverKobo !== null ? formatNaira(z.freeOverKobo) : '—'}</td><td>{z.etaText || '—'}</td></tr>)}</tbody></table>}
          </> : <p>Home delivery is not open yet. Delivery areas, charges and times will be published here when it is.</p>}
          <h2>Collection</h2>
          {site.shop.pickup ? <p>You can collect your order from the pharmacy. We email you when it is ready. {site.shop.pickupNote}</p> : <p>Collection is not open yet.</p>}
          <h2>Medicines and your order</h2>
          <p>Some products can only be supplied after a pharmacist has checked they are suitable for you, and prescription-only medicines are supplied only against a valid prescription. We may contact you before preparing an order that includes such items, and we may decline to supply an item where the pharmacist is not satisfied it is safe to do so.</p>
          <h2>Returns and refunds</h2>
          <p>For health and safety reasons, medicines and other products that have left the pharmacy cannot normally be taken back or resold. We will always put things right if:</p>
          <ul><li>we sent the wrong item, or the wrong quantity,</li><li>an item arrived damaged, defective or past its expiry date, or</li><li>you were charged incorrectly.</li></ul>
          <p>Please contact us as soon as you notice, quoting your order number, and keep the item and its packaging. If you are entitled to a refund for a card payment, we refund it to the original payment method. Banks and Paystack decide how long it takes to appear.</p>
          <p>Your statutory rights as a consumer are not affected by this page.</p>
          <h2>Cancelling an order</h2>
          <p>You can cancel an unpaid card order from your order page at any time. Once an order is paid and being prepared, please contact us straight away and we will do what we can.</p>
          <h2>Contact</h2>
          <p>Questions about an order? Use the contact page, quoting the order number.</p>
        </div>
      </div>
    </>
  );
}
