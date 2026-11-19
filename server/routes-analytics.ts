import type { Express, RequestHandler } from "express";
import type { IStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { providerAccess, positiveId } from "./access";

export function registerAnalyticsRoutes(app: Express, storage: IStorage) {
  const route = (handler: RequestHandler): RequestHandler => (req, res, next) => { Promise.resolve(handler(req, res, next)).catch(next); };
  const owner = providerAccess(storage, "params", "providerId");
  app.get("/api/analytics/:providerId", isAuthenticated, owner, route(async (req, res) => {
    res.set("Cache-Control", "no-store");
    const date = typeof req.query.date === "string" ? req.query.date : new Date().toISOString().slice(0, 10);
    res.json(await storage.getAnalytics(Number(req.params.providerId), date) || { totalAppointments: 0, completedAppointments: 0, cancelledAppointments: 0, totalRevenue: "0.00", averageRating: "0.00" });
  }));
  app.get("/api/providers/:providerId/reviews", route(async (req, res) => {
    const id = positiveId(req.params.providerId);
    if (!id) return res.status(400).json({ message: "Invalid provider ID" });
    res.json(await storage.getReviewsByProvider(id));
  }));
  app.post("/api/reviews", isAuthenticated, (_req, res) => {
    res.status(503).json({ message: "Review submission requires verified client-to-appointment ownership and is not available yet." });
  });
  app.post("/api/providers/:providerId/update-rating", isAuthenticated, owner, route(async (req, res) => {
    const id = Number(req.params.providerId);
    const reviews = await storage.getReviewsByProvider(id);
    const rating = reviews.length ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(2) : "0.00";
    await storage.updateProviderRating(id, rating, reviews.length);
    res.json({ rating, reviewCount: reviews.length });
  }));
}
