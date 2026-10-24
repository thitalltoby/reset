# Reset Pharmacy: online pharmacy platform

Website, online shop and admin console for **Reset Pharmacy**: *a fresh start to feeling better.*

- **Public site:** home, About, Shop (catalogue, filters, search suggestions, basket, checkout, order confirmation and tracking), Pharmacy Services, Health & Wellness Centre, Questions & answers, Contact, delivery and returns, privacy notice, terms of sale.
- **Prescriptions:** customers send a photo or scan for a pharmacist to review. It is a request for review, not an order. Prescription medicines are never sold through the basket.
- **Customer accounts:** order history, saved addresses, favourites, prescription requests, data export and account closure, and email offers only if the customer opts in.
- **Payments:** Paystack (card, bank transfer, USSD) with server-side verification and a signed webhook, plus pay on delivery or collection. An order paid online is confirmed only after Paystack confirms the amount.
- **Admin console:** orders, prescriptions, enquiries, customers, products (with CSV import and export), categories, stock, promotions and codes, delivery zones, services, health articles, FAQs, testimonials, reports, team and roles, settings, integrations, message log and audit log.

Visual identity follows the supplied brand guide (Reset Green `#00B86B`, Soft Mint `#DDF7E9`, Deep Forest `#006B45`, Clinical Red `#E53935`; white-led layout).

> **Read first:** [`docs/IMPLEMENTATION_CHECKLIST.md`](docs/IMPLEMENTATION_CHECKLIST.md) says what is built, what is tested and what is not. [`docs/LAUNCH_DEPENDENCIES.md`](docs/LAUNCH_DEPENDENCIES.md) lists what the pharmacy must supply, confirm or approve before launch.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript (strict) · PostgreSQL 16 · Prisma 7 · Tailwind 4 · zod · vitest · Playwright with axe.

## Run it locally

```bash
createdb reset                       # PostgreSQL 16, empty database
cp .env.example .env                 # set DATABASE_URL and APP_SECRET (openssl rand -base64 48); set SITE_MODE="demo" for the sample shop
npm ci
npx prisma generate
npx prisma migrate deploy
SITE_MODE=demo SEED_DEMO_USERS=true npm run db:seed    # the 24 Reset Pharmacy products plus sample data and development accounts (never in production)
npm run dev                          # http://localhost:3000
```

Development sign-ins (created only outside production): `admin@reset.local`, `manager@`, `pharmacist@`, `staff@`, `editor@` and `customer@reset.local`, all with password `DevPassword-123`. Admin sign-in is at `/admin/login`.

### Demo mode and live mode

| | `SITE_MODE=demo` | `SITE_MODE=live` (default) |
|---|---|---|
| Catalogue | Clearly labelled sample products | Only real products |
| Services | Sample services shown | Only services staff mark **confirmed** |
| Health articles | Drafts shown | Only articles **reviewed by a named professional** |
| Testimonials | Only approved ones | Only approved ones |
| Policies | Draft banner until a legal review date is recorded | Same |
| Search engines | `robots.txt` blocks everything | Sitemap and indexing allowed |

A banner on every page says when the site is a demonstration. To go live: `npm run demo:clear`, set `SITE_MODE=live`, import the real catalogue, complete Settings. Full steps are in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

### Payments

Set `PAYSTACK_SECRET_KEY` (or save it under Admin → Integrations → Paystack), set the Paystack webhook URL to `<site>/api/webhooks/paystack`, then switch on card payment in Settings → Shop. The automated tests use a local stand-in for Paystack (`tests/support/mock-paystack.ts`). **It proves nothing about live payments.** Run a real test-mode payment with Paystack's test cards before using live keys.

## Tests

```bash
npm run typecheck
npm test                 # 87 unit and integration tests (uses the reset_test database)
npm run build && npm run test:e2e    # 25 browser tests incl. accessibility scans (builds first)
```

The tests use a separate database (`reset_test`); the helper refuses to run against anything else.

## Scripts

`npm run admin:create` (create or reset a Super Admin) · `npm run admin:reset-mfa` · `npm run demo:clear` · `npm run worker` (background jobs: email, expiry of unpaid orders, integrations; or call `POST /api/jobs/run` with `CRON_SECRET` every minute).

## Catalogue and product photographs

The 24 Reset Pharmacy products live in `src/content/reset-catalogue.ts`; photographs are in `public/products/` (lossless masters and the processing log in `assets/product-masters/`). `npm run catalogue:report` regenerates `docs/CATALOGUE_REGISTER.md` (sources, rights, information status, open items). Prices are provisional and label information is shown to customers only once verified; both are gated in the admin console. If Prisma's schema engine cannot be downloaded (restricted network), apply `prisma/migrations/*/migration.sql` with `psql` and run `prisma generate`.
