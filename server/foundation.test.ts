import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import type { Express } from "express";
import { createApp } from "./app";
import { MemoryStorage, assertStorageReady } from "./storage";
import type { InsertAppointment } from "@shared/schema";

// Test identities are installed only by this injected test adapter; production
// never reads these headers and has no development authentication bypass.
async function testAuth(app: Express) {
  app.use((req, _res, next) => {
    const subject = req.get("x-test-user");
    req.isAuthenticated = (() =>
      Boolean(subject)) as typeof req.isAuthenticated;
    if (subject)
      req.user = {
        claims: { sub: subject },
        expires_at:
          subject === "expired" ? 1 : Math.floor(Date.now() / 1000) + 3600,
      } as Express.User;
    next();
  });
}

async function fixture() {
  const storage = new MemoryStorage();
  await storage.upsertUser({ id: "owner", email: "owner@example.com" });
  const provider = await storage.createProvider(
    {
      name: "Owner",
      specialty: "Consulting",
      email: "owner@example.com",
      phone: "123",
      workingHours: { start: "09:00", end: "17:00", days: [1, 2, 3, 4, 5] },
    },
    "owner",
  );
  const otherProvider = await storage.createProvider(
    {
      name: "Other",
      specialty: "Consulting",
      email: "other@example.com",
      phone: "456",
    },
    "other",
  );
  const service = await storage.createService({
    providerId: provider.id,
    name: "Consultation",
    duration: 60,
    price: "100.00",
  });
  const { server } = await createApp({ storage, setupAuth: testAuth });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const request = (
    path: string,
    method = "GET",
    body?: unknown,
    subject?: string,
    headers: Record<string, string> = {},
  ) =>
    fetch(`${base}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { "content-type": "application/json" }),
        ...(subject ? { "x-test-user": subject } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const booking: InsertAppointment = {
    providerId: provider.id,
    serviceId: service.id,
    clientName: "Client",
    clientEmail: "client@example.com",
    clientPhone: "123",
    appointmentDate: "2099-01-05",
    startTime: "09:00",
    endTime: "10:00",
  };
  assert.equal(new Date(`${booking.appointmentDate}T00:00:00Z`).getUTCDay(), 1);
  return {
    storage,
    provider,
    otherProvider,
    service,
    booking,
    request,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}

test("service changes require the owning provider and archiving retains booked records", async () => {
  const f = await fixture();
  try {
    const appointment = await (
      await f.request("/api/appointments", "POST", f.booking, "client")
    ).json();
    assert.equal(
      (
        await f.request(
          `/api/services/${f.service.id}`,
          "PATCH",
          { name: "Unauthorized" },
          "other",
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await f.request(
          `/api/services/${f.service.id}`,
          "DELETE",
          undefined,
          "other",
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await f.request(
          `/api/services/${f.service.id}`,
          "PATCH",
          { providerId: f.otherProvider.id },
          "owner",
        )
      ).status,
      400,
    );
    const updated = await f.request(
      `/api/services/${f.service.id}`,
      "PATCH",
      { name: "Updated consultation", price: "150.00" },
      "owner",
    );
    assert.equal(updated.status, 200);
    assert.equal((await updated.json()).providerId, f.provider.id);
    assert.equal(
      (await f.storage.getAppointment(appointment.id))!.paymentAmount,
      "100.00",
    );
    assert.equal(
      (
        await f.request(
          `/api/services/${f.service.id}`,
          "DELETE",
          undefined,
          "owner",
        )
      ).status,
      204,
    );
    assert.equal(
      (await f.storage.getAppointment(appointment.id))!.id,
      appointment.id,
    );
    assert.equal((await f.storage.getService(f.service.id))!.isActive, false);
    assert.equal(
      (
        await f.request(
          `/api/appointments/${appointment.id}`,
          "PATCH",
          { status: "completed" },
          "owner",
        )
      ).status,
      200,
    );
  } finally {
    await f.close();
  }
});

test("clients can reschedule and cancel only their own active future bookings", async () => {
  const f = await fixture();
  try {
    const appointment = await (
      await f.request("/api/appointments", "POST", f.booking, "client")
    ).json();
    const path = `/api/appointments/${appointment.id}`;
    const time = {
      appointmentDate: "2099-01-05",
      startTime: "11:00",
      endTime: "12:00",
    };
    assert.equal(
      (await f.request(`${path}/reschedule`, "PATCH", time)).status,
      401,
    );
    assert.equal(
      (await f.request(`${path}/reschedule`, "PATCH", time, "other")).status,
      403,
    );
    assert.equal(
      (await f.request(`${path}/cancel`, "POST", {}, "other")).status,
      403,
    );
    assert.equal(
      (
        await f.request(
          `${path}/reschedule`,
          "PATCH",
          { ...time, providerId: f.otherProvider.id },
          "client",
        )
      ).status,
      400,
    );
    const response = await f.request(
      `${path}/reschedule`,
      "PATCH",
      time,
      "client",
    );
    assert.equal(response.status, 200);
    const saved = await response.json();
    assert.equal(saved.clientUserId, "client");
    assert.equal(saved.paymentAmount, "100.00");
    assert.equal(saved.startTime, "11:00");
    assert.equal(
      (
        await f.request(
          `${path}/cancel`,
          "POST",
          { status: "completed" },
          "client",
        )
      ).status,
      400,
    );
    assert.equal(
      (await f.request(`${path}/cancel`, "POST", {}, "client")).status,
      200,
    );
    assert.equal(
      (await f.storage.getAppointment(appointment.id))!.status,
      "cancelled",
    );
    assert.equal(
      (await f.request(`${path}/reschedule`, "PATCH", time, "client")).status,
      409,
    );
  } finally {
    await f.close();
  }
});

test("public bookings reject past times before writing a record", async () => {
  const f = await fixture();
  try {
    assert.equal(
      (
        await f.request("/api/appointments", "POST", {
          ...f.booking,
          appointmentDate: "2000-01-03",
        })
      ).status,
      400,
    );
  } finally {
    await f.close();
  }
});

for (const path of [
  "/api/auth/user",
  "/api/providers/1/appointments",
  "/api/providers/1/memos",
  "/api/providers/1/tasks",
  "/api/analytics/1",
]) {
  test(`anonymous access is rejected: ${path}`, async () => {
    const f = await fixture();
    try {
      assert.equal((await f.request(path)).status, 401);
    } finally {
      await f.close();
    }
  });
}

test("anonymous private mutations require authentication before validating input", async () => {
  const f = await fixture();
  try {
    for (const [path, method] of [
      ["/api/providers", "POST"],
      ["/api/services", "POST"],
      ["/api/memos", "POST"],
      ["/api/tasks", "POST"],
      ["/api/appointments/1", "PATCH"],
      ["/api/appointments/1", "DELETE"],
      ["/api/providers/1", "PATCH"],
      ["/api/reviews", "POST"],
      ["/api/providers/1/update-rating", "POST"],
      ["/api/memos/1", "PATCH"],
      ["/api/memos/1", "DELETE"],
      ["/api/tasks/1", "PATCH"],
      ["/api/tasks/1", "DELETE"],
    ]) {
      assert.equal(
        (await f.request(path, method, {})).status,
        401,
        `${method} ${path}`,
      );
    }
  } finally {
    await f.close();
  }
});

test("auth endpoint returns the stored principal and rejects expired or unknown identities", async () => {
  const f = await fixture();
  try {
    const response = await f.request(
      "/api/auth/user",
      "GET",
      undefined,
      "owner",
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal((await response.json()).id, "owner");
    for (const identity of ["expired", "unknown"])
      assert.equal(
        (await f.request("/api/auth/user", "GET", undefined, identity)).status,
        401,
      );
  } finally {
    await f.close();
  }
});

test("provider ownership isolates lists, analytics, creation and unowned sample records", async () => {
  const f = await fixture();
  try {
    for (const path of [
      `/api/providers/${f.provider.id}/appointments`,
      `/api/providers/${f.provider.id}/memos`,
      `/api/providers/${f.provider.id}/tasks`,
      `/api/analytics/${f.provider.id}`,
    ]) {
      assert.equal(
        (await f.request(path, "GET", undefined, "other")).status,
        403,
      );
      assert.equal(
        (await f.request(path, "GET", undefined, "owner")).status,
        200,
      );
    }
    assert.equal(
      (await f.request("/api/providers/1/memos", "GET", undefined, "owner"))
        .status,
      403,
    );
    assert.equal(
      (
        await f.request(
          "/api/memos",
          "POST",
          { providerId: f.provider.id, title: "Secret", content: "Private" },
          "other",
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await f.request(
          `/api/providers/${f.provider.id}oops/memos`,
          "GET",
          undefined,
          "owner",
        )
      ).status,
      400,
    );
    const response = await f.request("/api/providers");
    assert.equal(response.status, 200);
    assert.ok(
      (await response.json()).every(
        (provider: object) => !("ownerUserId" in provider),
      ),
    );
    assert.equal(
      (
        await f.request(
          "/api/providers",
          "POST",
          {
            name: "Claim",
            specialty: "Test",
            email: "claim@example.com",
            phone: "123",
            ownerUserId: "other",
          },
          "owner",
        )
      ).status,
      400,
    );
  } finally {
    await f.close();
  }
});

test("record mutation checks the stored owner and rejects parent reassignment", async () => {
  const f = await fixture();
  try {
    const appointment = await f.storage.createAppointment(f.booking);
    const memo = await f.storage.createMemo({
      providerId: f.provider.id,
      title: "Memo",
      content: "Private",
    });
    const task = await f.storage.createTask({
      providerId: f.provider.id,
      title: "Task",
    });
    for (const [plural, id] of [
      ["appointments", appointment.id],
      ["memos", memo.id],
      ["tasks", task.id],
    ] as const) {
      assert.equal(
        (await f.request(`/api/${plural}/${id}`, "PATCH", {}, "other")).status,
        403,
      );
      assert.equal(
        (await f.request(`/api/${plural}/${id}`, "DELETE", undefined, "other"))
          .status,
        403,
      );
      assert.equal(
        (
          await f.request(
            `/api/${plural}/${id}`,
            "PATCH",
            { providerId: f.otherProvider.id },
            "owner",
          )
        ).status,
        400,
      );
      assert.equal(
        (await f.request(`/api/${plural}/${id}`, "PATCH", {}, "owner")).status,
        200,
      );
      assert.equal(
        (await f.request(`/api/${plural}/${id}`, "DELETE", undefined, "owner"))
          .status,
        204,
      );
    }
  } finally {
    await f.close();
  }
});

test("public booking derives unpaid price and rejects forged financial fields", async () => {
  const f = await fixture();
  try {
    assert.equal(
      (
        await f.request("/api/appointments", "POST", {
          ...f.booking,
          paymentStatus: "completed",
          paymentAmount: "0.00",
        })
      ).status,
      400,
    );
    const response = await f.request("/api/appointments", "POST", f.booking);
    assert.equal(response.status, 201);
    const saved = await response.json();
    assert.equal(saved.paymentStatus, "pending");
    assert.equal(saved.paymentAmount, "100.00");
    assert.equal(saved.stripePaymentId, null);
  } finally {
    await f.close();
  }
});

test("concurrent overlapping bookings produce one 201 and one 409", async () => {
  const f = await fixture();
  try {
    const responses = await Promise.all([
      f.request("/api/appointments", "POST", f.booking),
      f.request("/api/appointments", "POST", {
        ...f.booking,
        startTime: "09:30",
        endTime: "10:30",
      }),
    ]);
    assert.deepEqual(
      responses.map((response) => response.status).sort(),
      [201, 409],
    );
    assert.equal(
      (await f.storage.getAppointmentsByProvider(f.provider.id)).length,
      1,
    );
  } finally {
    await f.close();
  }
});

test("availability accounts for full duration, overlaps, cancellation and closing time", async () => {
  const f = await fixture();
  try {
    const appointment = await f.storage.createAppointment({
      ...f.booking,
      startTime: "10:00",
      endTime: "11:00",
    });
    let response = await f.request(
      `/api/providers/${f.provider.id}/available-slots?date=${f.booking.appointmentDate}&serviceId=${f.service.id}`,
    );
    assert.equal(response.status, 200);
    let slots: string[] = await response.json();
    assert.ok(slots.includes("09:00"));
    for (const slot of ["09:30", "10:00", "10:30", "16:30"])
      assert.ok(!slots.includes(slot), slot);
    await f.storage.updateAppointment(appointment.id, { status: "cancelled" });
    response = await f.request(
      `/api/providers/${f.provider.id}/available-slots?date=${f.booking.appointmentDate}&serviceId=${f.service.id}`,
    );
    slots = await response.json();
    assert.ok(slots.includes("10:00"));
    assert.equal(
      (
        await f.request(
          `/api/providers/${f.provider.id}/available-slots?date=2099-02-30`,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await f.request(
          `/api/providers/${f.provider.id}/available-slots?date=${f.booking.appointmentDate}&serviceId=1`,
        )
      ).status,
      400,
    );
  } finally {
    await f.close();
  }
});

test("booking rejects invalid calendar values, service mismatch, reversed intervals and closed hours", async () => {
  const f = await fixture();
  try {
    for (const override of [
      { appointmentDate: "2099-02-30" },
      { startTime: "25:00" },
      { startTime: "10:00", endTime: "09:00" },
      { serviceId: 1 },
      { startTime: "16:30", endTime: "17:30" },
      { startTime: "09:00", endTime: "09:30" },
      { appointmentDate: "2099-01-04" },
    ]) {
      assert.equal(
        (
          await f.request("/api/appointments", "POST", {
            ...f.booking,
            ...override,
          })
        ).status,
        400,
        JSON.stringify(override),
      );
    }
  } finally {
    await f.close();
  }
});

test("rescheduling is conflict checked without moving the original booking", async () => {
  const f = await fixture();
  try {
    await f.storage.createAppointment(f.booking);
    const appointment = await f.storage.createAppointment({
      ...f.booking,
      startTime: "11:00",
      endTime: "12:00",
    });
    assert.equal(
      (
        await f.request(
          `/api/appointments/${appointment.id}`,
          "PATCH",
          { startTime: "09:30", endTime: "10:30" },
          "owner",
        )
      ).status,
      409,
    );
    assert.equal(
      (await f.storage.getAppointment(appointment.id))?.startTime,
      "11:00",
    );
  } finally {
    await f.close();
  }
});

test("cross-origin writes fail and unknown API endpoints return JSON 404", async () => {
  const f = await fixture();
  try {
    assert.equal(
      (
        await f.request("/api/appointments", "POST", f.booking, undefined, {
          origin: "https://attacker.example",
        })
      ).status,
      403,
    );
    const response = await f.request("/api/no-such-route");
    assert.equal(response.status, 404);
    assert.equal((await response.json()).message, "API route not found");
  } finally {
    await f.close();
  }
});

test("unexpected API errors are redacted and the server continues serving", async () => {
  const f = await fixture();
  try {
    f.storage.getProviders = async () => {
      throw new Error("sensitive database detail");
    };
    const response = await f.request("/api/providers");
    assert.equal(response.status, 500);
    assert.equal((await response.json()).message, "Internal Server Error");
    assert.equal((await f.request("/api/health")).status, 200);
  } finally {
    await f.close();
  }
});

test("production cannot silently use volatile development records", () => {
  assert.throws(() => assertStorageReady("production"), /durable storage/);
  assert.doesNotThrow(() => assertStorageReady("development"));
});

test("the default auth adapter requires a session and provides the login entrypoint", async () => {
  const { server } = await createApp();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    assert.equal((await fetch(`${base}/api/auth/user`)).status, 401);
    assert.equal((await fetch(`${base}/api/providers/1/memos`)).status, 401);
    assert.equal(
      (await fetch(`${base}/api/login`, { redirect: "manual" })).status,
      302,
    );
    assert.equal((await fetch(`${base}/api/providers`)).status, 200);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test("query-key date and service parameters reach the API URL", async () => {
  const { getQueryFn } = await import("../client/src/lib/queryClient");
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  let requested = "";
  try {
    globalThis.window = {
      location: { origin: "https://booking.example" },
    } as Window & typeof globalThis;
    globalThis.fetch = async (input) => {
      requested = String(input);
      return new Response("[]", { status: 200 });
    };
    const query = getQueryFn({ on401: "throw" });
    await query({
      queryKey: [
        "/api/providers/1/available-slots",
        { date: "2099-01-05", serviceId: 2 },
      ],
      signal: new AbortController().signal,
    } as Parameters<typeof query>[0]);
    assert.equal(
      requested,
      "/api/providers/1/available-slots?date=2099-01-05&serviceId=2",
    );
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
  }
});

test("production login requires durable sessions, a strong secret and a canonical HTTPS origin", async () => {
  const { authConfiguration } = await import("./auth");
  const previous = {
    node: process.env.NODE_ENV,
    secret: process.env.SESSION_SECRET,
    origin: process.env.APP_ORIGIN,
  };
  try {
    process.env.NODE_ENV = "production";
    process.env.SESSION_SECRET = "too-short";
    process.env.APP_ORIGIN = "https://booking.example";
    assert.throws(
      () => authConfiguration(new MemoryStorage()),
      /SESSION_SECRET/,
    );
    process.env.SESSION_SECRET = "test-secret-at-least-thirty-two-characters";
    process.env.APP_ORIGIN = "https://booking.example/path";
    assert.throws(() => authConfiguration(new MemoryStorage()), /APP_ORIGIN/);
    process.env.APP_ORIGIN = "https://booking.example";
    assert.throws(() => authConfiguration(new MemoryStorage()), /PostgreSQL/);
  } finally {
    for (const [key, value] of Object.entries({
      NODE_ENV: previous.node,
      SESSION_SECRET: previous.secret,
      APP_ORIGIN: previous.origin,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("collection totals preserve exact decimal amounts", async () => {
  const { sumAmounts } = await import("../shared/money");
  assert.equal(sumAmounts(["0.10", "0.20", null]), "0.30");
  assert.equal(
    sumAmounts(["99999999.99", "99999999.99", "0.02"]),
    "200000000.00",
  );
});
