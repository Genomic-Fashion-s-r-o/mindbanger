## Production release (18 October 2026)

The personal site is live at https://www.mindbanger.com/ and the original Daily site at https://www.mindbanger.com/mindbanger_daily. The existing Mindbanger Vercel project was used; Sportbooster was not changed. `NEXT_PUBLIC_SITE_URL` is configured for production as `https://www.mindbanger.com`. Sources were deployed through the authenticated Vercel API because the current Git integration returns `git_info_fail` after the repository moved to the Genomic-Fashion-s-r-o organization; reconnect that existing Git integration before relying on automatic builds. No local .env files were uploaded.

## Daily URL migration (18 October 2026)

The personal presentation is served at `/`. The complete Daily page tree (including membership, B2B, auth and admin) lives under `/mindbanger_daily`. Previous page URLs redirect with 308 and retain query parameters; old root referral links go to Daily. External `/api` webhook/cron addresses and `/sw.js` remain operational; `/mindbanger_daily/api/*` aliases the same API. Assets and Next.js runtime files keep their shared URLs. The existing Supabase callback URL remains supported through the redirect. No engine data or subscriptions are moved or removed.

Verify the deployed origin with `BOOKING_TEST_ORIGIN=https://mindbanger.com node scripts/daily-routing-smoke.mjs`. Public reservations remain disabled until operator configuration and mail delivery are ready.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

## Personal site and appointments (October 2026)

The active checkout is this `mindbanger-landing` directory, which contains the existing Vercel project link. The nested `../mindbanger/mindbanger-landing` copy has not been edited.

- `/`: Miroslav Jobus personal presentation in Slovak.
- `/rezervacia`: free, nonbinding requests for an in-person adult appointment.
- `/rezervacia/sprava#<token>`: private appointment summary and cancellation. Tokens stay in the URL fragment, are sent in a POST body, and are stored hashed in the appointments table.
- `/mindbanger_daily/admin/rezervacie`: calendar, confirmations, moves, holidays, payment tracking, manual requests and settings. Requires an existing allowlisted admin account and MFA (`aal2`). Verify MFA on `/admin/dashboard` first.
- `/mindbanger_daily`: original landing page. `/app/*`, existing APIs, billing callbacks and engine schedules keep their routes. Original pages are marked `noindex` and excluded from the new sitemap, but remain accessible by direct URL.
- `/podmienky`, `/ochrana-udajov`, `/cookies`: separate personal-service policies; the original product policies remain at `/terms` and `/privacy`.

### Installation and activation

1. Install locked dependencies with `npm ci`.
2. The migration `supabase/migrations/20261007103443_personal_appointments.sql` was applied on 7 October 2026 to the verified Mindbanger database `ldjibcxqjbrjsmfppyoi.supabase.co` using its existing direct connection. `node scripts/booking-db.mjs` checks that exact target; `node scripts/booking-db.mjs --verify` tests the production schema using a rolled-back transaction and sends no email. The migration adds only `appointment_*` tables/functions and `appointments`; no engine tables are modified. Do not reapply it or apply it to Sportbooster/Real Games. Direct SQL application does not create a Supabase CLI migration-history entry; reconcile history before adopting `supabase db push` for this existing project.
3. Configure server-only `SUPABASE_SERVICE_ROLE_KEY`, existing Supabase public URL/key, `BREVO_API_KEY`, `CRON_SECRET`, and the correct `NEXT_PUBLIC_SITE_URL` for the deployed origin. Optional `BOOKING_FROM_EMAIL` defaults to `hello@mindbanger.com`; the sender must be verified in Brevo.
4. Deploy with the additional `/api/cron/appointments` schedule from `vercel.json` (every 15 minutes). Check the hosting plan supports that frequency. The endpoint requires `Authorization: Bearer <CRON_SECRET>`.
5. Sign into the existing admin, complete MFA, open **Kalendár a rezervácie → Nastavenia** and enter the verified company identity, register entry, registered and meeting addresses, public email/phone, hours and services. Save settings while reservations are still disabled. No business identity or contact has been invented.
6. Verify prices, actual professional qualifications and service scope, provider business authorization, GDPR processor agreements/regions and policy wording. The checkbox records the operator's review; it is not legal certification. Confirm prices and review, then enable requests. Unapproved prices are not published. Teen appointments, online sessions, online contracts, deposits and cancellation penalties are intentionally not offered in this first version.
7. Test an authorized real booking and notification delivery before advertising the calendar. Public routes fail closed when configuration or schema is missing. Live email delivery and real admin MFA require the actual configured environment.

### Operational behavior

