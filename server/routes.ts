import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { registerAnalyticsRoutes } from "./routes-analytics";
import { 
  insertProviderSchema, 
  insertServiceSchema, 
  insertTimeSlotSchema, 
  insertAppointmentSchema,
  insertMemoSchema,
  insertTaskSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Register analytics routes
  registerAnalyticsRoutes(app);

  // Auth routes
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // Since we're in Replit environment but auth might not be fully set up yet,
      // return a demo user for now to allow the app to work
      return res.json({
        id: "demo-user",
        email: "demo@example.com",
        firstName: "Demo",
        lastName: "User",
        profileImageUrl: null
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get('/api/logout', (req, res) => {
    // In Replit Auth, logout is handled by clearing the session
    // For now, since we're using a demo user, we just redirect back to home
    res.redirect('/');
  });

  // Health check route
  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Provider routes
  app.get("/api/providers", async (req, res) => {
    try {
      const providers = await storage.getProviders();
      res.json(providers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch providers" });
    }
  });

  app.get("/api/providers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const provider = await storage.getProvider(id);
      if (!provider) {
        return res.status(404).json({ message: "Provider not found" });
      }
      res.json(provider);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch provider" });
    }
  });

  app.post("/api/providers", async (req, res) => {
    try {
      const result = insertProviderSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid provider data", errors: result.error.errors });
      }
      
      const provider = await storage.createProvider(result.data);
      res.status(201).json(provider);
    } catch (error) {
      res.status(500).json({ message: "Failed to create provider" });
    }
  });

  // Service routes
  app.get("/api/providers/:providerId/services", async (req, res) => {
    try {
      const providerId = parseInt(req.params.providerId);
      const services = await storage.getServicesByProvider(providerId);
      res.json(services);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  app.post("/api/services", async (req, res) => {
    try {
      const result = insertServiceSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid service data", errors: result.error.errors });
      }
      
      const service = await storage.createService(result.data);
      res.status(201).json(service);
    } catch (error) {
      res.status(500).json({ message: "Failed to create service" });
    }
  });

  // Time slot routes
  app.get("/api/providers/:providerId/timeslots", async (req, res) => {
    try {
      const providerId = parseInt(req.params.providerId);
      const timeSlots = await storage.getTimeSlotsByProvider(providerId);
      res.json(timeSlots);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch time slots" });
    }
  });

  app.get("/api/providers/:providerId/available-slots", async (req, res) => {
    try {
      const providerId = parseInt(req.params.providerId);
      const date = req.query.date as string;
      
      if (!date) {
        return res.status(400).json({ message: "Date parameter is required" });
      }
      
      const availableSlots = await storage.getAvailableSlots(providerId, date);
      res.json(availableSlots);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch available slots" });
    }
  });

  // Appointment routes
  app.get("/api/providers/:providerId/appointments", async (req, res) => {
    try {
      const providerId = parseInt(req.params.providerId);
      const date = req.query.date as string;
      
      let appointments;
      if (date) {
        appointments = await storage.getAppointmentsByDate(providerId, date);
      } else {
        appointments = await storage.getAppointmentsByProvider(providerId);
      }
      
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  app.post("/api/appointments", async (req, res) => {
    try {
      const result = insertAppointmentSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid appointment data", errors: result.error.errors });
      }
      
      // Check if slot is available
      const isAvailable = await storage.isSlotAvailable(
        result.data.providerId,
        result.data.appointmentDate,
        result.data.startTime,
        result.data.endTime
      );
      
      if (!isAvailable) {
        return res.status(409).json({ message: "Time slot is not available" });
      }
      
      const appointment = await storage.createAppointment(result.data);
      res.status(201).json(appointment);
    } catch (error) {
      res.status(500).json({ message: "Failed to create appointment" });
    }
  });

  app.patch("/api/appointments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = insertAppointmentSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid appointment data", errors: result.error.errors });
      }
      
      const appointment = await storage.updateAppointment(id, result.data);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      res.json(appointment);
    } catch (error) {
      res.status(500).json({ message: "Failed to update appointment" });
    }
  });

  app.delete("/api/appointments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteAppointment(id);
      if (!success) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete appointment" });
    }
  });

  // Memo routes
  app.get("/api/providers/:providerId/memos", async (req, res) => {
    try {
      const providerId = parseInt(req.params.providerId);
      const memos = await storage.getMemosByProvider(providerId);
      res.json(memos);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch memos" });
    }
  });

  app.post("/api/memos", async (req, res) => {
    try {
      const result = insertMemoSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid memo data", errors: result.error.errors });
      }
      
      const memo = await storage.createMemo(result.data);
      res.status(201).json(memo);
    } catch (error) {
      res.status(500).json({ message: "Failed to create memo" });
    }
  });

  app.patch("/api/memos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = insertMemoSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid memo data", errors: result.error.errors });
      }
      
      const memo = await storage.updateMemo(id, result.data);
      if (!memo) {
        return res.status(404).json({ message: "Memo not found" });
      }
      
      res.json(memo);
    } catch (error) {
      res.status(500).json({ message: "Failed to update memo" });
    }
  });

  app.delete("/api/memos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteMemo(id);
      if (!success) {
        return res.status(404).json({ message: "Memo not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete memo" });
    }
  });

  // Task routes
  app.get("/api/providers/:providerId/tasks", async (req, res) => {
    try {
      const providerId = parseInt(req.params.providerId);
      const tasks = await storage.getTasksByProvider(providerId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const result = insertTaskSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid task data", errors: result.error.errors });
      }
      
      const task = await storage.createTask(result.data);
      res.status(201).json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = insertTaskSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid task data", errors: result.error.errors });
      }
      
      const task = await storage.updateTask(id, result.data);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteTask(id);
      if (!success) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
