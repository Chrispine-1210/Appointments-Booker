# Vercel and Neon configuration — 20 November 2026 (Malawi)

## Dedicated resources

- Vercel project: `appointments-booker` (`prj_3QVqjnwV3Dy8kS7EGlqT3EYAaizU`), linked to `Chrispine-1210/Appointments-Booker`.
- Production origin: `https://appointments-booker-pi.vercel.app`.
- Neon project: `appointments-booker` (`flat-breeze-25708844`), PostgreSQL 18, Frankfurt.
- Production database branch: `main` (`br-mute-butterfly-b9gp09c3`).
- Isolated PR verification branch: `preview-pr5-verification` (`br-orange-band-b9iv8e7e`). It was branched after migrations and before any accounts existed.

Both resources use the connected account's free plans. No paid upgrade was requested. Do not reuse another project's credentials or point previews at the production database.

## Runtime configuration

`vercel.json` builds the Vite client into `dist/public`, serves assets from the CDN, routes API requests to `api/index.js`, and sends client routes to `index.html`. The Node 22 function runs in Frankfurt with a 30-second request limit. It initializes one Express app per warm instance, reuses its database pool, and retries initialization after a failed cold start. The build bundles the server into `dist/serverless.mjs` so Node can resolve all internal TypeScript imports and aliases. Initialization failures return a generic HTTP 503 without exposing credentials.

The production environment contains sensitive `DATABASE_URL`, `DATABASE_URL_UNPOOLED` and `SESSION_SECRET`, plus canonical `APP_ORIGIN` and `TRUST_PROXY=1`. Runtime uses Neon's pooled connection; migrations use its direct endpoint. Preview database variables are scoped to `agent/booking-foundation-20261119` and use the isolated database branch. Preview has a separate session secret.

For previews, `server/vercel.ts` derives the canonical origin from Vercel's trusted `VERCEL_URL` when `APP_ORIGIN` is absent. Open the deployment's exact generated hostname for write operations; alternate branch aliases are not accepted as origins. Production always uses its explicitly configured origin. Request Host headers never configure the allowed origin.

## Schema evidence

The database was confirmed empty before migration. Workspace DNS could not resolve the Neon endpoint, so the two reviewed migration files were applied through the connected Neon SQL service in one transaction, guarded by an advisory lock and a pristine-database assertion. Drizzle's migration hashes and timestamps were recorded exactly as its migrator would record them:

| Migration | SHA-256 | Journal timestamp |
| --- | --- | --- |
| `0000_initial` | `5bab34f90da65b94a7fd690d9753ecf4dd8f545bdabd4e8f16769ca11c4a8b35` | `1795097210119` |
| `0001_booking_integrity` | `86a0f89922207ab32ebf0c51b43a0a5fd5771d12c910461c2890792db2bd9e4a` | `1795097210517` |

Readback confirms schema version 1, both migration journal rows, the exclusion constraint `appointments_no_overlap`, the composite service/provider foreign key and the valid-interval check. Production has zero users and providers at initialization. No sample records or default passwords were inserted.

Future migrations should use `npm run db:migrate` with the direct connection from a host that can resolve Neon. Review changes and recovery requirements before applying them. Builds do not automatically migrate a database.

## Verification status

- TypeScript, 21 regression tests and production build pass with the Vercel entry point included.
- The earlier 13-test real PostgreSQL integration suite and database restart evidence remain in `ENGINEERING_BASELINE.md`.
- Live deployment and runtime checks are pending for this source revision.
- No merge has been performed. Backup restoration, email verification/recovery, delivery services, payments and professional credential verification remain outstanding.
