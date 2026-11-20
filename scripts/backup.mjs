// Read-only logical export and empty-target restore. No source writes, no --clean.
import { Client } from "pg";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import assert from "node:assert/strict";
const excluded = new Set([
  "public.sessions",
  "public.auth_attempts",
  "public.password_resets",
]);
function connection(value) {
  const url = new URL(value ?? "");
  assert(["postgresql:", "postgres:"].includes(url.protocol));
  assert(
    !url.hostname.includes("-pooler"),
    "Backup/restore requires a direct endpoint",
  );
  if (url.hostname.endsWith(".neon.tech"))
    url.searchParams.set("sslmode", "verify-full");
  return url;
}
function cliEnv(url) {
  return {
    ...process.env,
    PGHOST: url.hostname,
    PGPORT: url.port || "5432",
    PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGSSLMODE: url.searchParams.get("sslmode") ?? "prefer",
    PGCONNECT_TIMEOUT: "20",
    ...(url.searchParams.get("sslmode") === "verify-full"
      ? { PGSSLROOTCERT: process.env.PGSSLROOTCERT ?? "system" }
      : {}),
  };
}
async function run(binary, args, url) {
  await new Promise((resolve, reject) => {
    const p = spawn(binary, args, {
      env: cliEnv(url),
      stdio: ["ignore", "ignore", "pipe"],
    });
    let message = "";
    p.stderr.on("data", (b) => {
      message += b;
    });
    p.once("error", reject);
    p.once("exit", (code) =>
      code === 0
        ? resolve()
        : reject(
            new Error(
              `${binary} failed (${code}). Inspect the database permissions and client/server versions.`,
            ),
          ),
    );
  });
}
const canonicalize = (value) =>
  Array.isArray(value)
    ? value.map(canonicalize)
    : value && typeof value === "object"
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, canonicalize(value[key])]),
        )
      : value;
