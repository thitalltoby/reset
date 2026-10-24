# Deployment

The Docker and Render files in this repository are **untested examples**. Check them against your host's current documentation.

## Requirements
Node 20.12+ (22 recommended) · PostgreSQL 16 · persistent disk for uploads (`STORAGE_DIR`) · HTTPS in front (the app sets secure cookies when `APP_URL` is https) · a scheduler or the worker process.

## Steps
1. Set environment variables (see `.env.example`): `DATABASE_URL`, `APP_SECRET` (random, 32+ chars, keep it safe), `APP_URL` (public https address), `SITE_MODE`, `EMAIL_FROM` and an email provider, `PAYSTACK_SECRET_KEY`, `CRON_SECRET`, `TRUST_PROXY=true` only behind a trusted proxy.
2. `npm ci && npx prisma generate && npm run build`
3. `npx prisma migrate deploy`
4. First admin: `SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD='a-long-password' npm run db:seed` (or `npm run admin:create`). In production no development accounts are created.
5. `npm run start`. Health check: `GET /api/health`.
6. Background jobs every minute: run `npm run worker`, or have a scheduler `POST /api/jobs/run` with header `Authorization: Bearer <CRON_SECRET>`. These send email, expire unpaid orders, and retry integrations.
7. In Paystack, set the webhook URL to `<APP_URL>/api/webhooks/paystack`.
8. Back up the database and the uploads volume; test a restore.

## Going live from a demo
`npm run demo:clear` → `SITE_MODE=live` → import the real catalogue → complete Settings → record the policy review → see `docs/LAUNCH_DEPENDENCIES.md`.

## Do not
- Do not run the app with `NODE_ENV=test`: it is the only mode that lets the payment code call a local stand-in.
- Do not point tests at the live database.
