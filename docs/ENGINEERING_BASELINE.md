# Implementation and verification — 19 November 2026 (Malawi)

## Delivered in PR #5

| Requirement | Implementation | Evidence |
| --- | --- | --- |
| Durable PostgreSQL | Drizzle migrations; PostgreSQL CRUD for all application records; PostgreSQL sessions; startup schema checks | Real PostgreSQL 18.6 integration tests; application restart; database-service stop/start preserves record counts |
| Real login | Email/password registration and login; salted scrypt (N=32768, r=8, p=3); bounded hashing concurrency; generic credential errors; atomic shared account/IP throttling; session rotation and logout invalidation | Real HTTP login, invalid credentials, forged-header rejection, multi-worker logout replay, HTTPS secure-cookie tests |
| Provider onboarding | One transaction creates the owned profile and first service; unique account ownership; opening-hour and service validation | Successful onboarding; duplicate conflict; rollback when service insertion fails |
| Dynamic provider context | Authenticated user response supplies providerId; protected routes gate onboarding; all provider-specific screens and writes use the account's ID | Two distinct provider accounts isolated across independent API processes; source scan finds no hardcoded provider API IDs or sample practitioner names in client code |
| Four production dependency findings | Upgrade Drizzle ORM to 0.45.4 and Zod to 4.6.7 with compatible Drizzle-Zod and form resolver; remove unused zod-validation-error; update Express qs dependency | `npm audit --omit=dev`: zero findings |

## Booking integrity

The PostgreSQL exclusion constraint rejects overlapping half-open intervals for the same provider. Adjacent bookings are permitted; cancelled bookings release their intervals. A trigger derives timestamp intervals, validates the provider/service relationship, duration and opening hours, and sets new bookings to the service's price with pending payment status. A composite foreign key protects service/provider consistency. Ownership cannot be reassigned through updates.

API tests submit concurrent overlapping requests through two separate application processes in four batches of six competing requests. Every batch requires exactly one HTTP 201 and five HTTP 409 responses. Confirmed deadlock/serialization rollbacks receive at most two retries; an exhausted retry budget returns HTTP 503. Network errors with an unknown commit outcome are not automatically retried. A separate test forces a real PostgreSQL deadlock and verifies rollback before retry. Rescheduling conflicts preserve the original booking. These checks use real PostgreSQL, not an in-memory database emulator.

Provider ownership comes from the signed-in account ID. Credentials are stored separately from public user records. Client booking history is scoped to the authenticated creator; guest confirmation access is scoped to the guest's persisted session. Request headers cannot manufacture an identity. Cross-origin writes are rejected, and authentication responses and private reads use no-store caching.

## Verification results

- Clean installation without a peer-dependency override.
- TypeScript: PASS.
- Regression suite: 21/21 PASS.
- PostgreSQL integration suite: 13/13 PASS.
- Production build: PASS; large client bundle warning remains.
- Drizzle migration metadata check: PASS.
- Migration replay: PASS.
- Application process restart: stored memo, account and session readback PASS.
- PostgreSQL service stop/start: users, providers, appointments, sessions and memos retained; exact before/after counts are recorded in `verification-2026-11-19.json`.
- Production dependency audit: 0 critical, 0 high, 0 moderate, 0 low.
- Full dependency audit: 4 moderate findings in development-only tooling; 0 high/critical.
- Whitespace check: PASS.

The PostgreSQL suite uses an isolated local database. It does not certify a live Neon endpoint or a deployed hosting environment. As of this 19 November baseline, no external database migration, production deployment or merge was performed. Later cloud configuration and verification are tracked separately in [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md). Browser interaction testing and backup/restore testing remain unverified by this local suite.

## Activation requirements and limitations

Supply the intended application's `DATABASE_URL`, direct migration URL where needed, stable `SESSION_SECRET`, canonical HTTPS `APP_ORIGIN`, and correct proxy hop count. Apply the reviewed migrations before starting the application. There was no matching configured Neon project or database URL when this baseline was prepared; unrelated project credentials were not reused. The 20 November deployment record documents the dedicated resources subsequently provisioned.

Provider registration is self-service and does not establish verified professional credentials or verified ownership of an email address. Email verification, account recovery, transactional email, automatic reminders, payment settlement, verified reviews and operational audit trails require further implementation. The UI no longer fabricates conversations, notification events or booking trend figures. Booking values are not presented as settled collections.

The previous foundation's GitHub Actions run failed with zero executable steps. The updated branch's provider checks must be assessed at its new commit; locally passing tests do not establish GitHub-hosted execution.
