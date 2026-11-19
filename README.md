# BookingPro / Appointments-Booker

An appointment scheduling prototype built with React, TypeScript, Express, and Drizzle schema definitions.

**Current status: development prototype. Application records are stored in memory and disappear on restart. Production startup is blocked until durable storage is implemented.** A database URL alone does not change this.

## Local development

Use Node.js 22.12 or later.

```sh
npm ci
npm run dev
```

Open `http://localhost:5000`. Set `PORT` to change the port. Public discovery and booking pages work without a database. Private APIs return HTTP 401 until real authentication is configured; `/api/login` returns HTTP 503 with configuration guidance when unavailable.

See `.env.example` for configuration variable names. The current sign-in adapter requires a genuine Replit OIDC application (`REPL_ID`, `REPLIT_DOMAINS`). There is no demo identity or development authentication bypass. PostgreSQL sessions require the `sessions` table and a strong session secret in production; development sessions use an ephemeral process secret when none is supplied.

## Verification

```sh
npm run check
npm test
npm run build
# Or all three:
npm run verify
```

The tests use isolated in-memory storage and an injected test authentication adapter. They exercise the real HTTP routes, including anonymous denial, provider ownership, record mutation, public booking validation, payment-field rejection, concurrent overlap, cancellation, rescheduling, and error recovery. They do not certify live OIDC or PostgreSQL behavior.

Generated `dist` output is ignored. Deployments must build from source. `npm start` deliberately refuses the current volatile storage implementation.

## Access model

- Public: provider discovery, profiles, services, opening times, availability, reviews, appointment creation, and health status.
- Authenticated provider owner: appointments, memos, tasks, analytics, service creation, profile changes, and rating recalculation.
- New provider ownership comes from the verified session subject. Client-supplied ownership is rejected. Existing sample records remain unowned.
- Public bookings use the provider's active service and price. Clients cannot mark a booking as paid. Overlap checks are atomic within one Node.js process only.
- Review submissions remain unavailable until client-to-appointment ownership is implemented.

## Known delivery gaps

The interface includes pages for messages, notifications, calendar, reviews, and personal bookings that are incomplete or use placeholder data. Several provider screens still refer to sample provider `1`; the API denies access to that unowned sample instead of granting access to arbitrary users. Confirmation lookup, personal booking history, provider onboarding and dynamic provider context require implementation. Email, reminders, payments, maps and production deployment are not verified.

See [the engineering baseline](docs/ENGINEERING_BASELINE.md) for evidence and the next implementation sequence. The previous README's claims of a fully functional production platform were not supported by the source.