const quoted = (value) => '"' + value.replaceAll('"', '""') + '"';
async function inventory(client, emptyExcluded = false) {
  const tables = (
    await client.query(
      "select schemaname,tablename from pg_tables where schemaname not in ('pg_catalog','information_schema') order by schemaname,tablename",
    )
  ).rows;
  const result = [];
  for (const t of tables) {
    const name = `${t.schemaname}.${t.tablename}`;
    if (emptyExcluded && excluded.has(name)) {
      result.push({ name, count: 0, hash: createHash("sha256").digest("hex") });
      continue;
    }
    const rows = await client.query(
      `select row_to_json(t)::text as row from ${quoted(t.schemaname)}.${quoted(t.tablename)} t`,
    );
    // Hash canonical records independently of physical row order. No record data is logged.
    const canonical = rows.rows
      .map((r) => JSON.stringify(canonicalize(JSON.parse(r.row))))
      .sort();
    result.push({
      name,
      count: canonical.length,
      hash: createHash("sha256").update(canonical.join("\n")).digest("hex"),
    });
  }
  return result;
}
export async function backup(sourceValue, output, keyHex) {
  const source = connection(sourceValue);
  assert(
    /^[a-f0-9]{64}$/i.test(keyHex ?? ""),
    "BACKUP_ENCRYPTION_KEY must contain 32 random bytes as hex",
  );
  const client = new Client({
      connectionString: source.href,
      connectionTimeoutMillis: 20000,
      statement_timeout: 60000,
    }),
    temp = await mkdtemp(join(tmpdir(), "booker-backup-"));
  try {
    await client.connect();
    await client.query("set timezone='UTC'");
    await client.query("begin isolation level repeatable read read only");
    const snapshot = (await client.query("select pg_export_snapshot() as id"))
      .rows[0].id;
    const file = join(temp, "database.dump");
    await run(
      process.env.PG_DUMP_BIN ?? "pg_dump",
      [
        "--format=custom",
        "--no-acl",
        "--snapshot=" + snapshot,
        ...[...excluded].map((t) => "--exclude-table-data=" + t),
        "--file=" + file,
      ],
      source,
    );
    const manifest = {
      postgresVersion: (await client.query("show server_version")).rows[0]
        .server_version,
      format: "bookingpro-postgres-backup-v1",
      createdAt: new Date().toISOString(),
      sourceDatabase: decodeURIComponent(source.pathname.slice(1)),
      sourceHostHash: createHash("sha256")
        .update(source.hostname)
        .digest("hex"),
      excludedData: [...excluded],
      tables: await inventory(client, true),
    };
    await client.query("commit");
    assert(
      (await stat(file)).size < 128 * 1024 * 1024,
      "Use a streaming backup tool above 128 MB",
    );
    const iv = randomBytes(12),
      cipher = createCipheriv("aes-256-gcm", Buffer.from(keyHex, "hex"), iv);
    cipher.setAAD(Buffer.from(JSON.stringify(manifest)));
    const encrypted = Buffer.concat([
      cipher.update(await readFile(file)),
      cipher.final(),
    ]);
    const envelope = {
      manifest,
      iv: iv.toString("hex"),
      tag: cipher.getAuthTag().toString("hex"),
      ciphertext: encrypted.toString("base64"),
    };
    await writeFile(output, JSON.stringify(envelope) + "\n", {
      mode: 0o600,
      flag: "wx",
    });
    return {
      createdAt: manifest.createdAt,
      tables: manifest.tables.length,
      encrypted: true,
      sha256: createHash("sha256")
        .update(await readFile(output))
        .digest("hex"),
    };
  } finally {
    await client.end().catch(() => {});
    await rm(temp, { recursive: true, force: true });
  }
}
export async function restore(targetValue, input, keyHex) {
  const target = connection(targetValue),
    envelope = JSON.parse(await readFile(input, "utf8"));
  assert(
    envelope.manifest?.format === "bookingpro-postgres-backup-v1",
    "Unsupported archive",
  );
  assert(
    /^[a-f0-9]{64}$/i.test(keyHex ?? ""),
    "A backup decryption key is required",
  );
  const sameHost =
    createHash("sha256").update(target.hostname).digest("hex") ===
    envelope.manifest.sourceHostHash;
  assert(
    !(
      sameHost &&
      decodeURIComponent(target.pathname.slice(1)) ===
        envelope.manifest.sourceDatabase
    ),
    "Restore target must differ from the source",
  );
  assert(
    process.env.RESTORE_TARGET_CONFIRM ===
      decodeURIComponent(target.pathname.slice(1)),
    "RESTORE_TARGET_CONFIRM must exactly match the target database name",
  );
  const decipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(keyHex, "hex"),
    Buffer.from(envelope.iv, "hex"),
  );
  decipher.setAAD(Buffer.from(JSON.stringify(envelope.manifest)));
  decipher.setAuthTag(Buffer.from(envelope.tag, "hex"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64")),
    decipher.final(),
  ]);
  const client = new Client({
      connectionString: target.href,
      connectionTimeoutMillis: 20000,
      statement_timeout: 60000,
    }),
    temp = await mkdtemp(join(tmpdir(), "booker-restore-"));
  try {
    await client.connect();
    await client.query("set timezone='UTC'");
    const version = (await client.query("show server_version_num")).rows[0]
      .server_version_num;
    const sourceVersion =
      envelope.manifest.postgresVersion?.match(/^(\d+)\.(\d+)/);
    if (sourceVersion) {
      const required =
        Number(sourceVersion[1]) * 10000 + Number(sourceVersion[2]);
      assert(
        Number(version) >= required,
        "Restore target PostgreSQL must be at least the source minor version",
      );
    }
    const objects = await client.query(
      "select count(*) as n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname not in ('pg_catalog','information_schema') and n.nspname not like 'pg_toast%' and c.relkind in ('r','p','v','m','S','f')",
    );
    assert(
      Number(objects.rows[0].n) === 0,
      "Restore requires an empty target database",
    );
    const file = join(temp, "database.dump");
    await writeFile(file, plaintext, { mode: 0o600 });
    await run(
      process.env.PG_RESTORE_BIN ?? "pg_restore",
      [
        "--single-transaction",
        "--exit-on-error",
        "--no-owner",
        "--no-privileges",
        "--dbname=" + decodeURIComponent(target.pathname.slice(1)),
        file,
      ],
      target,
    );
    const actual = await inventory(client);
    assert.deepEqual(
      actual,
      envelope.manifest.tables,
      "Restored table contents do not match the snapshot",
    );
    const constraints = await client.query(
      "select 1 from pg_constraint where conname='appointments_no_overlap' and contype='x'",
    );
    assert(constraints.rows.length === 1, "Booking overlap protection missing");
    return {
      restored: true,
      tables: actual.length,
      contentsMatch: true,
      overlapConstraint: true,
      sessionsRestored: false,
    };
  } finally {
    await client.end().catch(() => {});
    await rm(temp, { recursive: true, force: true });
  }
}
if (
  process.argv[1] &&
  import.meta.url === new URL(process.argv[1], "file:").href
) {
  try {
    const [action, file] = process.argv.slice(2);
    assert(file, "Supply an archive path");
    const result =
      action === "create"
        ? await backup(
            process.env.DATABASE_URL_UNPOOLED,
            file,
            process.env.BACKUP_ENCRYPTION_KEY,
          )
        : action === "restore"
          ? await restore(
              process.env.RESTORE_DATABASE_URL,
              file,
              process.env.BACKUP_ENCRYPTION_KEY,
            )
          : (() => {
              throw new Error("Use create or restore");
            })();
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Backup operation failed",
    );
    process.exitCode = 1;
  }
}
