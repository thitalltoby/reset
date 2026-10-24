# Admin guide

Sign in at `/admin/login`. What you see depends on your role.

| Role | Can do |
|---|---|
| Super Admin | Everything, including users, settings, integrations, audit log |
| Pharmacy Manager | Orders (incl. cancel), catalogue, stock, prescriptions, promotions, content, reports |
| Pharmacist | Prescriptions, orders, stock, enquiries, customers |
| Store Staff | Pack and hand over orders, receive stock, answer enquiries. **No prescriptions** |
| Content Editor | Products, articles, FAQs, promotions. No orders or customers |

## Day to day
- **Dashboard:** what needs attention (new orders, prescriptions waiting, low stock), recent sales.
- **Orders:** open an order, move it along (*Being prepared → Ready / Out for delivery → Completed*). Text in "Message or reason" is shown to the customer. Cancelling needs a reason and returns stock for pay-on-delivery orders. If a card payment arrives for an order that was already cancelled, it is flagged **refund due**: refund it in Paystack, then record it on the order.
- **A payment that does not match** (amount or currency) is held and flagged. Check Paystack before supplying anything.
- **Prescriptions:** open one (this is logged), view the files (links last five minutes), set a status and write a note the customer will see. Nothing is dispensed from the console. When closed, remove the uploaded files.
- **Enquiries:** assign, add a private note, reply from your email with the button.
- **Stock:** Admin → Stock shows low items; adjust with a reason; every change is recorded.

## Catalogue
- **Classification** controls what customers can do: *Over the counter* can be bought online; *Pharmacist-only* shows "ask the pharmacist"; *Prescription* is never shown publicly.
- **Import:** download the template, fill it, upload. The import reports problems row by row and changes nothing if the file is unreadable.
- **The 24 Reset Pharmacy products** are in `src/content/reset-catalogue.ts`. In live mode they load as drafts with no stock. Every price is *provisional* until you tick **Price confirmed by a manager**; a product cannot be published (singly or in bulk) before that.
- **Photos:** each product has a bundled photograph (from the files the pharmacy supplied) that you can replace by uploading a new one under *Picture*. Record **Photo permission** and **Where the photo came from** every time. Add more pictures under *More pictures*. Products with no photo show "Photo coming soon", never a stand-in.
- **Information check:** *Label information* is Awaiting, Provisional or Verified. Directions, warnings, ingredients, strength and storage reach customers only when it is Verified, and Verified needs a written source (the leaflet or pack you checked). Enter a NAFDAC number only from the pack or the NAFDAC register.
- **What still needs doing:** the *Catalogue check* chips on the Products list show each product's open items. `npm run catalogue:report` rewrites `docs/CATALOGUE_REGISTER.md` and `docs/catalogue/reset-catalogue.json`. `CATALOGUE_SYNC=1 npm run db:seed` refreshes catalogue records from the file without touching stock or orders.
- **Pack sizes:** give products the same "group key" to show them as sizes of one item.

## Website content
Services, articles, FAQs, testimonials, banners and discount codes are edited under *Website* and *Sell*. Each list row opens to edit. Nothing about real services, reviews or testimonials is shown publicly until you tick confirmed / reviewed / approved.

## Settings
Pharmacy details, shop switches (delivery, pickup, pay-on-delivery, card, prescriptions), announcement bar, who receives alerts, search appearance, policy review record, staff sign-in security.

## Safety habits
- Keep health detail out of order notes and ordinary emails.
- Turn on two-factor sign-in for everyone with admin access.
- Switch off leavers the same day (Team and roles).
