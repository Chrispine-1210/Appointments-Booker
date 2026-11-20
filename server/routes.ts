import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "node:http";
import type { IStorage } from "./storage";
import { createStorage } from "./db";
import { setupAuth, isAuthenticated, authenticatedUserId } from "./auth";
import { registerAnalyticsRoutes } from "./routes-analytics";
import { providerAccess, recordAccess, positiveId } from "./access";
import {
  insertProviderSchema,
  insertServiceSchema,
  insertAppointmentSchema,
  insertMemoSchema,
  insertTaskSchema,
} from "@shared/schema";
import { z } from "zod";
import { validDate, timeMinutes } from "./scheduling";

const publicBookingSchema = insertAppointmentSchema
  .omit({
    paymentStatus: true,
    paymentAmount: true,
    stripePaymentId: true,
    status: true,
  })
  .extend({ status: z.literal("confirmed").optional() })
  .strict();
const appointmentUpdateSchema = insertAppointmentSchema
  .omit({
    paymentStatus: true,
    paymentAmount: true,
    stripePaymentId: true,
  })
  .extend({
    status: z.enum(["pending", "confirmed", "cancelled", "completed"]),
  })
  .partial()
  .strict();
const publicProvider = ({
  ownerUserId: _owner,
  ...provider
}: Awaited<ReturnType<IStorage["createProvider"]>>) => provider;

