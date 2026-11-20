# Recovery, messages, payments and restoration — 20 November 2026

## Delivered and activation state

| Area | Implementation | Live activation requirement |
| --- | --- | --- |
| Password recovery | `/forgot-password` and `/reset-password`; 256-bit random secret in a URL fragment; only its SHA-256 digest is stored in the reset table; email payload encrypted with AES-256-GCM; 15-minute expiry; one successful reset invalidates all outstanding links and prior sessions; uniform responses, bounded hashing and shared IP/account throttling | Resend sending key and a sender on a verified domain |
| Booking messages | PostgreSQL trigger inserts an outbox record atomically with a booking change; monotonically increasing message versions; stale events skipped; shared worker leases; stable provider idempotency keys; bounded retries; reminders use Africa/Blantyre time; provider operations page shows processing status | Same email configuration, plus the protected scheduled job |
| Online payments | PayChangu hosted checkout; server-selected stored booking amount and MWK currency; an explicit merchant/provider mapping; signed raw-body webhooks; independent API verification of reference, amount, currency, mode and success; duplicate callbacks cannot duplicate collection records; provider reconciliation controls | Authorized PayChangu merchant, API key, webhook secret, mode and the merchant's provider ID |
| Independent restoration | Encrypted, authenticated logical export; snapshot-consistent table digests; direct connection only; restore requires a different empty target; original sessions/reset tokens excluded; table contents, overlap constraint and restored application checked | Restore drill passed; retain the archive and export its decryption key separately from Vercel to a private password manager |

The connected project had no email or payment credentials when inspected. Recovery returns an explicit unavailable response while sending is unconfigured. Checkout is hidden and rejected for unconfigured professionals. No customer emails, payment charges, payouts or fabricated financial records were sent to external services during implementation. Payment HTTP responses in integration tests are mocks against an isolated PostgreSQL database.

A gateway-confirmed live payment is a collection record, not independent evidence of a bank payout. Test payments remain `verified_test` and do not increase collections. Refunds, disputes, merchant verification and bank settlement reconciliation remain gateway operations. The merchant binding deliberately supports one configured professional; other professionals cannot collect into that merchant account. Do not assign a platform merchant to unrelated professionals.

## Configuration

Set production values in the Appointments-Booker Vercel project. Use independent test keys for Preview. Never paste credentials into Git or a browser query string.

| Variable | Value |
| --- | --- |
| `RESEND_API_KEY` | Sending key for this application |
| `EMAIL_FROM` | Sender on your verified domain, e.g. `BookingPro <bookings@your-domain>` |
| `CRON_SECRET` | At least 32 random bytes; Vercel attaches it as a bearer token to the scheduled request |
| `PAYCHANGU_SECRET_KEY` | Merchant secret key; test first |
| `PAYCHANGU_WEBHOOK_SECRET` | Dashboard webhook HMAC secret |
| `PAYCHANGU_MODE` | `test` or `live`; verification must return the same mode |
| `PAYCHANGU_PROVIDER_ID` | The professional's actual `/book/:providerId` identifier; set only after ownership and merchant authorization are confirmed |
| `BACKUP_ENCRYPTION_KEY` | 32 random bytes encoded as 64 hex characters, retained separately from the database; generated and stored as an encrypted production setting for this backup |

Configure the PayChangu webhook URL as `https://appointments-booker-pi.vercel.app/api/payments/webhook`. Checkout returns to `/payment-return`; a redirect alone never marks a payment paid. The original guest browser or the booking account must still have access for callback readback. The signed webhook can verify independently of the browser session.

The message job is `GET /api/jobs/messages`, protected by `Authorization: Bearer <CRON_SECRET>`. Successful writes also schedule a bounded dispatch through Vercel `waitUntil`. A job processes up to 20 messages with four workers; it must finish within the function's 60-second limit. Provider acceptance is displayed separately from inbox delivery. A scheduler must invoke the protected job regularly for retry/reminder guarantees; the supplied daily Vercel schedule fits Hobby. Higher volumes or tighter retry times require an authorized more frequent scheduler. There is no SMS or push adapter in this revision.

