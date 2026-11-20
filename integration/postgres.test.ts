import { retryBookingWrite } from "../server/database-retry";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { fork, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { connectDatabase } from "../server/db";
import { PostgresStorage } from "../server/postgres-storage";
import type { Provider, Service } from "@shared/schema";

const connectionString = process.env.TEST_DATABASE_URL;
if (
  !connectionString ||
  !/^appointments_test/.test(new URL(connectionString).pathname.slice(1))
)
  throw new Error(
    "TEST_DATABASE_URL must select an isolated appointments_test database",
  );
const { db, pool, sessionStore } = connectDatabase(connectionString);
const storage = new PostgresStorage(db, pool, sessionStore);
const prefix = randomUUID().slice(0, 8);
const password = "A-real-test-password-2026";
const ownerEmail = `${prefix}-owner@example.com`;
const otherEmail = `${prefix}-other@example.com`;
let first: WorkerApp, second: WorkerApp;
let ownerCookie: string, otherCookie: string, ownerId: string;
let provider: Provider, otherProvider: Provider, service: Service;

interface WorkerApp {
  process: ChildProcess;
  base: string;
  stop: () => Promise<void>;
}
async function startApp(production = false): Promise<WorkerApp> {
  const worker = fork(
    fileURLToPath(new URL("./api-worker.ts", import.meta.url)),
    [],
    {
      execArgv: ["--import", "tsx"],
      env: {
        ...process.env,
        NODE_ENV: production ? "production" : "test",
        DATABASE_URL: connectionString,
        SESSION_SECRET:
          "integration-only-session-secret-at-least-32-characters",
        APP_ORIGIN: production ? "https://booking.example" : "http://127.0.0.1",
        TRUST_PROXY: production ? "1" : "0",
      },
      stdio: ["ignore", "pipe", "pipe", "ipc"],
    },
  );
  let errors = "";
  worker.stdout?.on("data", () => {});
  worker.stderr?.on("data", (chunk) => {
    errors += chunk.toString();
  });
  const port = await new Promise<number>((resolve, reject) => {
    const timeout = setTimeout(() => {
      worker.kill();
      reject(new Error(`API worker readiness timeout: ${errors.slice(-300)}`));
    }, 15000);
    worker.once("message", (message) => {
      clearTimeout(timeout);
      resolve((message as { port: number }).port);
    });
    worker.once("exit", (code) => {
      clearTimeout(timeout);
      if (code !== 0)
        reject(new Error(`API worker exited ${code}: ${errors.slice(-300)}`));
    });
  });
  return {
    process: worker,
    base: `http://127.0.0.1:${port}`,
    stop: async () => {
      if (worker.exitCode !== null) return;
      const exited = once(worker, "exit");
      worker.send("stop");
      await exited;
    },
  };
}
const api = (
  worker: WorkerApp,
  path: string,
  method = "GET",
  body?: unknown,
  cookie?: string,
  extra: Record<string, string> = {},
) =>
  fetch(`${worker.base}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(cookie ? { cookie } : {}),
      ...extra,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
const cookieFrom = (response: Response) => {
  const cookie = response.headers
    .getSetCookie()
    .find((value) => value.startsWith("booking.sid="));
  assert.ok(cookie, "Session cookie must be issued");
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Lax/i);
  return cookie.split(";")[0];
};
const onboarding = (name: string, email: string) => ({
  profile: {
    name,
    email,
    phone: "+265991000001",
    specialty: "Consulting",
    workingHours: { start: "09:00", end: "17:00", days: [1, 2, 3, 4, 5] },
  },
  service: { name: "Consultation", duration: 60, price: "9000.00" },
});
const booking = (startTime = "09:00", endTime = "10:00") => ({
  providerId: provider.id,
  serviceId: service.id,
  clientName: "Client",
  clientEmail: "client@example.com",
  clientPhone: "+265991000001",
  appointmentDate: "2099-01-05",
  startTime,
  endTime,
});

before(async () => {
  await migrate(db as NodePgDatabase, { migrationsFolder: "./migrations" });
  // Repeat to prove migration replay is safe.
  await migrate(db as NodePgDatabase, { migrationsFolder: "./migrations" });
  await storage.assertReady();
  first = await startApp();
  second = await startApp();
  let response = await api(first, "/api/auth/register", "POST", {
    email: ownerEmail.toUpperCase(),
    firstName: "Provider",
    lastName: "One",
    password,
  });
  assert.equal(response.status, 201);
  ownerCookie = cookieFrom(response);
  ownerId = (await response.json()).id;
  response = await api(second, "/api/auth/register", "POST", {
    email: otherEmail,
    firstName: "Provider",
    lastName: "Two",
    password,
  });
  assert.equal(response.status, 201);
  otherCookie = cookieFrom(response);
  response = await api(
    first,
    "/api/providers/onboard",
    "POST",
    onboarding("Provider One", ownerEmail),
    ownerCookie,
  );
  assert.equal(response.status, 201);
  ({ provider, service } = await response.json());
  response = await api(
    second,
    "/api/providers/onboard",
    "POST",
    onboarding("Provider Two", otherEmail),
    otherCookie,
  );
  assert.equal(response.status, 201);
  otherProvider = (await response.json()).provider;
});
after(async () => {
  await first?.stop();
  await second?.stop();
  await storage.close();
});

test("PostgreSQL login uses salted credentials and rejects forged identities", async () => {
  const stored = await storage.getCredential(ownerEmail);
  assert.ok(stored);
  assert.match(stored.passwordHash, /^scrypt-v1:/);
  assert.ok(!stored.passwordHash.includes(password));
  const response = await api(second, "/api/auth/login", "POST", {
    email: ownerEmail.toUpperCase(),
    password,
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.id, ownerId);
  assert.ok(!JSON.stringify(body).includes("scrypt"));
  const forged = await api(
    first,
    "/api/auth/user",
    "GET",
    undefined,
    undefined,
    { "x-test-user": ownerId },
  );
  assert.equal(forged.status, 401);
  const invalid = await api(first, "/api/auth/login", "POST", {
    email: ownerEmail,
    password: "incorrect-password",
  });
  assert.equal(invalid.status, 401);
  const unknown = await api(first, "/api/auth/login", "POST", {
    email: `${prefix}-unknown@example.com`,
    password: "incorrect-password",
  });
  assert.equal(unknown.status, 401);
  assert.deepEqual(await unknown.json(), await invalid.json());
});

test("provider context is dynamic and isolated across independent workers", async () => {
  assert.notEqual(provider.id, otherProvider.id);
  const response = await api(
    second,
    "/api/auth/user",
    "GET",
    undefined,
    otherCookie,
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).providerId, otherProvider.id);
  assert.equal(
    (
      await api(
        first,
        `/api/providers/${provider.id}/appointments`,
        "GET",
        undefined,
        otherCookie,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await api(
        first,
        `/api/providers/${otherProvider.id}/appointments`,
        "GET",
        undefined,
        otherCookie,
      )
    ).status,
    200,
  );
  assert.equal(
    (await api(first, "/api/providers/me", "GET", undefined, otherCookie))
      .status,
    200,
  );
  assert.equal(
    (
      await api(
        second,
        "/api/providers/onboard",
        "POST",
        onboarding("Duplicate", `${prefix}-duplicate@example.com`),
        ownerCookie,
      )
    ).status,
    409,
  );
});

test("onboarding rolls back the profile when the first service violates a DB constraint", async () => {
  const user = await storage.registerUser({
    email: `${prefix}-rollback@example.com`,
    firstName: "Rollback",
    lastName: "Test",
    passwordHash: (await storage.getCredential(ownerEmail))!.passwordHash,
  });
  await assert.rejects(
    storage.onboardProvider(
      onboarding("Rollback", `${prefix}-rollback@example.com`).profile,
      { name: "Invalid service", duration: 0, price: "10.00" },
      user.id,
    ),
  );
  assert.equal(await storage.getProviderByOwnerId(user.id), undefined);
});

test("separate API processes cannot double-book the same interval", async () => {
  // Repeated independent batches exercise the deadlock path as well as the
  // immediate exclusion-constraint path. Exactly one request may commit per day.
  for (const date of ["2099-01-05", "2099-01-12", "2099-01-19", "2099-01-26"]) {
    const responses = await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        api(
          index % 2 ? first : second,
          "/api/appointments",
          "POST",
          {
            ...booking(
              index % 2 ? "09:30" : "09:00",
              index % 2 ? "10:30" : "10:00",
            ),
            appointmentDate: date,
          },
          ownerCookie,
        ),
      ),
    );
    assert.deepEqual(
      responses.map((response) => response.status).sort(),
      [201, 409, 409, 409, 409, 409],
    );
  }
  const appointments = await storage.getAppointmentsByDate(
    provider.id,
    "2099-01-05",
  );
  assert.equal(appointments.length, 1);
  const saved = appointments[0];
  assert.equal(saved.paymentStatus, "pending");
  assert.equal(saved.paymentAmount, "9000.00");
  const otherWorker = await api(
    second,
    `/api/appointments/${saved.id}`,
    "GET",
    undefined,
    ownerCookie,
  );
  assert.equal(otherWorker.status, 200);
  assert.equal(
    (
      await api(
        second,
        `/api/appointments/${saved.id}`,
        "GET",
        undefined,
        otherCookie,
      )
    ).status,
    403,
  );
});

test("a real PostgreSQL deadlock is retried only after transaction rollback", async () => {
  let arrivals = 0;
  let attempts = 0;
  let release!: () => void;
  const barrier = new Promise<void>((resolve) => {
    release = resolve;
  });
  const namespace = parseInt(prefix.slice(0, 6), 16);
  const participant = (firstLock: number, secondLock: number) => {
    let localAttempts = 0;
    return retryBookingWrite(() => {
      attempts++;
      localAttempts++;
      return db.transaction(async (tx) => {
        await tx.execute(
          sql`select pg_advisory_xact_lock(${namespace}, ${firstLock})`,
        );
        if (localAttempts === 1) {
          arrivals++;
          if (arrivals === 2) release();
          await barrier;
        }
        await tx.execute(
          sql`select pg_advisory_xact_lock(${namespace}, ${secondLock})`,
        );
        return "committed";
      });
    });
  };
  assert.deepEqual(await Promise.all([participant(1, 2), participant(2, 1)]), [
    "committed",
    "committed",
  ]);
  assert.ok(
    attempts >= 3,
    "At least one transaction must have rolled back and retried",
  );
});

test("database rejects direct overlaps, wrong provider-service pairs and invalid intervals", async () => {
  await assert.rejects(
    storage.createAppointment({
      ...booking(),
      startTime: "09:45",
      endTime: "10:45",
    }),
  );
  await assert.rejects(
    storage.createAppointment({
      ...booking("11:00", "12:00"),
      providerId: otherProvider.id,
    }),
  );
  await assert.rejects(storage.createAppointment(booking("12:00", "11:00")));
  await assert.rejects(storage.createAppointment(booking("16:30", "17:30")));
});

test("cancellation releases availability and rescheduling cannot overlap", async () => {
  const original = (
    await storage.getAppointmentsByDate(provider.id, "2099-01-05")
  )[0];
  assert.equal(
    (
      await api(
        first,
        `/api/appointments/${original.id}`,
        "PATCH",
        { status: "cancelled" },
        ownerCookie,
      )
    ).status,
    200,
  );
  const created = await api(
    first,
    "/api/appointments",
    "POST",
    booking("09:00", "10:00"),
    ownerCookie,
  );
  assert.equal(created.status, 201);
  const later = await api(
    second,
    "/api/appointments",
    "POST",
    booking("11:00", "12:00"),
    ownerCookie,
  );
  assert.equal(later.status, 201);
  const id = (await later.json()).id;
  assert.equal(
    (
      await api(
        first,
        `/api/appointments/${id}`,
        "PATCH",
        { startTime: "09:30", endTime: "10:30" },
        ownerCookie,
      )
    ).status,
    409,
  );
  assert.equal((await storage.getAppointment(id))?.startTime, "11:00");
});

test("records and the signed session survive application process restart", async () => {
  const created = await api(
    first,
    "/api/memos",
    "POST",
    {
      providerId: provider.id,
      title: "Durable memo",
      content: "Survives restart",
    },
    ownerCookie,
  );
  assert.equal(created.status, 201);
  const id = (await created.json()).id;
  await first.stop();
  first = await startApp();
  const response = await api(
    first,
    "/api/auth/user",
    "GET",
    undefined,
    ownerCookie,
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).id, ownerId);
  const memos = await api(
    first,
    `/api/providers/${provider.id}/memos`,
    "GET",
    undefined,
    ownerCookie,
  );
  assert.equal(memos.status, 200);
  assert.ok(
    (await memos.json()).some((memo: { id: number }) => memo.id === id),
  );
});

test("client history and guest confirmation do not expose another client's booking", async () => {
  const registration = await api(first, "/api/auth/register", "POST", {
    email: `${prefix}-client@example.com`,
    firstName: "Real",
    lastName: "Client",
    password,
  });
  assert.equal(registration.status, 201);
  const clientCookie = cookieFrom(registration);
  const created = await api(
    second,
    "/api/appointments",
    "POST",
    booking("13:00", "14:00"),
    clientCookie,
  );
  assert.equal(created.status, 201);
  const id = (await created.json()).id;
  const list = await api(
    first,
    "/api/appointments/my",
    "GET",
    undefined,
    clientCookie,
  );
  assert.deepEqual(
    (await list.json()).map((appointment: { id: number }) => appointment.id),
    [id],
  );
  const guest = await api(
    first,
    "/api/appointments",
    "POST",
    booking("14:00", "15:00"),
  );
  assert.equal(guest.status, 201);
  const guestCookie = cookieFrom(guest);
  const guestId = (await guest.json()).id;
  assert.equal(
    (
      await api(
        second,
        `/api/appointments/${guestId}`,
        "GET",
        undefined,
        guestCookie,
      )
    ).status,
    200,
  );
  assert.equal((await api(second, `/api/appointments/${guestId}`)).status, 403);
  assert.equal(
    (
      await api(
        first,
        `/api/appointments/${guestId}`,
        "GET",
        undefined,
        clientCookie,
      )
    ).status,
    403,
  );
});

test("cross-origin registration is rejected and account throttling spans workers", async () => {
  assert.equal(
    (
      await api(
        first,
        "/api/auth/register",
        "POST",
        {
          email: `${prefix}-csrf@example.com`,
          firstName: "No",
          lastName: "Account",
          password,
        },
        undefined,
        { origin: "https://attacker.example" },
      )
    ).status,
    403,
  );
  const results: number[] = [];
  for (let index = 0; index < 11; index++)
    results.push(
      (
        await api(index % 2 ? first : second, "/api/auth/login", "POST", {
          email: `${prefix}-throttle@example.com`,
          password: "incorrect-password",
        })
      ).status,
    );
  assert.equal(results.at(-1), 429);
  assert.ok(results.slice(0, 10).every((status) => status === 401));
});

test("logout revokes the shared session, including a replay on another worker", async () => {
  const login = await api(first, "/api/auth/login", "POST", {
    email: otherEmail,
    password,
  });
  assert.equal(login.status, 200);
  const cookie = cookieFrom(login);
  assert.notEqual(
    cookie,
    otherCookie,
    "Login must rotate the session identifier",
  );
  assert.equal(
    (await api(second, "/api/auth/user", "GET", undefined, cookie)).status,
    200,
  );
  assert.equal(
    (await api(first, "/api/auth/logout", "POST", undefined, cookie)).status,
    204,
  );
  assert.equal(
    (await api(second, "/api/auth/user", "GET", undefined, cookie)).status,
    401,
  );
});

test("booked value is not counted as collected revenue", async () => {
  const analytics = await storage.getAnalytics(provider.id, "2099-01-05");
  assert.equal(analytics.totalRevenue, "0.00");
  const credentialCount = await db.execute(
    sql`select count(*)::int as count from auth_credentials`,
  );
  assert.ok(Number(credentialCount.rows[0].count) >= 3);
});

test("production login issues secure cookies behind the configured HTTPS proxy", async () => {
  const production = await startApp(true);
  try {
    const response = await api(
      production,
      "/api/auth/login",
      "POST",
      { email: ownerEmail, password },
      undefined,
      { "x-forwarded-proto": "https", origin: "https://booking.example" },
    );
    assert.equal(response.status, 200);
    assert.match(response.headers.getSetCookie().join(";"), /; Secure/i);
    assert.match(response.headers.getSetCookie().join(";"), /HttpOnly/i);
    assert.equal(
      (
        await api(
          production,
          "/api/auth/login",
          "POST",
          { email: ownerEmail, password },
          undefined,
          { origin: "https://attacker.example" },
        )
      ).status,
      403,
    );
  } finally {
    await production.stop();
  }
});

test("real client session can reschedule and cancel its own booking across API workers", async () => {
  const registration = await api(first, "/api/auth/register", "POST", {
    email: `${prefix}-interface-client@example.com`,
    firstName: "Interface",
    lastName: "Client",
    password,
  });
  assert.equal(registration.status, 201);
  const client = await registration.json();
  const cookie = cookieFrom(registration);
  const created = await api(
    first,
    "/api/appointments",
    "POST",
    { ...booking(), appointmentDate: "2099-01-06" },
    cookie,
  );
  assert.equal(created.status, 201);
  const appointment = await created.json();
  const changes = {
    appointmentDate: "2099-01-06",
    startTime: "13:00",
    endTime: "14:00",
  };
  assert.equal(
    (
      await api(
        second,
        `/api/appointments/${appointment.id}/reschedule`,
        "PATCH",
        changes,
        otherCookie,
      )
    ).status,
    403,
  );
  const moved = await api(
    second,
    `/api/appointments/${appointment.id}/reschedule`,
    "PATCH",
    changes,
    cookie,
  );
  assert.equal(moved.status, 200);
  const saved = await moved.json();
  assert.equal(saved.clientUserId, client.id);
  assert.equal(saved.paymentAmount, "9000.00");
  assert.equal(saved.startTime, "13:00");
  assert.equal(
    (
      await api(
        first,
        `/api/appointments/${appointment.id}/cancel`,
        "POST",
        {},
        otherCookie,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await api(
        first,
        `/api/appointments/${appointment.id}/cancel`,
        "POST",
        {},
        cookie,
      )
    ).status,
    200,
  );
  assert.equal(
    (await storage.getAppointment(appointment.id))!.status,
    "cancelled",
  );
});

test("service editing and archival preserve PostgreSQL booking history and status management", async () => {
  const response = await api(
    first,
    "/api/services",
    "POST",
    {
      providerId: provider.id,
      name: "Interface service",
      duration: 30,
      price: "1234.56",
    },
    ownerCookie,
  );
  assert.equal(response.status, 201);
  const added = await response.json();
  assert.equal(
    (
      await api(
        second,
        `/api/services/${added.id}`,
        "PATCH",
        { price: "2.00" },
        otherCookie,
      )
    ).status,
    403,
  );
  const created = await api(
    first,
    "/api/appointments",
    "POST",
    {
      ...booking(),
      serviceId: added.id,
      appointmentDate: "2099-01-06",
      startTime: "15:00",
      endTime: "15:30",
    },
    ownerCookie,
  );
  assert.equal(created.status, 201);
  const appointment = await created.json();
  assert.equal(
    (
      await api(
        second,
        `/api/services/${added.id}`,
        "PATCH",
        { price: "2000.00" },
        ownerCookie,
      )
    ).status,
    200,
  );
  assert.equal(
    (await storage.getAppointment(appointment.id))!.paymentAmount,
    "1234.56",
  );
  assert.equal(
    (
      await api(
        first,
        `/api/services/${added.id}`,
        "DELETE",
        undefined,
        ownerCookie,
      )
    ).status,
    204,
  );
  assert.equal(
    (
      await api(
        second,
        `/api/appointments/${appointment.id}`,
        "PATCH",
        { status: "completed" },
        ownerCookie,
      )
    ).status,
    200,
  );
  assert.equal((await storage.getService(added.id))!.isActive, false);
  assert.equal(
    (await storage.getAppointment(appointment.id))!.status,
    "completed",
  );
});

// Operational workflows use a real PostgreSQL database and mocked external HTTP.
// No test messages or payments are sent to external accounts.
test("operational recovery consumes a single-use secret and revokes sessions across workers", async () => {
  const { Operations, tokenDigest } = await import("../server/operations");
  const { hashPassword } = await import("../server/auth");
  const oldEnv = { ...process.env };
  Object.assign(process.env, {
    SESSION_SECRET: "integration-only-session-secret-at-least-32-characters",
    RESEND_API_KEY: "fixture-only",
    EMAIL_FROM: "Fixture <sender@example.invalid>",
    APP_ORIGIN: "https://booking.example",
  });
  try {
    const email = `${prefix}-recovery@example.invalid`;
    const response = await api(first, "/api/auth/register", "POST", {
      email,
      password,
      firstName: "Reset",
      lastName: "Fixture",
    });
    assert.equal(response.status, 201);
    const cookie = cookieFrom(response);
    const sent: any[] = [];
    const ops = new Operations(storage, async (_url, options) => {
      sent.push(JSON.parse(String(options?.body)));
      return Response.json({ id: "mock-accepted-" + sent.length });
    });
    await ops.issueReset(email);
    assert.equal((await ops.deliver(1)).accepted, 1);
    const token = sent[0].text.match(/#([a-f0-9]{64})/)[1];
    const persisted = await db.execute(
      sql`select * from password_resets where token_hash=${tokenDigest(token)}`,
    );
    assert.equal(persisted.rows.length, 1);
    assert.ok(!JSON.stringify(persisted.rows).includes(token));
    assert.equal((await ops.deliver(1)).accepted, 0);
    assert.equal(
      (
        await api(first, "/api/auth/reset-password", "POST", {
          token,
          password: "replacement-password-at-least-12",
        })
      ).status,
      200,
    );
    assert.equal(
      (await api(second, "/api/auth/user", "GET", undefined, cookie)).status,
      401,
    );
    assert.equal(
      (await api(second, "/api/auth/login", "POST", { email, password }))
        .status,
      401,
    );
    assert.equal(
      (
        await api(second, "/api/auth/login", "POST", {
          email,
          password: "replacement-password-at-least-12",
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await api(first, "/api/auth/reset-password", "POST", {
          token,
          password: "another-password-at-least-12",
        })
      ).status,
      400,
    );
    // Two different outstanding links for one account cannot both win.
    await ops.issueReset(email);
    await ops.deliver(2);
    await ops.issueReset(email);
    await ops.deliver(2);
    const tokens = sent
      .filter((m) => m.subject === "Reset your BookingPro password")
      .slice(-2)
      .map((m) => m.text.match(/#([a-f0-9]{64})/)[1]);
    const changed = await hashPassword("concurrent-new-password");
    const outcomes = await Promise.allSettled(
      tokens.map((t) => ops.consumeReset(tokenDigest(t), changed)),
    );
    assert.equal(outcomes.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(outcomes.filter((r) => r.status === "rejected").length, 1);
    await ops.issueReset(email);
    await db.execute(
      sql`update password_resets set expires_at=now()-interval '1 second' where used_at is null`,
    );
    const expired = await db.execute(
      sql`select token_hash from password_resets where user_id=${persisted.rows[0].user_id} and used_at is null`,
    );
    assert.equal(
      await ops.resetValid(String(expired.rows[0].token_hash)),
      false,
    );
  } finally {
    for (const key of Object.keys(process.env))
      if (!(key in oldEnv)) delete process.env[key];
    Object.assign(process.env, oldEnv);
  }
});

test("durable booking outbox has atomic writes, shared leases, safe retries and stale suppression", async () => {
  const { Operations } = await import("../server/operations");
  const oldEnv = { ...process.env };
  Object.assign(process.env, {
    SESSION_SECRET: "integration-only-session-secret-at-least-32-characters",
    RESEND_API_KEY: "fixture-only",
    EMAIL_FROM: "sender@example.invalid",
  });
  try {
    await db.execute(sql`update message_outbox set status='skipped'`);
    const a = await storage.createAppointment({
      ...booking("15:00", "16:00"),
      appointmentDate: "2099-01-08",
    });
    const queued = await db.execute(
      sql`select id from message_outbox where appointment_id=${a.id}`,
    );
    assert.equal(queued.rows.length, 1);
    await assert.rejects(() =>
      db.transaction(async (tx) => {
        await tx.execute(
          sql`update appointments set status='completed' where id=${a.id}`,
        );
        throw new Error("rollback fixture");
      }),
    );
    assert.equal(
      (
        await db.execute(
          sql`select id from message_outbox where appointment_id=${a.id}`,
        )
      ).rows.length,
      1,
    );
    const calls: any[] = [];
    const http: typeof fetch = async (_url, options) => {
      calls.push(options);
      await new Promise((r) => setTimeout(r, 30));
      return Response.json({ id: "mock-outbox" });
    };
    const aOps = new Operations(storage, http),
      bOps = new Operations(storage, http);
    await Promise.all([aOps.deliver(1), bOps.deliver(1)]);
    assert.equal(calls.length, 1);
    const id = String(queued.rows[0].id);
    await db.execute(
      sql`update message_outbox set status='processing',lease_until=now()-interval '1 second' where id=${id}::uuid`,
    );
    await aOps.deliver(1);
    assert.equal(calls.length, 2);
    assert.equal(
      calls[0].headers["Idempotency-Key"],
      calls[1].headers["Idempotency-Key"],
    );
    await storage.updateAppointment(a.id, { status: "cancelled" });
    const failing = new Operations(
      storage,
      async () => new Response("", { status: 503 }),
    );
    assert.equal((await failing.deliver(1)).failed, 1);
    const pending = await db.execute(
      sql`select attempts,status from message_outbox where appointment_id=${a.id} and status='pending'`,
    );
    assert.equal(pending.rows.length, 1);
    assert.equal(pending.rows[0].attempts, 1);
    await db.execute(
      sql`update message_outbox set available_at=now(),attempts=4 where appointment_id=${a.id} and status='pending'`,
    );
    await failing.deliver(1);
    assert.equal(
      (
        await db.execute(
          sql`select status from message_outbox where appointment_id=${a.id} order by created_at desc limit 1`,
        )
      ).rows[0].status,
      "failed",
    );
    await storage.updateAppointment(a.id, { status: "confirmed" });
    await storage.updateAppointment(a.id, { status: "cancelled" });
    await aOps.deliver(2); // Old revisions are skipped and dedupe keys prevent replay.
    assert.equal(calls.length, 3);
  } finally {
    for (const key of Object.keys(process.env))
      if (!(key in oldEnv)) delete process.env[key];
    Object.assign(process.env, oldEnv);
  }
});

test("payment verification rejects mismatches, confines merchant ownership and separates test from live collections", async () => {
  const { Operations } = await import("../server/operations");
  const { createHmac } = await import("node:crypto");
  const oldEnv = { ...process.env };
  Object.assign(process.env, {
    PAYCHANGU_SECRET_KEY: "fixture-only",
    PAYCHANGU_PROVIDER_ID: String(provider.id),
    PAYCHANGU_MODE: "test",
    PAYCHANGU_WEBHOOK_SECRET: "fixture-webhook-secret",
    APP_ORIGIN: "https://booking.example",
  });
  try {
    const a = await storage.createAppointment({
      ...booking("09:00", "10:00"),
      appointmentDate: "2099-01-07",
    });
    let mismatch = "";
    let verificationCount = 0;
    const ops = new Operations(storage, async (url, options) => {
      if (String(url).endsWith("/payment"))
        return Response.json({
          status: "success",
          data: {
            checkout_url:
              process.env.PAYCHANGU_MODE === "live"
                ? "https://checkout.paychangu.com/fixture"
                : "https://test-checkout.paychangu.com/fixture",
          },
        });
      verificationCount++;
      const ref = String(url).split("/").at(-1)!;
      return Response.json({
        status: "success",
        data: {
          tx_ref: mismatch === "reference" ? "bp-incorrect" : ref,
          currency: mismatch === "currency" ? "USD" : "MWK",
          mode: mismatch === "mode" ? "test" : process.env.PAYCHANGU_MODE,
          amount: mismatch === "amount" ? "1.00" : a.paymentAmount,
          status: "success",
          reference: "mock-" + process.env.PAYCHANGU_MODE + "-" + a.id,
        },
      });
    });
    assert.equal(ops.paymentReady(otherProvider.id), false);
    const checkout = await ops.createCheckout(a.id);
    assert.equal(
      (await ops.createCheckout(a.id)).reference,
      checkout.reference,
    );
    for (const kind of ["amount", "currency", "reference"]) {
      mismatch = kind;
      await assert.rejects(() => ops.verifyPayment(checkout.reference));
      assert.equal(
        (await storage.getAppointment(a.id))?.paymentStatus,
        "pending",
      );
    }
    mismatch = "";
    assert.equal(
      (await ops.verifyPayment(checkout.reference)).status,
      "verified_test",
    );
    assert.equal(
      (await storage.getAppointment(a.id))?.paymentStatus,
      "pending",
    );
    process.env.PAYCHANGU_MODE = "live";
    const live = await ops.createCheckout(a.id);
    mismatch = "mode";
    await assert.rejects(() => ops.verifyPayment(live.reference));
    mismatch = "";
    assert.equal((await ops.verifyPayment(live.reference)).status, "paid");
    assert.equal(
      (await storage.getAppointment(a.id))?.paymentStatus,
      "completed",
    );
    const count = verificationCount;
    await ops.verifyPayment(live.reference);
    assert.equal(verificationCount, count);
    const body = Buffer.from(JSON.stringify({ tx_ref: live.reference }));
    const signature = createHmac(
      "sha256",
      process.env.PAYCHANGU_WEBHOOK_SECRET!,
    )
      .update(body)
      .digest("hex");
    assert.equal(ops.validWebhook(body, signature), true);
    assert.equal(ops.validWebhook(Buffer.from("{}"), signature), false);
    assert.equal(ops.validWebhook(body, "invalid"), false);
  } finally {
    for (const key of Object.keys(process.env))
      if (!(key in oldEnv)) delete process.env[key];
    Object.assign(process.env, oldEnv);
  }
});

test("encrypted logical backup restores matching data and booking constraints into an independent empty target", async () => {
  if (!process.env.RESTORE_DATABASE_URL || !process.env.BACKUP_ENCRYPTION_KEY)
    throw new Error(
      "Backup certification requires an empty independent restore target",
    );
  const { backup, restore } = await import("../scripts/backup.mjs");
  const { readFile, unlink } = await import("node:fs/promises");
  const file = `/tmp/booker-restore-certification-${prefix}.booker-backup`;
  try {
    const exported = await backup(
      connectionString,
      file,
      process.env.BACKUP_ENCRYPTION_KEY,
    );
    assert.equal(exported.encrypted, true);
    const content = await readFile(file, "utf8");
    assert.ok(!content.includes(ownerEmail));
    await assert.rejects(() =>
      restore(process.env.RESTORE_DATABASE_URL, file, "f".repeat(64)),
    );
    const restored = await restore(
      process.env.RESTORE_DATABASE_URL,
      file,
      process.env.BACKUP_ENCRYPTION_KEY,
    );
    assert.equal(restored.contentsMatch, true);
    const target = connectDatabase(process.env.RESTORE_DATABASE_URL);
    const recovered = new PostgresStorage(
      target.db,
      target.pool,
      target.sessionStore,
    );
    try {
      await recovered.assertReady();
      assert.equal(
        (await recovered.getProvider(provider.id))?.ownerUserId,
        ownerId,
      );
      assert.equal(
        (await recovered.getAppointmentsByProvider(provider.id)).length,
        (await storage.getAppointmentsByProvider(provider.id)).length,
      );
      const collision = (
        await recovered.getAppointmentsByProvider(provider.id)
      ).find((a) => a.status !== "cancelled")!;
      await assert.rejects(() =>
        recovered.createAppointment({
          ...booking(collision.startTime, collision.endTime),
          appointmentDate: collision.appointmentDate,
        }),
      );
      assert.equal(
        (
          await target.db.execute(
            sql`select count(*)::int as count from sessions`,
          )
        ).rows[0].count,
        0,
      );
    } finally {
      await recovered.close();
    }
    await assert.rejects(() =>
      restore(
        process.env.RESTORE_DATABASE_URL,
        file,
        process.env.BACKUP_ENCRYPTION_KEY,
      ),
    );
  } finally {
    await unlink(file).catch(() => {});
  }
});

test("operational HTTP routes conceal recovery accounts, authenticate webhooks and enforce provider scope", async () => {
  const { Operations } = await import("../server/operations");
  const { createApp } = await import("../server/app");
  const { hashPassword } = await import("../server/auth");
  const { createHmac } = await import("node:crypto");
  const oldEnv = { ...process.env };
  Object.assign(process.env, {
    SESSION_SECRET: "operational-route-session-secret-at-least-32-characters",
    RESEND_API_KEY: "fixture-only",
    EMAIL_FROM: "sender@example.invalid",
    APP_ORIGIN: "http://127.0.0.1",
    PAYCHANGU_SECRET_KEY: "fixture-only",
    PAYCHANGU_MODE: "test",
    PAYCHANGU_WEBHOOK_SECRET: "route-webhook-fixture",
  });
  const mails: any[] = [];
  const ops = new Operations(storage, async (url, options) =>
    String(url).includes("resend")
      ? (mails.push(JSON.parse(String(options?.body))),
        Response.json({ id: "mock-route-email" }))
      : String(url).endsWith("/payment")
        ? Response.json({
            status: "success",
            data: { checkout_url: "https://test-checkout.paychangu.com/route" },
          })
        : Response.json({
            status: "success",
            data: {
              tx_ref: String(url).split("/").at(-1),
              currency: "MWK",
              amount: "2500.00",
              mode: "test",
              status: "success",
              reference: "route-verified",
            },
          }),
  );
  ops.backgroundDelivery = () => {};
  const local = await createApp({ storage, operations: ops });
  await new Promise<void>((r) => local.server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${(local.server.address() as any).port}`;
  const request = (
    path: string,
    method = "GET",
    body?: unknown,
    cookie?: string,
    extra: Record<string, string> = {},
  ) =>
    fetch(base + path, {
      method,
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(cookie ? { cookie } : {}),
        ...extra,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  try {
    const email = `${prefix}-route@example.invalid`;
    const user = await storage.registerUser({
      email,
      firstName: "Route",
      lastName: "Fixture",
      passwordHash: await hashPassword(password),
    });
    const p = await storage.createProvider(
      {
        name: "Route Fixture",
        specialty: "Testing",
        email: `${prefix}-route-provider@example.invalid`,
        phone: "+265000000000",
        workingHours: {
          start: "08:00",
          end: "17:00",
          days: [0, 1, 2, 3, 4, 5, 6],
        },
      },
      user.id,
    );
    const s = await storage.createService({
      providerId: p.id,
      name: "Route service",
      price: "2500.00",
      duration: 60,
    });
    process.env.PAYCHANGU_PROVIDER_ID = String(p.id);
    const login = await request("/api/auth/login", "POST", { email, password });
    assert.equal(login.status, 200);
    const cookie = cookieFrom(login);
    assert.equal((await request("/api/operations")).status, 401);
    assert.equal(
      (await request("/api/operations", "GET", undefined, cookie)).status,
      200,
    );
    const known = await request("/api/auth/forgot-password", "POST", { email });
    const unknown = await request("/api/auth/forgot-password", "POST", {
      email: `${prefix}-missing@example.invalid`,
    });
    assert.equal(known.status, 200);
    assert.equal(unknown.status, 200);
    assert.deepEqual(await known.json(), await unknown.json());
    assert.equal((await request("/api/jobs/messages")).status, 401);
    const bookingResponse = await request(
      "/api/appointments",
      "POST",
      {
        providerId: p.id,
        serviceId: s.id,
        clientName: "Route client",
        clientEmail: "route@example.invalid",
        clientPhone: "+265000000000",
        appointmentDate: "2099-01-10",
        startTime: "09:00",
        endTime: "10:00",
      },
      cookie,
    );
    assert.equal(bookingResponse.status, 201);
    const a = await bookingResponse.json();
    assert.equal(
      (await request(`/api/appointments/${a.id}/checkout`, "POST", {})).status,
      403,
    );
    const checkout = await request(
      `/api/appointments/${a.id}/checkout`,
      "POST",
      {},
      cookie,
    );
    assert.equal(checkout.status, 200);
    const payment = await checkout.json();
    assert.equal(
      (await request(`/api/payments/reference/${payment.reference}`)).status,
      403,
    );
    assert.equal(
      (
        await request(
          `/api/payments/reference/${payment.reference}`,
          "GET",
          undefined,
          cookie,
        )
      ).status,
      200,
    );
    const payload = { tx_ref: payment.reference };
    const signature = createHmac(
      "sha256",
      process.env.PAYCHANGU_WEBHOOK_SECRET!,
    )
      .update(JSON.stringify(payload))
      .digest("hex");
    assert.equal(
      (
        await request("/api/payments/webhook", "POST", payload, undefined, {
          Origin: "https://foreign.example",
          Signature: "invalid",
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await request("/api/payments/webhook", "POST", payload, undefined, {
          Origin: "https://foreign.example",
          Signature: signature,
        })
      ).status,
      200,
    );
    assert.equal(
      (await storage.getAppointment(a.id))?.paymentStatus,
      "pending",
    );
    assert.equal(
      (
        await request("/api/auth/register", "POST", {}, undefined, {
          Origin: "https://foreign.example",
        })
      ).status,
      403,
    );
    // A password change between credential read and session creation must not
    // authenticate an old password with the new session version.
    const originalCredential = storage.getCredential.bind(storage);
    const replacementHash = await hashPassword("race-replacement-password");
    storage.getCredential = async (requestedEmail) => {
      const stale = await originalCredential(requestedEmail);
      if (requestedEmail === email) {
        await db.execute(
          sql`update auth_credentials set password_hash=${replacementHash},version=version+1 where user_id=${user.id}`,
        );
        storage.getCredential = originalCredential;
      }
      return stale;
    };
    try {
      assert.equal(
        (await request("/api/auth/login", "POST", { email, password })).status,
        401,
      );
      assert.equal(
        (await request("/api/auth/user", "GET", undefined, cookie)).status,
        401,
      );
    } finally {
      storage.getCredential = originalCredential;
    }
    delete process.env.RESEND_API_KEY;
    assert.equal(
      (await request("/api/auth/forgot-password", "POST", { email })).status,
      503,
    );
  } finally {
    await new Promise<void>((resolve, reject) =>
      local.server.close((e) => (e ? reject(e) : resolve())),
    );
    for (const key of Object.keys(process.env))
      if (!(key in oldEnv)) delete process.env[key];
    Object.assign(process.env, oldEnv);
  }
});