Bookings occupy their duration plus a configurable buffer. PostgreSQL exclusion constraints enforce overlap protection for bookings and blocked time. Advisory locks serialize calendar mutations and settings changes. Slots use Europe/Bratislava including DST, notice and horizon limits. Pending requests expire after the configured hold (or before the appointment start). Rescheduling preserves the originally agreed duration, buffer and price. Only future pending appointments can be confirmed; completion/no-show are available after the start.

The client sends a stable request UUID; retries with the same request do not create another booking. Private management links arrive by email, including the original link on an idempotent retry. Email jobs are committed in the same transaction as the booking. Post-response processing and cron claim leased jobs, retry up to five attempts, and expose failed-job counts/retry in admin. Reminders are queued once per confirmed appointment start within 24 hours. Delivery is at least once; rare provider-success/database-failure cases can produce a duplicate email.

All scheduling tables have RLS enabled, no public/client grants and no client policies. Only the server service role can access them. All scheduling RPCs are security-invoker with an empty search path and execute grants restricted to the service role. New admin APIs check authentication and MFA on every request. Mutations require a same-origin POST. Public request limiting is persisted in the database (pseudonymized email/IP counters); customer fields and mail rendering are validated/escaped. There is no free-text medical field.

Maintenance removes mail snapshots after 30 days and booking contacts/private links after one year; invoice storage is separate. Security rate counters are removed after expiry. Keep the cron operational for reminders and retention.

### Verification

```bash
npm run test:booking
npm exec tsc -- --noEmit
npm run build -- --webpack
```

The booking tests use an isolated real PostgreSQL WASM runtime (PGlite). They do not connect to production or send emails. They cover configuration gates, availability, buffers, DST, anonymous permissions, overlap rejection, request idempotency, immutable agreed terms on moves, expiration, cancellation, mail leases and persistent rate limiting. Google font access is required for the existing `next/font` production build.

Legal sources reviewed: [psychological activity](https://static.slov-lex.sk/static/SK/ZZ/2025/242/20251001.print.html), [consumer protection](https://static.slov-lex.sk/static/SK/ZZ/2024/108/20260927.print.html), [GDPR](https://eur-lex.europa.eu/legal-content/SK/TXT/?uri=CELEX:32016R0679), and [alternative dispute resolution](https://www.mhsr.sk/obchod/ochrana-spotrebitela/alternativne-riesenie-spotrebitelskych-sporov-1). The actual content of sessions and operating permissions still determine the applicable legal regime.

## Client portal — phase 1 (18 October 2026)

The free Slovak portal starts at `/ucet`, with OTP login at `/prihlasenie`. It uses a light responsive layout, own upcoming appointments, the configured online service catalogue, editable profile and existing personal recordings. `/produkty/chut-na-sladke` is an informational coming-soon page and preserves an existing login. Payments, booking activation, product entitlements and lessons are deferred; no purchase button or fictional lesson access is exposed.

Daily is disabled through `DAILY_ENABLED=false`, legacy client redirects, checkout guards and cron guards. Its engine/admin/data remain. Existing subscriptions are neither canceled nor deleted; billing webhooks remain available. Only the appointment maintenance cron remains scheduled.

`20261018192946_client_portal_security.sql` was applied directly in a transaction to the verified Mindbanger database `ldjibcxqjbrjsmfppyoi` after an isolated PostgreSQL test and a rolled-back production-schema preflight. Do not blindly reapply it or the earlier manually applied booking migration. Profile reads require ownership or an allowlisted MFA admin; client writes cannot change roles, membership or Stripe IDs. Legacy organization writes are server-only, recordings admin access requires MFA, and webhook claims use a retryable lease. This is a scoped fix, not a claim of a complete legacy security audit.

The deployed app was upgraded to Next.js / eslint-config-next 16.4.2 with compatible dependency security updates. On 18 October 2026, `npm audit --omit=dev` reported zero vulnerabilities for this app. The full audit still reports 11 development-tool findings (braces / glob tooling, esbuild, selector parsing and mammoth's argument parser); do not use `npm audit fix --force`, which proposes incompatible downgrades. This result does not cover duplicate or legacy package manifests elsewhere in the repository.

Run `npx tsx --test scripts/client-portal.test.ts scripts/booking.test.ts`, ESLint and `npm run build -- --webpack`. The isolated tests cover genuine PostgreSQL RLS/grants, protected profile columns, admin MFA predicates, safe return paths, strict API input and webhook retry claims. HTTP smoke checks cover disabled checkout, unauthorized profile writes, cross-origin rejection and unsigned webhook rejection. `scripts/client-visual-fixture.tsx` renders presentation components offline; it does not add an authentication bypass to the app. Full human OTP delivery, an authenticated browser session and live billing events require separate verification; no test email or charge was sent.

## Original development instructions

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
