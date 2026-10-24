import type { Metadata } from 'next';
import { PageHero, DraftBanner } from '@/components/PageHero';
import { getSetting } from '@/server/settings';
import { getSite } from '@/server/site';

export const metadata: Metadata = { title: 'Privacy notice', description: 'What personal information Reset Pharmacy collects, why, how long we keep it, and your rights.' };

export default async function Privacy() {
  const [legal, { company: c }] = await Promise.all([getSetting('legal'), getSite()]);
  const who = c.legalName || c.tradingName;
  return (
    <>
      <PageHero eyebrow="Policies" title="Privacy notice" intro="What we collect, why we collect it, and the choices you have." />
      <div className="container-x py-10 md:py-14">
        <DraftBanner reviewed={!!legal.reviewedOn} />
        <div className="prose-reset">
          <p>This notice explains how {who} (“Reset Pharmacy”, “we”) handles personal information through this website. We aim to follow the Nigeria Data Protection Act 2023 and related regulations.</p>
          <h2>Who is responsible</h2>
          <p>{who} decides how your information is used. {c.email ? <>You can contact us at {c.email} or</> : <>You can contact us</>} through the <a href="/contact">contact page</a>. {c.superintendentPharmacist ? '' : 'The pharmacy will name its data protection contact here before launch.'}</p>
          <h2>What we collect and why</h2>
          <table><thead><tr><th>Information</th><th>Why</th><th>Basis</th></tr></thead><tbody>
            <tr><td>Name, email, phone, delivery address, order contents</td><td>To take, deliver and support your order; legal and accounting records</td><td>Contract; legal obligation</td></tr>
            <tr><td>Payment status and reference (not card details)</td><td>To confirm payment and handle refunds. Card details are entered on Paystack and never reach us</td><td>Contract</td></tr>
            <tr><td>Prescriptions you send, and notes to the pharmacist</td><td>For a pharmacist to review your request. This is health information; only authorised pharmacy staff can open it, and each opening is logged</td><td>Your consent; health care provision</td></tr>
            <tr><td>Messages you send us</td><td>To reply and improve our service</td><td>Legitimate interests</td></tr>
            <tr><td>Account details and saved addresses</td><td>To give you an account, order history and faster checkout</td><td>Contract</td></tr>
            <tr><td>Marketing email or text preferences</td><td>To send offers and health tips, only if you agree</td><td>Consent, which you can withdraw at any time</td></tr>
            <tr><td>Basic site usage (only if you accept analytics cookies)</td><td>To understand and improve the site</td><td>Consent</td></tr>
          </tbody></table>
          <h2>Who we share it with</h2>
          <p>We share only what is needed with: Paystack (payments); our email and text-message providers; couriers or riders who deliver your order; our hosting provider; and professional advisers or authorities where the law requires. We do not sell your information.</p>
          <h2>How long we keep it</h2>
          <ul><li><strong>Orders and payment records:</strong> kept for the period required for tax, accounting and regulatory records.</li><li><strong>Prescriptions:</strong> files are kept only as long as needed to review and complete your request and to meet pharmacy record-keeping duties, then removed.</li><li><strong>Messages:</strong> kept while we help you and for a reasonable period afterwards.</li><li><strong>Accounts:</strong> until you close your account.</li></ul>
          <h2>Your rights</h2>
          <p>You may ask to see, correct, export or delete your information, to object to or restrict some uses, and to withdraw consent. Signed-in customers can download their data and close their account under <a href="/account/profile">Your account</a>. For anything else, contact us. You may also complain to the Nigeria Data Protection Commission.</p>
          <h2>Security</h2>
          <p>Access to staff systems is limited by role, protected by sign-in controls, and recorded. Uploaded files are scanned and stored privately. No online system is perfectly secure, and we ask you to keep your password private.</p>
          <h2>Cookies</h2>
          <p>We use only the cookies the shop needs to work (keeping your basket and your sign-in). If analytics is switched on, we ask first, and you can change your mind from the footer.</p>
          <h2>Changes</h2>
          <p>If we change this notice in a way that matters, we will say so on this page.</p>
        </div>
      </div>
    </>
  );
}
