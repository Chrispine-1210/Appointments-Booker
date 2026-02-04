import type { Express } from "express";
import { storage } from "./storage";

export function registerAnalyticsRoutes(app: Express) {
  // Get analytics for a specific provider and date
  app.get("/api/analytics/:providerId", async (req, res) => {
    try {
      const providerId = parseInt(req.params.providerId);
      const date = req.query.date as string || new Date().toISOString().split('T')[0];
      
      const analytics = await storage.getAnalytics(providerId, date);
      res.json(analytics || { totalAppointments: 0, completedAppointments: 0, cancelledAppointments: 0, totalRevenue: "0.00", averageRating: "0.00" });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Get reviews for a provider
  app.get("/api/providers/:providerId/reviews", async (req, res) => {
    try {
      const providerId = parseInt(req.params.providerId);
      const reviews = await storage.getReviewsByProvider(providerId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // Create a review
  app.post("/api/reviews", async (req, res) => {
    try {
      const { appointmentId, providerId, clientName, rating, comment } = req.body;
      
      if (!appointmentId || !providerId || !clientName || !rating) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }

      const review = await storage.createReview({
        appointmentId,
        providerId,
        clientName,
        rating,
        comment,
      });

      res.status(201).json(review);
    } catch (error) {
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  // Calculate and update provider rating
  app.post("/api/providers/:providerId/update-rating", async (req, res) => {
    try {
      const providerId = parseInt(req.params.providerId);
      const reviews = await storage.getReviewsByProvider(providerId);
      
      if (reviews.length === 0) {
        return res.json({ rating: "0.00", reviewCount: 0 });
      }

      const averageRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(2);
      await storage.updateProviderRating(providerId, averageRating, reviews.length);
      
      res.json({ rating: averageRating, reviewCount: reviews.length });
    } catch (error) {
      res.status(500).json({ message: "Failed to update rating" });
    }
  });
}