Before treating delivery as active, verify one real reset email, token expiry/replay, old-session rejection, a booking update, a reminder and a failed-send retry. Before treating payments as active, verify a sandbox checkout, invalid signature, mismatched amount/mode/currency/reference, repeated callback and a controlled authorized live collection; reconcile the corresponding gateway/bank evidence. Those external tests have not been performed without the service credentials.

## Backup and restore

`docs/production-restore-2026-11-20.json` records the actual production export and restoration. The encrypted archive is `Appointments-Booker-2026-11-20.booker-backup`; its key is the project's encrypted `BACKUP_ENCRYPTION_KEY` setting. Retain a separate private copy of that key. No decryption key or plaintext database export is committed to Git.

The production export contained 14 application/migration tables, 1 accounts, 0 providers and 0 appointments at the snapshot. All table digests matched on an independent empty PostgreSQL 18.7 instance. The restored copy then accepted the operational migration, returned healthy PostgreSQL status, rejected anonymous account access and passed isolated registration/session readback. The additional fixture suite restores populated booking data and proves the overlap constraint still rejects a conflicting booking. Production customer records were not created or changed by these drills.

```sh
# Use PostgreSQL clients and a restore server at least as new as the source.
# Supply secret values through a private environment, not command arguments.
DATABASE_URL_UNPOOLED=... BACKUP_ENCRYPTION_KEY=... node scripts/backup.mjs create /private/new.booker-backup
RESTORE_DATABASE_URL=... RESTORE_TARGET_CONFIRM=empty_recovery_db BACKUP_ENCRYPTION_KEY=... node scripts/backup.mjs restore /private/new.booker-backup
```

The script uses `pg_dump` and `pg_restore` from PATH, or `PG_DUMP_BIN` / `PG_RESTORE_BIN`. Neon TLS uses certificate/hostname verification and the system CA store. Override `PGSSLROOTCERT` only with a trusted CA path. Source and destination must be direct endpoints, never the pooled host.

Restoration never uses `--clean`, never overwrites a non-empty database and never restores sessions, login throttles or active password-reset tokens. It preserves booking/account data and queued operational history. Keep delivery jobs and gateway keys disabled on a restored copy until pending payments/messages have been reconciled. The archive authenticates its manifest and ciphertext. A wrong key, modified archive, old restore engine or occupied target must fail.

This is a verified recovery point and reusable restore procedure, not a claim of scheduled offsite backups or a defined RPO/RTO. Set a retention schedule and perform recurring restore drills before promising those service levels.

## Verification

- TypeScript, 24 HTTP/query/security regression tests and production build.
- 20 PostgreSQL integration tests, including recovery/session revocation and a login/reset race, queue atomicity/shared leases/retry/stale-event checks, payment matching/test-mode separation/webhook authenticity, HTTP ownership and a populated encrypted restore.
- Hosted source-backup restore evidence is separate from mocked email/payment tests.
- CI prepares an independent disposable restore database and installs PostgreSQL 18 clients. A failed runner startup is not a test result; inspect the exact run separately.

## Implementation references

- [OWASP password recovery guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
- [Resend API](https://resend.com/docs/api-reference/emails/send-email) and [24-hour idempotency window](https://resend.com/docs/dashboard/emails/idempotency-keys)
- [PayChangu checkout](https://developer.paychangu.com/docs/standard-checkout), [verification](https://developer.paychangu.com/docs/transaction-verification) and [webhook signatures](https://developer.paychangu.com/docs/webhooks)
- [PostgreSQL restore](https://www.postgresql.org/docs/18/app-pgrestore.html) and [minor-version compatibility change](https://www.postgresql.org/message-id/E1xQQFr-000000003OT-3txh@gemulon.postgresql.org)
