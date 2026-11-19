# Engineering baseline — 19 November 2026 (Malawi)

Baseline inspected: `fe4737a0220df728fe6327cae20fcda258ef23ed` on `main`.

## Findings and changes in this branch

| Area | Observed baseline | Change |
| --- | --- | --- |
| Installation | `npm ci` failed on unused Tailwind v4/Vite integration and incompatible Node types | Remove unused integration; align Node types and runtime requirements |
| Identity | `/api/auth/user` always returned `demo-user`; middleware skipped authentication outside Replit | Return stored authenticated principal; reject absent/expired sessions everywhere |
| Provider isolation | Private lists and writes did not check provider ownership | Bind new profiles to session subject; validate stored owner for private operations |
| Personal information | Response bodies were logged | Log method, path, status, duration only; redact unexpected errors |
| Booking integrity | Check and insert separated by asynchronous calls; incomplete availability filtering | Check and insert synchronously in development memory; account for full service duration, cancelled records, opening hours, rescheduling |
| Financial integrity | Public appointment payload accepted payment status and amount | Reject financial fields; derive service price and pending payment state on server |
| Query parameters | Dates in query keys were never sent to API | Serialize query parameters; include selected service in public availability request |
| API failures | Error handler rethrew errors; unknown APIs fell through to HTML | Return redacted JSON errors and API 404s without terminating the process |
| Persistence | Class named `DatabaseStorage` actually held Maps; unused DB import required DATABASE_URL | Rename to MemoryStorage, remove unused connection, fail production startup explicitly |
| Verification | No application quality workflow or tests | Add HTTP regressions and Node 22 typecheck/test/build workflow |
| Documentation | Claimed 20+ fully functional pages and production readiness | Document actual capabilities and limitations |

## Evidence boundary

The HTTP test adapter provides identities only inside the test fixture; no application endpoint accepts a subject header. The tests prove local route behavior and single-process conflict exclusion. They do not prove identity-provider callbacks, refresh, durable sessions, multi-instance concurrency, delivery of messages, payments, backup restoration or production readiness.

No live database was changed. `migrations/0001_provider_ownership.sql` is additive preparation and has not been executed. It assumes a reviewed baseline schema. Existing providers must be assigned through a trusted, audited process; do not claim providers by matching an email address.

Generated bundles are removed from version control to prevent stale code from being shipped. The source build still reports a large JavaScript bundle warning. Route splitting is a later performance task.

## Next implementation sequence

1. **Durable booking engine:** implement PostgreSQL storage; establish baseline migrations and foreign keys; enforce appointment overlap with a PostgreSQL exclusion constraint or equivalent transaction-safe database control; verify parallel requests across separate processes; prove persistence after restart and a restore into an empty target.
2. **Real provider and client journeys:** choose the deployment identity provider, validate OIDC login/logout/refresh against the intended host, add provider onboarding, replace hardcoded provider `1` across protected pages, and add client-to-appointment ownership for personal booking history, confirmation lookup, cancellations and verified reviews.
3. **Operational delivery:** implement or remove placeholder messaging/calendar/notification flows; configure transactional email and reminders; add abuse controls and audit trails; test browser journeys, deploy an exact-commit preview, then verify production configuration and recovery.

Only after these foundations should commercial packaging claim a dependable scheduling service. Bookings and quoted service prices do not establish collected revenue; the payment workflow is not implemented.

## Verification on this branch

- Clean `npm ci --ignore-scripts`: PASS. No peer-dependency override used.
- `npm run verify`: PASS — TypeScript, 19/19 HTTP/query regressions, source production build.
- Development entrypoint smoke: `/`, `/find`, `/api/providers` HTTP 200; unauthenticated `/api/auth/user` HTTP 401; unconfigured `/api/login` HTTP 503; unknown API HTTP 404.
- Built production entrypoint: refuses MemoryStorage as intended. Dev-only Vite integrations are eliminated from the production bundle.
- `git diff --check`: PASS.
- `npm audit --omit=dev`: 4 remaining package findings — 3 high (drizzle-orm, zod, zod-validation-error) and 1 moderate (qs), down from 19 (including 1 critical) before compatible updates. Full dependency audit additionally reports development-tool findings. This is not a clean security audit. Plan and verify the required core-library migrations and remaining transitive updates before deployment; no forced major-version upgrade was applied.
- Live OIDC, PostgreSQL, browser journeys, GitHub executable CI and deployed runtime: not certified by this local evidence.
