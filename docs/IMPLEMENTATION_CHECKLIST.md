# Implementation checklist: what is built, tested and not

"Tested" means an automated test exercises it and passes. "Verified by eye" means it was checked on screen during the build. Nothing here is marked done unless it is.

## Storefront
| Area | Built | Tested |
|---|---|---|
| Home, About, Services, Health & Wellness Centre, Questions, Contact, policy pages | Yes | Browser tests load and scan each for accessibility |
| Catalogue, categories, filters (price, in stock, offer), sort, pagination | Yes | Integration (visibility rules), verified by eye |
| Search with suggestions | Yes | Browser test types a query and sees suggestions |
| Product page with alternative sizes, warnings, ask-the-pharmacist | Yes | Verified by eye |
| Basket (caps at available stock, flags lines that changed) | Yes | Integration |
| Guest checkout, delivery zones, coupon codes, pickup | Yes | Integration and browser |
| Order confirmation, private tracking link, track by number + email | Yes | Browser |
| Customer accounts, addresses, favourites, history, export, closure | Yes | Verified by eye; sign-in and permissions tested |
| Prescription upload and follow-up | Yes | Integration and browser |

## Payments and stock
| | Built | Tested |
|---|---|---|
| Paystack initialise, return-page verification, signed webhook | Yes | Against a **local stand-in**, not Paystack itself |
| Order confirmed only when amount and currency match | Yes | Integration (match, mismatch, failed, abandoned, repeated delivery, bad signature) |
| Stock held for unpaid card orders, released on expiry or cancel | Yes | Integration |
| Late payment after cancellation flagged "refund due" | Yes | Integration |
| Two customers, last unit | Yes | Integration (one succeeds, one is refused) |
| Real refunds | **No.** Staff record the refund after making it in Paystack | n/a |

## Admin
Orders (status workflow, notes, refund record, print), prescriptions (assign, status with customer note, signed file links, file removal), enquiries, customers, products (editor, photos, bulk publish, CSV import/export), categories, stock adjustments with movement history, promotions and codes, delivery zones, services, articles with reviewer sign-off, FAQs, testimonials, reports with CSV, team and roles, settings, integrations, message log, audit log, staff two-factor sign-in. All pages load and are covered by role-permission tests; the order status flow and prescription access are exercised end to end.

## Security, privacy and quality
| | Status |
|---|---|
| Role permissions enforced on the server for every action | Tested |
| Prescription files only through short-lived, user-bound signed links; each opening logged | Tested |
| Uploads scanned (built-in checks; ClamAV supported when configured) | Tested against a fake clamd |
| Rate limits on sign-in, checkout, tracking, prescriptions, enquiries | Built; sign-in limits tested |
| Content-Security-Policy with per-request nonce | Built; verified by eye |
| Accessibility (axe, WCAG 2.1 AA, serious/critical) on 12 public pages and 4 console pages | Passes |
| Mobile: no horizontal scroll on 5 key pages, bottom navigation, full checkout | Passes (Pixel 7 profile) |
| Penetration test | **Not done** |
| Load test | **Not done** |
| Live Paystack payment | **Not done** (needs the pharmacy's Paystack account) |
| Real email, SMS, analytics providers | Built; **not verified against live accounts** |
| ClamAV daemon | Not bundled |
| Docker and Render files | **Untested examples** |

## Known limits
- Product photos: 13 of the 24 products carry the photographs supplied by the pharmacy (processed to WebP); 11 show "Photo coming soon". Permission to reuse the supplied photographs is not confirmed. No images were downloaded from third-party sites. See `docs/CATALOGUE_REGISTER.md`.
- Fonts: Outfit and Figtree are stand-ins if the brand's own typefaces are licensed.
- The site says "demonstration" wherever sample data appears; it must not be launched in demo mode.
