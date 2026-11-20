import type { Express, RequestHandler } from "express";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { isAuthenticated, authenticatedUserId } from "./auth";
import { positiveId } from "./access";
import { BookingError } from "./scheduling";
import type { IStorage } from "./storage";
import { Operations, equalSecret, minorUnits } from "./operations";
export function registerOperationalRoutes(
  app: Express,
  storage: IStorage,
  ops: Operations,
) {
  const route =
    (handler: RequestHandler): RequestHandler =>
    (req, res, next) => {
      Promise.resolve(handler(req, res, next)).catch(next);
    };
  const canAccess: RequestHandler = route(async (req, res, next) => {
    const id = positiveId(req.params.id);
    if (!id) throw new BookingError("Invalid appointment ID", 400);
    const a = await storage.getAppointment(id);
    if (!a) throw new BookingError("Appointment not found", 404);
    const user = authenticatedUserId(req),
      p = await storage.getProvider(a.providerId);
    if (
      !req.session?.bookingIds?.includes(id) &&
      (!user || (a.clientUserId !== user && p?.ownerUserId !== user))
    )
      throw new BookingError("Appointment access denied", 403);
    res.locals.appointment = a;
    next();
  });
  app.get(
    "/api/operations",
    isAuthenticated,
    route(async (req, res) => {
      const provider = await storage.getProviderByOwnerId(
        authenticatedUserId(req)!,
      );
      if (!provider) throw new BookingError("Provider profile required", 403);
      res
        .set("Cache-Control", "no-store")
        .json(await ops.dashboard(provider.id));
    }),
  );
  app.get(
    "/api/payments/reference/:reference",
    route(async (req, res) => {
      const reference = z
        .string()
        .regex(/^bp-[a-f0-9-]{36}$/)
        .parse(req.params.reference);
      const result = await ops.db?.execute(
        sql`select a.id,a.client_user_id,a.provider_id from payment_intents i join appointments a on a.id=i.appointment_id where i.tx_ref=${reference}`,
      );
      const row = result?.rows[0];
      if (!row) throw new BookingError("Payment reference not found", 404);
      const user = authenticatedUserId(req),
        provider = await storage.getProvider(Number(row.provider_id));
      if (
        !req.session?.bookingIds?.includes(Number(row.id)) &&
        (!user ||
          (row.client_user_id !== user && provider?.ownerUserId !== user))
      )
        throw new BookingError("Payment reference access denied", 403);
      res.set("Cache-Control", "no-store").json({ appointmentId: row.id });
    }),
  );
  app.get(
    "/api/appointments/:id/payment-options",
    canAccess,
    route(async (_req, res) => {
      const a = res.locals.appointment;
      res.set("Cache-Control", "no-store").json({
        enabled:
          ops.paymentReady(a.providerId) &&
          a.status !== "cancelled" &&
          a.paymentStatus !== "completed" &&
          minorUnits(a.paymentAmount ?? "0") > 0n,
        mode: ops.paymentReady(a.providerId)
          ? process.env.PAYCHANGU_MODE
          : null,
      });
    }),
  );
  app.post(
    "/api/appointments/:id/checkout",
    canAccess,
    route(async (req, res) => {
      z.object({}).strict().parse(req.body);
      if (
        !(await storage.consumeAuthAttempt(
          `checkout:${res.locals.appointment.id}`,
          60 * 1000,
          10,
        ))
      )
        throw new BookingError(
          "Too many checkout attempts. Retry shortly.",
          429,
        );
      res
        .set("Cache-Control", "no-store")
        .json(await ops.createCheckout(res.locals.appointment.id));
    }),
  );
  app.post(
    "/api/appointments/:id/verify-payment",
    canAccess,
    route(async (req, res) => {
      const { reference } = z
        .object({
          reference: z
            .string()
            .uuid()
            .transform((v) => `bp-${v}`),
        })
        .strict()
        .parse({
          reference: String(req.body?.reference ?? "").replace(/^bp-/, ""),
        });
      const result = await ops.db?.execute(
        sql`select appointment_id from payment_intents where tx_ref=${reference}`,
      );
      if (Number(result?.rows[0]?.appointment_id) !== res.locals.appointment.id)
        throw new BookingError("Payment reference access denied", 403);
      if (
        !(await storage.consumeAuthAttempt(
          `verify:${reference}`,
          60 * 1000,
          10,
        ))
      )
        throw new BookingError(
          "Too many verification attempts. Retry shortly.",
          429,
        );
      res
        .set("Cache-Control", "no-store")
        .json(await ops.verifyPayment(reference));
    }),
  );
  app.post(
    "/api/payments/webhook",
    route(async (req, res) => {
      const body = (req as typeof req & { rawBody?: Buffer }).rawBody;
      if (!body || !ops.validWebhook(body, req.get("signature") ?? ""))
        throw new BookingError("Invalid webhook signature", 401);
      const reference = z
        .string()
        .regex(/^bp-[a-f0-9-]{36}$/)
        .parse(req.body.tx_ref);
      await ops.verifyPayment(reference);
      res.json({ received: true });
    }),
  );
  app.get(
    "/api/jobs/messages",
    route(async (req, res) => {
      const configured = process.env.CRON_SECRET;
      if (
        !configured ||
        !equalSecret(req.get("authorization") ?? "", `Bearer ${configured}`)
      )
        throw new BookingError("Unauthorized", 401);
      if (!ops.emailReady()) {
        res
          .set("Cache-Control", "no-store")
          .json({
            configured: false,
            accepted: 0,
            failed: 0,
            reason: "Email delivery is not configured",
          });
        return;
      }
      await ops.queueReminders();
      res.set("Cache-Control", "no-store").json(await ops.deliver(20));
    }),
  );
}
