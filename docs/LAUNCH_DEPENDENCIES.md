# Launch dependencies

Nothing below has been invented. Each item is either empty on the site (and therefore hidden) or flagged as a draft.

## The pharmacy must supply or confirm
1. **Contact details:** phone, address, map link, public email, WhatsApp number (Settings → Pharmacy details). Until entered, the footer and contact page say details are coming.
2. **Opening hours.**
3. **Registration details:** company registration, PCN premises licence number, superintendent pharmacist (name and registration). Shown on About only when entered.
4. **Real catalogue:** CSV import (Admin → Products → Import; download the template there). Include price, stock, classification (OTC / pharmacist-only / prescription) and NAFDAC number where one applies.
5. **Catalogue approvals** (see `docs/CATALOGUE_REGISTER.md`): confirm each price, confirm brand/pack against the shelf, give a written permission for each photograph (or photograph the stock in store), supply photos for the 11 products without one, verify label information against the pack or leaflet, and enter NAFDAC numbers from the packs or the register.
6. **Services Reset actually offers.** Replace the sample services and tick *confirmed* on each real one. Do not tick anything that is not staffed and permitted.
7. **Delivery zones, charges and times** (Admin → Delivery areas). With none active, checkout offers collection only.
8. **Collection instructions** (Settings → Shop).
9. **Pharmacist review of the 12 starter health articles.** Each is a plain-language draft with sources. None is shown on the live site until a named professional signs it off in Admin → Health articles.
10. **Testimonials:** only real words from customers who agreed. None exist yet.
11. **Mission and vision:** the wording on the About page is *proposed* from the corporate profile. Confirm or replace.
12. **Social links.**

## Accounts and approvals needed
- **Paystack business account** (test keys first; live keys after Paystack approves the business). Then: set the webhook URL, run test payments with Paystack's test cards (success, declined, abandoned), then switch to live keys.
- **Email provider** (Resend or SMTP) and a verified sending domain. Without one, messages are logged as "skipped" and never sent.
- **Hosting:** PostgreSQL 16, a persistent volume for uploads, HTTPS, and a scheduler (or the worker process).
- **Domain name.**
- **Optional:** SMS provider, Google Analytics 4 and Search Console, ClamAV.

## Legal and regulatory review
- **Privacy notice, terms of sale and delivery/returns policy** are drafts written to be reviewed by a Nigerian legal adviser (NDPA 2023, consumer protection, e-commerce). Pages show a draft banner until Admin → Settings → Policies records a review date and reviewer.
- Confirm with the PCN what the pharmacy may sell and supply online, and what a prescription request process must record.
- Register as a data controller with the NDPC if required.
- Confirm NAFDAC registration numbers for the products listed.

## Before switching to live
- [ ] `npm run demo:clear`, then `SITE_MODE=live`
- [ ] Real catalogue imported and spot-checked against the shelf
- [ ] All settings above entered
- [ ] Paystack live key tested with one small real payment, then refunded
- [ ] Email provider connected; send a test from Integrations
- [ ] Staff accounts created; two-factor sign-in required (Settings → Security)
- [ ] Default development accounts do not exist in production (they are never created there)
- [ ] Backups of the database and uploads scheduled and a restore tried
- [ ] Policies reviewed and the date recorded
