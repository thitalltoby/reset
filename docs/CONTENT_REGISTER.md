# Content register

Where each piece of content comes from, and its status. "Supplied" = taken from the corporate profile or brand identity. "Written" = drafted by the build team from supplied themes. "Placeholder" = sample data, shown only in demo mode and labelled.

| Content | Source | Status | Where to change |
|---|---|---|---|
| Brand name, tagline, colours, logo | Supplied | Final | Code (brand tokens), `public/` |
| About: idea behind the name, values, promise | Supplied, lightly edited | Confirm wording | `src/app/(site)/about/page.tsx` |
| Vision and mission | Written from the profile | **Proposed: confirm** | same |
| Home, services, health, contact intros | Written | Confirm tone | respective pages |
| Elevator pitch | Written | **Proposed** | `docs/MESSAGING_GUIDE.md` (not used on the site) |
| 12 health articles | Written from public guidance (WHO, NHS, CDC, FDA, HSE), sources linked | **Draft: pharmacist review required**; hidden in live mode until reviewed | Admin → Health articles |
| 13 FAQs | Written | Confirm against actual policy | Admin → FAQs |
| Services (4 starters) | Written from the profile's service themes | Sample in demo; **none shown live until confirmed** | Admin → Services |
| Product catalogue: the 24 Reset Pharmacy products (names, categories, prices, photographs) plus 2 prescription-only demo samples | Provisional | Prices are samples until a manager confirms each one; photographs were supplied by the pharmacy and permission is not confirmed; label information mostly awaiting. Full list in `docs/CATALOGUE_REGISTER.md` | Admin → Products |
| Prices, stock, delivery zones, DEMO10 code | Placeholder | Sample only | Admin |
| Testimonials | None | Empty; only approved ones ever show | Admin → Testimonials |
| Privacy notice, terms, delivery & returns | Written | **Draft: legal review required** | `src/app/(site)/{privacy,terms,delivery-returns}` and Settings → Policies |
| Photography | Supplied brand deck images | Low resolution; replace with proper files | `public/photos/` |
| Phone, address, hours, licence numbers | **Not supplied** | Hidden until entered | Settings → Pharmacy details |
