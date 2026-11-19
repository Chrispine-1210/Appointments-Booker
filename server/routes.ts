import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "node:http";
import { storage as defaultStorage, type IStorage } from "./storage";
import { setupAuth, isAuthenticated, authenticatedUserId } from "./replitAuth";
import { registerAnalyticsRoutes } from "./routes-analytics";
import { providerAccess, recordAccess, positiveId, sameOrigin } from "./access";
import {
  insertProviderSchema, insertServiceSchema, insertAppointmentSchema,
  insertMemoSchema, insertTaskSchema,
} from "@shared/schema";
import { z } from "zod";
import { validDate, timeMinutes } from "./scheduling";

const publicBookingSchema = insertAppointmentSchema.omit({
  paymentStatus: true, paymentAmount: true, stripePaymentId: true, status: true,
}).extend({ status: z.literal("confirmed").optional() }).strict();
const appointmentUpdateSchema = insertAppointmentSchema.omit({
  paymentStatus: true, paymentAmount: true, stripePaymentId: true,
}).extend({ status: z.enum(["pending", "confirmed", "cancelled", "completed"]) }).partial().strict();
const publicProvider = ({ ownerUserId: _owner, ...provider }: Awaited<ReturnType<IStorage["createProvider"]>>) => provider;

export async function registerRoutes(
  app: Express,
  options: { storage?: IStorage; setupAuth?: typeof setupAuth } = {},
): Promise<Server> {
  const storage = options.storage ?? defaultStorage;
  await (options.setupAuth ?? setupAuth)(app);
  app.use("/api", sameOrigin);
  registerAnalyticsRoutes(app, storage);

  const route = (handler: RequestHandler): RequestHandler => (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
  const ownProvider = (key = "providerId") => providerAccess(storage, "params", key);
  const ownBody = providerAccess(storage, "body", "providerId");

  app.get("/api/auth/user", isAuthenticated, route(async (req, res) => {
    res.set("Cache-Control", "no-store");
    const user = await storage.getUser(authenticatedUserId(req)!);
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    res.json(user);
  }));
  app.get("/api/health", (_req, res) => res.json({ status: "healthy", storage: "memory", timestamp: new Date().toISOString() }));
  app.get("/api/providers", route(async (_req, res) => res.json((await storage.getProviders()).map(publicProvider))));
  app.get("/api/providers/:id", route(async (req, res) => {
    const id = positiveId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid provider ID" });
    const provider = await storage.getProvider(id);
    if (!provider) return res.status(404).json({ message: "Provider not found" });
    res.json(publicProvider(provider));
  }));
  app.post("/api/providers", isAuthenticated, route(async (req, res) => {
    const data = insertProviderSchema.strict().parse(req.body);
    res.status(201).json(publicProvider(await storage.createProvider(data, authenticatedUserId(req)!)));
  }));
  app.patch("/api/providers/:id", isAuthenticated, ownProvider("id"), route(async (req, res) => {
    const data = insertProviderSchema.partial().strict().parse(req.body);
    res.json(publicProvider((await storage.updateProvider(Number(req.params.id), data))!));
  }));
  app.get("/api/providers/:providerId/services", route(async (req, res) => {
    const id = positiveId(req.params.providerId);
    if (!id) return res.status(400).json({ message: "Invalid provider ID" });
    res.json(await storage.getServicesByProvider(id));
  }));
  app.post("/api/services", isAuthenticated, ownBody, route(async (req, res) => {
    const data = insertServiceSchema.strict().parse(req.body);
    res.status(201).json(await storage.createService(data));
  }));
  app.get("/api/providers/:providerId/timeslots", route(async (req, res) => {
    const id = positiveId(req.params.providerId);
    if (!id) return res.status(400).json({ message: "Invalid provider ID" });
    res.json(await storage.getTimeSlotsByProvider(id));
  }));
  app.get("/api/providers/:providerId/available-slots", route(async (req, res) => {
    const id = positiveId(req.params.providerId);
    if (!id || typeof req.query.date !== "string" || !validDate(req.query.date)) {
      return res.status(400).json({ message: "A valid provider ID and YYYY-MM-DD date are required" });
    }
    let duration = 30;
    if (req.query.serviceId !== undefined) {
      const serviceId = positiveId(req.query.serviceId);
      const service = serviceId ? await storage.getService(serviceId) : undefined;
      if (!service || !service.isActive || service.providerId !== id) {
        return res.status(400).json({ message: "Invalid service for this provider" });
      }
      duration = service.duration;
    }
    res.json(await storage.getAvailableSlots(id, req.query.date, duration));
  }));
  app.get("/api/providers/:providerId/appointments", isAuthenticated, ownProvider(), route(async (req, res) => {
    res.set("Cache-Control", "no-store");
    const id = Number(req.params.providerId);
    const date = req.query.date;
    if (date !== undefined && (typeof date !== "string" || !validDate(date))) {
      return res.status(400).json({ message: "Invalid date" });
    }
    res.json(typeof date === "string" ? await storage.getAppointmentsByDate(id, date) : await storage.getAppointmentsByProvider(id));
  }));
  app.post("/api/appointments", route(async (req, res) => {
    const data = publicBookingSchema.parse(req.body);
    const service = await storage.getService(data.serviceId);
    if (!service?.isActive || service.providerId !== data.providerId || timeMinutes(data.endTime) - timeMinutes(data.startTime) !== service.duration) {
      return res.status(400).json({ message: "Service and duration must match the selected provider" });
    }
    const appointment = await storage.createAppointment({ ...data, status: "confirmed", paymentStatus: "pending", paymentAmount: service.price, stripePaymentId: null });
    res.status(201).json(appointment);
  }));
  app.patch("/api/appointments/:id", isAuthenticated, recordAccess(storage, "Appointment"), route(async (req, res) => {
    const data = appointmentUpdateSchema.parse(req.body);
    const existing = (await storage.getAppointment(Number(req.params.id)))!;
    const updated = { ...existing, ...data };
    const service = await storage.getService(updated.serviceId);
    if (!service?.isActive || service.providerId !== updated.providerId || timeMinutes(updated.endTime) - timeMinutes(updated.startTime) !== service.duration) {
      return res.status(400).json({ message: "Invalid service or duration" });
    }
    res.json(await storage.updateAppointment(existing.id, data));
  }));
  app.delete("/api/appointments/:id", isAuthenticated, recordAccess(storage, "Appointment"), route(async (req, res) => {
    await storage.deleteAppointment(Number(req.params.id));
    res.status(204).send();
  }));

  // Every private list and mutation requires both a session and provider ownership.
  for (const [plural, kind, schema] of [["memos", "Memo", insertMemoSchema], ["tasks", "Task", insertTaskSchema]] as const) {
    app.get(`/api/providers/:providerId/${plural}`, isAuthenticated, ownProvider(), route(async (req, res) => {
      res.set("Cache-Control", "no-store");
      res.json(await storage[`get${kind}sByProvider`](Number(req.params.providerId)));
    }));
    app.post(`/api/${plural}`, isAuthenticated, ownBody, route(async (req, res) => {
      const data = schema.strict().parse(req.body);
      const result = kind === "Memo" ? await storage.createMemo(insertMemoSchema.parse(data)) : await storage.createTask(insertTaskSchema.parse(data));
      res.status(201).json(result);
    }));
    app.patch(`/api/${plural}/:id`, isAuthenticated, recordAccess(storage, kind), route(async (req, res) => {
      const data = schema.partial().strict().parse(req.body);
      const id = Number(req.params.id);
      res.json(kind === "Memo" ? await storage.updateMemo(id, insertMemoSchema.partial().parse(data)) : await storage.updateTask(id, insertTaskSchema.partial().parse(data)));
    }));
    app.delete(`/api/${plural}/:id`, isAuthenticated, recordAccess(storage, kind), route(async (req, res) => {
      await storage[`delete${kind}`](Number(req.params.id));
      res.status(204).send();
    }));
  }
  app.use("/api", (_req, res) => res.status(404).json({ message: "API route not found" }));
  return createServer(app);
}