export async function registerRoutes(
  app: Express,
  options: { storage?: IStorage; setupAuth?: typeof setupAuth } = {},
): Promise<Server> {
  const storage = options.storage ?? (await createStorage());
  await (options.setupAuth ?? setupAuth)(app, storage);
  registerAnalyticsRoutes(app, storage);

  const route =
    (handler: RequestHandler): RequestHandler =>
    (req, res, next) => {
      Promise.resolve(handler(req, res, next)).catch(next);
    };
  const ownProvider = (key = "providerId") =>
    providerAccess(storage, "params", key);
  const ownBody = providerAccess(storage, "body", "providerId");

  app.get(
    "/api/auth/user",
    isAuthenticated,
    route(async (req, res) => {
      res.set("Cache-Control", "no-store");
      const user = await storage.getUser(authenticatedUserId(req)!);
      if (!user) return res.status(401).json({ message: "Unauthorized" });
      const provider = await storage.getProviderByOwnerId(user.id);
      res.json({ ...user, providerId: provider?.id ?? null });
    }),
  );
  app.get("/api/health", (_req, res) =>
    res.json({
      status: "healthy",
      storage: storage.kind,
      timestamp: new Date().toISOString(),
    }),
  );
  app.get(
    "/api/providers/me",
    isAuthenticated,
    route(async (req, res) => {
      res.set("Cache-Control", "no-store");
      const provider = await storage.getProviderByOwnerId(
        authenticatedUserId(req)!,
      );
      if (!provider)
        return res
          .status(404)
          .json({ message: "Create your provider profile first" });
      res.json(publicProvider(provider));
    }),
  );
  app.post(
    "/api/providers/onboard",
    isAuthenticated,
    route(async (req, res) => {
      const input = z
        .object({
          profile: insertProviderSchema.strict(),
          service: insertServiceSchema.omit({ providerId: true }).strict(),
        })
        .strict()
        .parse(req.body);
      const result = await storage.onboardProvider(
        input.profile,
        input.service,
        authenticatedUserId(req)!,
      );
      res.status(201).json({
        provider: publicProvider(result.provider),
        service: result.service,
      });
    }),
  );
  app.get(
    "/api/providers",
    route(async (_req, res) =>
      res.json((await storage.getProviders()).map(publicProvider)),
    ),
  );
  app.get(
    "/api/providers/:id",
    route(async (req, res) => {
      const id = positiveId(req.params.id);
      if (!id) return res.status(400).json({ message: "Invalid provider ID" });
      const provider = await storage.getProvider(id);
      if (!provider)
        return res.status(404).json({ message: "Provider not found" });
      res.json(publicProvider(provider));
    }),
  );
  app.post(
    "/api/providers",
    isAuthenticated,
    route(async (req, res) => {
      const data = insertProviderSchema.strict().parse(req.body);
      res
        .status(201)
        .json(
          publicProvider(
            await storage.createProvider(data, authenticatedUserId(req)!),
          ),
        );
    }),
  );
  app.patch(
    "/api/providers/:id",
    isAuthenticated,
    ownProvider("id"),
    route(async (req, res) => {
      const data = insertProviderSchema.partial().strict().parse(req.body);
      res.json(
        publicProvider(
          (await storage.updateProvider(Number(req.params.id), data))!,
        ),
      );
    }),
  );
  app.get(
    "/api/providers/:providerId/services",
    route(async (req, res) => {
      const id = positiveId(req.params.providerId);
      if (!id) return res.status(400).json({ message: "Invalid provider ID" });
      res.json(await storage.getServicesByProvider(id));
    }),
  );
  app.post(
    "/api/services",
    isAuthenticated,
    ownBody,
    route(async (req, res) => {
      const data = insertServiceSchema.strict().parse(req.body);
      res.status(201).json(await storage.createService(data));
    }),
  );
  for (const method of ["patch", "delete"] as const) {
    app[method](
      "/api/services/:id",
      isAuthenticated,
      route(async (req, res) => {
        const id = positiveId(req.params.id);
        if (!id) return res.status(400).json({ message: "Invalid service ID" });
        const service = await storage.getService(id);
        const provider = service
          ? await storage.getProvider(service.providerId)
          : undefined;
        if (!service)
          return res.status(404).json({ message: "Service not found" });
        if (
          !provider?.ownerUserId ||
          provider.ownerUserId !== authenticatedUserId(req)
        )
          return res.status(403).json({ message: "Service access denied" });
        if (method === "delete") {
          await storage.deleteService(id);
          return res.status(204).send();
        }
        const data = insertServiceSchema
          .omit({ providerId: true })
          .partial()
          .strict()
          .parse(req.body);
        res.json(await storage.updateService(id, data));
      }),
    );
  }
  app.get(
    "/api/providers/:providerId/timeslots",
    route(async (req, res) => {
      const id = positiveId(req.params.providerId);
      if (!id) return res.status(400).json({ message: "Invalid provider ID" });
      res.json(await storage.getTimeSlotsByProvider(id));
    }),
  );
  app.get(
    "/api/providers/:providerId/available-slots",
    route(async (req, res) => {
      const id = positiveId(req.params.providerId);
      if (
        !id ||
        typeof req.query.date !== "string" ||
        !validDate(req.query.date)
      ) {
        return res.status(400).json({
          message: "A valid provider ID and YYYY-MM-DD date are required",
        });
      }
      let duration = 30;
      if (req.query.serviceId !== undefined) {
        const serviceId = positiveId(req.query.serviceId);
        const service = serviceId
          ? await storage.getService(serviceId)
          : undefined;
        if (!service || !service.isActive || service.providerId !== id) {
          return res
            .status(400)
            .json({ message: "Invalid service for this provider" });
        }
        duration = service.duration;
      }
      res.json(await storage.getAvailableSlots(id, req.query.date, duration));
    }),
  );
  app.get(
    "/api/providers/:providerId/appointments",
    isAuthenticated,
    ownProvider(),
    route(async (req, res) => {
      res.set("Cache-Control", "no-store");
      const id = Number(req.params.providerId);
      const date = req.query.date;
      if (
        date !== undefined &&
        (typeof date !== "string" || !validDate(date))
      ) {
        return res.status(400).json({ message: "Invalid date" });
      }
      res.json(
        typeof date === "string"
          ? await storage.getAppointmentsByDate(id, date)
          : await storage.getAppointmentsByProvider(id),
      );
    }),
  );
  app.post(
    "/api/appointments",
    route(async (req, res) => {
      const data = publicBookingSchema.parse(req.body);
      if (
        new Date(
          `${data.appointmentDate}T${data.startTime}:00+02:00`,
        ).getTime() <= Date.now()
      )
        return res
          .status(400)
          .json({ message: "Choose a future appointment time" });
      const service = await storage.getService(data.serviceId);
      if (
        !service?.isActive ||
        service.providerId !== data.providerId ||
        timeMinutes(data.endTime) - timeMinutes(data.startTime) !==
          service.duration
      ) {
        return res.status(400).json({
          message: "Service and duration must match the selected provider",
        });
      }
      const appointment = await storage.createAppointment({
        ...data,
        clientUserId: authenticatedUserId(req) ?? null,
        status: "confirmed",
        paymentStatus: "pending",
        paymentAmount: service.price,
        stripePaymentId: null,
      });
      if (req.session) {
        req.session.bookingIds = [
          ...(req.session.bookingIds ?? []),
          appointment.id,
        ].slice(-50);
        await new Promise<void>((resolve, reject) =>
          req.session.save((error) => (error ? reject(error) : resolve())),
        );
      }
      res.status(201).json(appointment);
    }),
  );
  app.get(
    "/api/appointments/my",
    isAuthenticated,
    route(async (req, res) => {
      res
        .set("Cache-Control", "no-store")
        .json(await storage.getAppointmentsByClient(authenticatedUserId(req)!));
    }),
  );
  app.get(
    "/api/appointments/:id",
    route(async (req, res) => {
      const id = positiveId(req.params.id);
      if (!id)
        return res.status(400).json({ message: "Invalid appointment ID" });
      const appointment = await storage.getAppointment(id);
      if (!appointment)
        return res.status(404).json({ message: "Appointment not found" });
      const subject = authenticatedUserId(req);
      const provider = subject
        ? await storage.getProvider(appointment.providerId)
        : undefined;
      if (
        !req.session?.bookingIds?.includes(id) &&
        (!subject ||
          (appointment.clientUserId !== subject &&
            provider?.ownerUserId !== subject))
      )
        return res.status(403).json({ message: "Appointment access denied" });
      res.set("Cache-Control", "no-store").json(appointment);
    }),
  );
  app.patch(
    "/api/appointments/:id",
    isAuthenticated,
    recordAccess(storage, "Appointment"),
    route(async (req, res) => {
      const data = appointmentUpdateSchema.parse(req.body);
      const existing = (await storage.getAppointment(Number(req.params.id)))!;
      const updated = { ...existing, ...data };
      const service = await storage.getService(updated.serviceId);
      const changesTime =
        data.serviceId !== undefined ||
        data.appointmentDate !== undefined ||
        data.startTime !== undefined ||
        data.endTime !== undefined ||
        (existing.status === "cancelled" &&
          data.status !== undefined &&
          data.status !== "cancelled");
      if (
        changesTime &&
        (!service?.isActive ||
          service.providerId !== updated.providerId ||
          timeMinutes(updated.endTime) - timeMinutes(updated.startTime) !==
            service.duration)
      ) {
        return res.status(400).json({ message: "Invalid service or duration" });
      }
      res.json(await storage.updateAppointment(existing.id, data));
    }),
  );
  for (const action of ["cancel", "reschedule"] as const) {
    app[action === "cancel" ? "post" : "patch"](
      `/api/appointments/:id/${action}`,
      isAuthenticated,
      route(async (req, res) => {
        const id = positiveId(req.params.id);
        if (!id)
          return res.status(400).json({ message: "Invalid appointment ID" });
        const existing = await storage.getAppointment(id);
        if (!existing)
          return res.status(404).json({ message: "Appointment not found" });
        const subject = authenticatedUserId(req)!;
        const provider = await storage.getProvider(existing.providerId);
        const owner = provider?.ownerUserId === subject;
        if (!owner && existing.clientUserId !== subject)
          return res.status(403).json({ message: "Appointment access denied" });
        if (!["pending", "confirmed"].includes(existing.status))
          return res
            .status(409)
            .json({ message: "Only active appointments can be changed" });
        if (
          !owner &&
          new Date(
            `${existing.appointmentDate}T${existing.startTime}:00+02:00`,
          ).getTime() <= Date.now()
        )
          return res.status(409).json({
            message: "Contact your professional about a past appointment",
          });
        if (action === "cancel") {
          z.object({}).strict().parse(req.body);
          return res.json(
            await storage.updateAppointment(id, { status: "cancelled" }),
          );
        }
        const data = insertAppointmentSchema
          .pick({ appointmentDate: true, startTime: true, endTime: true })
          .strict()
          .parse(req.body);
        const service = await storage.getService(existing.serviceId);
        if (
          !service?.isActive ||
          service.providerId !== existing.providerId ||
          timeMinutes(data.endTime) - timeMinutes(data.startTime) !==
            service.duration
        )
          return res
            .status(400)
            .json({ message: "Service and duration must match" });
        if (
          new Date(
            `${data.appointmentDate}T${data.startTime}:00+02:00`,
          ).getTime() <= Date.now()
        )
          return res
            .status(400)
            .json({ message: "Choose a future appointment time" });
        res.json(await storage.updateAppointment(id, data));
      }),
    );
  }
  app.delete(
    "/api/appointments/:id",
    isAuthenticated,
    recordAccess(storage, "Appointment"),
    route(async (req, res) => {
      await storage.deleteAppointment(Number(req.params.id));
      res.status(204).send();
    }),
  );

  // Every private list and mutation requires both a session and provider ownership.
  for (const [plural, kind, schema] of [
    ["memos", "Memo", insertMemoSchema],
    ["tasks", "Task", insertTaskSchema],
  ] as const) {
    app.get(
      `/api/providers/:providerId/${plural}`,
      isAuthenticated,
      ownProvider(),
      route(async (req, res) => {
        res.set("Cache-Control", "no-store");
        res.json(
          await storage[`get${kind}sByProvider`](Number(req.params.providerId)),
        );
      }),
    );
    app.post(
      `/api/${plural}`,
      isAuthenticated,
      ownBody,
      route(async (req, res) => {
        const data = schema.strict().parse(req.body);
        const result =
          kind === "Memo"
            ? await storage.createMemo(insertMemoSchema.parse(data))
            : await storage.createTask(insertTaskSchema.parse(data));
        res.status(201).json(result);
      }),
    );
    app.patch(
      `/api/${plural}/:id`,
      isAuthenticated,
      recordAccess(storage, kind),
      route(async (req, res) => {
        const data = schema.partial().strict().parse(req.body);
        const id = Number(req.params.id);
        res.json(
          kind === "Memo"
            ? await storage.updateMemo(
                id,
                insertMemoSchema.partial().parse(data),
              )
            : await storage.updateTask(
                id,
                insertTaskSchema.partial().parse(data),
              ),
        );
      }),
    );
    app.delete(
      `/api/${plural}/:id`,
      isAuthenticated,
      recordAccess(storage, kind),
      route(async (req, res) => {
        await storage[`delete${kind}`](Number(req.params.id));
        res.status(204).send();
      }),
    );
  }
  app.use("/api", (_req, res) =>
    res.status(404).json({ message: "API route not found" }),
  );
  return createServer(app);
}
