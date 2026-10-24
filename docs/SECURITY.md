# Security and privacy notes

**Not independently tested.** This is a record of what the code does, not a certificate. Commission a penetration test before launch.

- **Authentication:** passwords hashed with bcrypt; staff sessions 12 hours, customer sessions 14 days; sessions stored hashed; staff two-factor (TOTP) with recovery codes, enforceable for all staff.
- **Authorisation:** every server action and page checks the permission for the role, server-side. Tests assert which roles hold which permissions.
- **Prescriptions and health data:** files stored outside the web root; served only through signed links bound to one user and expiring in five minutes; each opening of a prescription is recorded in the audit log; staff alerts and emails carry references only, never prescription content; files can be removed once a request is closed.
- **Payments:** card details never reach this site (Paystack hosts the payment page). Orders are marked paid only after the server asks Paystack and the amount and currency match. The webhook requires a valid HMAC-SHA512 signature and is idempotent.
- **Uploads:** type allow-list, size limit, signature check, scanning (built-in; ClamAV when configured). Unscanned or errored files are held and never served.
- **Web:** per-request CSP nonce, secure cookies over HTTPS, rate limits on sign-in, checkout, tracking, prescriptions and enquiries, SSRF guard on outbound integrations (local addresses refused in production), HTML in articles is sanitised.
- **Privacy:** marketing consent is opt-in and stored with its date; customers can export their data and close their account; abandoned baskets expire after 60 days.
- **Secrets:** integration credentials encrypted at rest (AES-256-GCM) with a key derived from `APP_SECRET`; losing or changing `APP_SECRET` makes stored secrets unreadable.
- **Known gaps:** no penetration test, no load test, ClamAV not bundled, no automated backup (configure at the host), no WAF.
