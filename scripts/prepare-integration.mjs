// Creates only a missing disposable integration restore database.
import { Client } from "pg";
import { randomBytes } from "node:crypto";
import { appendFile } from "node:fs/promises";
const source = new URL(process.env.TEST_DATABASE_URL ?? "");
if (!/^appointments_test/.test(source.pathname.slice(1)))
  throw new Error("An isolated test database is required");
const target = new URL(source);
target.pathname = "/appointments_test_restore";
const client = new Client({ connectionString: source.href });
await client.connect();
try {
  const exists = await client.query(
    "select 1 from pg_database where datname=$1",
    ["appointments_test_restore"],
  );
  if (!exists.rows.length)
    await client.query("CREATE DATABASE appointments_test_restore");
} finally {
  await client.end();
}
const variables = {
  RESTORE_DATABASE_URL: target.href,
  RESTORE_TARGET_CONFIRM: "appointments_test_restore",
  BACKUP_ENCRYPTION_KEY: randomBytes(32).toString("hex"),
  PG_DUMP_BIN: "/usr/lib/postgresql/18/bin/pg_dump",
  PG_RESTORE_BIN: "/usr/lib/postgresql/18/bin/pg_restore",
};
if (process.env.GITHUB_ENV)
  await appendFile(
    process.env.GITHUB_ENV,
    Object.entries(variables)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n") + "\n",
  );
console.log(
  "Disposable restore database prepared; encryption key kept private",
);
