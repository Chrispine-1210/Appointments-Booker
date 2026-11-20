# BookingPro / Appointments-Booker

An appointment scheduling application built with React, TypeScript, Express, PostgreSQL and Drizzle.

## Implemented

- Email/password registration and login, salted scrypt credentials, session rotation, database-backed session invalidation and shared login throttling.
- Transactional provider onboarding: professional details, working hours and a first service are saved together.
- Provider context derived from the authenticated account throughout the dashboard, settings, tasks, memos, booking form and calendar.
- PostgreSQL persistence for accounts, credentials, sessions, profiles, services, appointments, tasks, memos and reviews.
- Database-enforced booking intervals, matching services, opening hours and overlap exclusion across independent application processes.
- Client booking history and session-protected guest confirmations. Collections remain separate from unpaid booking values.

## Local setup

Use Node.js 22.12 or later and PostgreSQL with the `btree_gist` extension available.

```sh
npm ci
cp .env.example .env
```

Set `DATABASE_URL` in `.env` to the application database. Set `DATABASE_URL_UNPOOLED` for migrations when the application URL is pooled. Run:

```sh
npm run db:migrate
npm run dev
```

Open `http://localhost:5000/login`, create your account, complete onboarding, then use the dashboard. No preset accounts or passwords are shipped. Public provider discovery is at `/find`; the public booking page is `/book/:providerId`.

Without `DATABASE_URL`, development uses explicit, volatile sample storage. Production requires PostgreSQL and never falls back to memory. Empty PostgreSQL databases contain no sample customers or fabricated bookings.

The migrations establish a fresh baseline. An existing database with an untracked schema requires an adoption review before these migrations are applied. The application validates schema readiness at startup and does not run migrations automatically.

## Production configuration

Required variables:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL application connection; Neon keeps the existing serverless driver |
| `DATABASE_URL_UNPOOLED` | Direct migration connection, when the application URL is pooled |
| `SESSION_SECRET` | Stable, random secret of at least 32 characters, shared across workers |
| `APP_ORIGIN` | Exact public HTTPS origin, without path or trailing slash |
| `TRUST_PROXY` | Trusted proxy hop count; defaults to one in production |
| `PORT` | Application port; defaults to 5000 |

Generate a secret locally with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and store it in the deployment environment.

```sh
npm run build
npm start
```

Production checks require a migrated database, the overlap constraint, a strong secret and an HTTPS origin. Configure the reverse proxy hop count for the actual deployment network. Build output is generated from source and ignored by Git.

Vercel serves `dist/public` and routes `/api/*` to the shared Node function in `api/index.js`. See [deployment configuration and cloud evidence](docs/VERCEL_DEPLOYMENT.md). Keep preview credentials isolated from production. Migrations run separately from builds.

## Verification

```sh
npm run verify
# Dedicated disposable database; name must begin appointments_test:
TEST_DATABASE_URL=postgresql://.../appointments_test npm run test:postgres
npm audit --omit=dev
```

`npm run verify` runs TypeScript, 24 HTTP/query/security regressions and the production build. The PostgreSQL suite adds 15 integration tests, including separate API processes, application restart, persistent sessions, onboarding rollback, guest privacy, logout replay and secure production cookies. CI provisions PostgreSQL and runs both suites plus the production dependency audit.

See [the verification record](docs/ENGINEERING_BASELINE.md).

The complete public and private interface is documented in [interface completion and browser checks](docs/INTERFACE_COMPLETION.md), including client and provider workspaces, availability-backed booking changes, service management, calendar downloads and responsive navigation. Run `npm run dev:fixture` only for an isolated visual review with fictional in-memory data; it never connects to PostgreSQL and is not a production entry point.

## Remaining delivery work

The app is deployed at [appointments-booker-pi.vercel.app](https://appointments-booker-pi.vercel.app/login), using the dedicated Neon production database. The isolated preview passes live login, onboarding, booking, security and redeployment-persistence checks; see the deployment record for source revisions and evidence. Create your own account at `/login` and complete provider onboarding. No default production accounts or passwords exist. Email verification, password recovery, transactional messages, reminders, payment processing and verified review submission remain delivery work. The messages and notifications pages clearly show that those services are unavailable. Working times and displayed prices currently use Malawi time and MWK.

The production dependency audit is clean for this lockfile. Four moderate findings remain in development-only tooling, and routes now load in separate chunks with an initial JavaScript entry of approximately 286 KB. These results do not certify a full production security review or backup restoration.
