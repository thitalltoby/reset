import type { Metadata } from 'next';
import { PageHero, DraftBanner } from '@/components/PageHero';
import { getSetting } from '@/server/settings';
import { getSite } from '@/server/site';

export const metadata: Metadata = { title: 'Terms of sale', description: 'The terms that apply when you buy from Reset Pharmacy online.' };

export default async function Terms() {
  const [legal, { company: c }] = await Promise.all([getSetting('legal'), getSite()]);
  const who = c.legalName || c.tradingName;
  return (
    <>
      <PageHero eyebrow="Policies" title="Terms of sale" intro="The terms that apply when you order from this website." />
      <div className="container-x py-10 md:py-14">
        <DraftBanner reviewed={!!legal.reviewedOn} />
        <div className="prose-reset">
          <h2>About these terms</h2>
          <p>These terms apply to orders placed through this website with {who} (“Reset Pharmacy”, “we”). By placing an order you agree to them. They do not affect your statutory rights as a consumer.</p>
          <h2>Information on this site</h2>
          <p>Product and health information is general and does not replace advice from a pharmacist, doctor or other health professional. Always read the label and leaflet. Product images are illustrative and packaging may differ.</p>
          <h2>What you can buy online</h2>
          <ul><li>Non-prescription products marked with an add-to-basket button can be ordered online.</li><li>Pharmacist-only products are shown for information. Ask the pharmacist before you can obtain them.</li><li>Prescription-only medicines are never sold through the basket. They are supplied only against a valid prescription, after a pharmacist has reviewed it.</li></ul>
          <p>We may limit quantities, and a pharmacist may decline to supply any item where they judge it would not be safe or appropriate.</p>
          <h2>Prices and availability</h2>
          <p>Prices are in Nigerian naira and shown before you pay, together with any delivery charge and discount. We check price and stock again when you place the order. If an item has become unavailable or a price was shown wrongly, we will tell you before taking payment or, if you have paid, offer a refund.</p>
          <h2>Placing an order and payment</h2>
          <p>Your order is a request to buy. For card, bank-transfer and USSD payments, the order is confirmed when Paystack confirms the payment to us; until then we hold the items for a short time. If you pay on delivery or collection, the order is confirmed when you place it and you pay when it is handed over. We may cancel an order if we cannot supply it, in which case any payment is refunded.</p>
          <h2>Delivery, collection and returns</h2>
          <p>See <a href="/delivery-returns">Delivery &amp; returns</a>.</p>
          <h2>Promotions</h2>
          <p>Discount codes have their own conditions (such as a minimum spend or end date), shown when you apply them. We may withdraw a code that is misused.</p>
          <h2>Your account</h2>
          <p>Keep your password private. You are responsible for activity on your account. Tell us if you think someone else has used it.</p>
          <h2>Our responsibility</h2>
          <p>We are responsible for loss or damage that is a foreseeable result of our failing to take reasonable care, and for anything the law says we cannot exclude. We are not responsible for delays caused by events outside our reasonable control.</p>
          <h2>Complaints</h2>
          <p>If something is not right, please <a href="/contact?topic=complaint">tell us</a> and we will try to put it right.</p>
          <h2>Governing law</h2>
          <p>These terms are governed by the laws of the Federal Republic of Nigeria.</p>
        </div>
      </div>
    </>
  );
}
