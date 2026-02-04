// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
var DatabaseStorage = class {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  // Using in-memory storage for now to avoid database authentication issues
  users;
  async getUser(id) {
    return this.users.get(id);
  }
  async upsertUser(userData) {
    if (!userData.id) {
      throw new Error("User ID is required for upsert operation");
    }
    const existingUser = this.users.get(userData.id);
    const user = {
      id: userData.id,
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      createdAt: existingUser?.createdAt || /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.users.set(userData.id, user);
    return user;
  }
  // Keep using in-memory storage for now - will convert to database later
  providers;
  services;
  timeSlots;
  appointments;
  memos;
  tasks;
  reviews;
  analytics;
  currentId;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.providers = /* @__PURE__ */ new Map();
    this.services = /* @__PURE__ */ new Map();
    this.timeSlots = /* @__PURE__ */ new Map();
    this.appointments = /* @__PURE__ */ new Map();
    this.memos = /* @__PURE__ */ new Map();
    this.tasks = /* @__PURE__ */ new Map();
    this.reviews = /* @__PURE__ */ new Map();
    this.analytics = /* @__PURE__ */ new Map();
    this.currentId = 1;
    this.initializeSampleData();
  }
  initializeSampleData() {
    const provider = {
      id: 1,
      name: "Sarah Johnson",
      title: "Dr.",
      specialty: "Family Medicine",
      email: "sarah.johnson@email.com",
      phone: "(555) 123-4567",
      bio: "Board-certified family physician with over 10 years of experience.",
      rating: "4.9",
      reviewCount: 127,
      isActive: true,
      workingHours: {
        start: "09:00",
        end: "17:00",
        days: [1, 2, 3, 4, 5]
      },
      socialLinks: {
        website: "https://sarahjohnson.com",
        instagram: "drsarahj",
        twitter: "sarahjmd"
      }
    };
    this.providers.set(1, provider);
    const consultationService = {
      id: 1,
      providerId: 1,
      name: "Consultation",
      description: "Initial consultation and diagnosis",
      duration: 30,
      price: "150.00",
      isActive: true
    };
    const followUpService = {
      id: 2,
      providerId: 1,
      name: "Follow-up",
      description: "Follow-up appointment",
      duration: 15,
      price: "75.00",
      isActive: true
    };
    this.services.set(1, consultationService);
    this.services.set(2, followUpService);
    let slotId = 1;
    for (let day = 1; day <= 5; day++) {
      for (let hour = 9; hour < 17; hour++) {
        const timeSlot = {
          id: slotId++,
          providerId: 1,
          dayOfWeek: day,
          startTime: `${hour.toString().padStart(2, "0")}:00`,
          endTime: `${hour.toString().padStart(2, "0")}:30`,
          isAvailable: true
        };
        this.timeSlots.set(timeSlot.id, timeSlot);
        const timeSlot2 = {
          id: slotId++,
          providerId: 1,
          dayOfWeek: day,
          startTime: `${hour.toString().padStart(2, "0")}:30`,
          endTime: `${(hour + 1).toString().padStart(2, "0")}:00`,
          isAvailable: true
        };
        this.timeSlots.set(timeSlot2.id, timeSlot2);
      }
    }
    const memo1 = {
      id: slotId++,
      providerId: 1,
      title: "Important Patient Follow-up",
      content: "Remember to follow up with Mrs. Anderson about her test results. She seemed anxious during the last visit.",
      category: "client",
      isImportant: true,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    const memo2 = {
      id: slotId++,
      providerId: 1,
      title: "Equipment Maintenance",
      content: "Schedule annual maintenance for the X-ray machine. Due for service next month.",
      category: "general",
      isImportant: false,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.memos.set(memo1.id, memo1);
    this.memos.set(memo2.id, memo2);
    const task1 = {
      id: slotId++,
      providerId: 1,
      title: "Update patient records",
      description: "Complete digital migration for all patient files from 2023",
      status: "in_progress",
      priority: "high",
      dueDate: "2025-01-20",
      assignedTo: null,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date(),
      completedAt: null
    };
    const task2 = {
      id: slotId++,
      providerId: 1,
      title: "Order medical supplies",
      description: "Restock examination gloves, syringes, and bandages",
      status: "pending",
      priority: "medium",
      dueDate: "2025-01-15",
      assignedTo: null,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date(),
      completedAt: null
    };
    this.tasks.set(task1.id, task1);
    this.tasks.set(task2.id, task2);
    this.currentId = slotId;
  }
  // Provider methods
  async createProvider(insertProvider) {
    const id = this.currentId++;
    const provider = {
      ...insertProvider,
      id,
      rating: "0.00",
      reviewCount: 0,
      isActive: true,
      bio: insertProvider.bio || null
    };
    this.providers.set(id, provider);
    return provider;
  }
  async getProvider(id) {
    return this.providers.get(id);
  }
  async getProviders() {
    return Array.from(this.providers.values()).filter((p) => p.isActive);
  }
  async updateProvider(id, provider) {
    const existing = this.providers.get(id);
    if (!existing) return void 0;
    const updated = { ...existing, ...provider };
    this.providers.set(id, updated);
    return updated;
  }
  // Service methods
  async createService(insertService) {
    const id = this.currentId++;
    const service = {
      ...insertService,
      id,
      isActive: true,
      description: insertService.description || null
    };
    this.services.set(id, service);
    return service;
  }
  async getService(id) {
    return this.services.get(id);
  }
  async getServicesByProvider(providerId) {
    return Array.from(this.services.values()).filter(
      (s) => s.providerId === providerId && s.isActive
    );
  }
  async updateService(id, service) {
    const existing = this.services.get(id);
    if (!existing) return void 0;
    const updated = { ...existing, ...service };
    this.services.set(id, updated);
    return updated;
  }
  async deleteService(id) {
    const existing = this.services.get(id);
    if (!existing) return false;
    const updated = { ...existing, isActive: false };
    this.services.set(id, updated);
    return true;
  }
  // Time slot methods
  async createTimeSlot(insertTimeSlot) {
    const id = this.currentId++;
    const timeSlot = { ...insertTimeSlot, id, isAvailable: true };
    this.timeSlots.set(id, timeSlot);
    return timeSlot;
  }
  async getTimeSlotsByProvider(providerId) {
    return Array.from(this.timeSlots.values()).filter(
      (ts) => ts.providerId === providerId && ts.isAvailable
    );
  }
  async updateTimeSlot(id, timeSlot) {
    const existing = this.timeSlots.get(id);
    if (!existing) return void 0;
    const updated = { ...existing, ...timeSlot };
    this.timeSlots.set(id, updated);
    return updated;
  }
  async deleteTimeSlot(id) {
    const existing = this.timeSlots.get(id);
    if (!existing) return false;
    const updated = { ...existing, isAvailable: false };
    this.timeSlots.set(id, updated);
    return true;
  }
  // Appointment methods
  async createAppointment(insertAppointment) {
    const id = this.currentId++;
    const appointment = {
      ...insertAppointment,
      id,
      status: insertAppointment.status || "pending",
      createdAt: /* @__PURE__ */ new Date(),
      notes: insertAppointment.notes || null
    };
    this.appointments.set(id, appointment);
    return appointment;
  }
  async getAppointment(id) {
    return this.appointments.get(id);
  }
  async getAppointmentsByProvider(providerId) {
    return Array.from(this.appointments.values()).filter(
      (a) => a.providerId === providerId
    );
  }
  async getAppointmentsByDate(providerId, date) {
    return Array.from(this.appointments.values()).filter(
      (a) => a.providerId === providerId && a.appointmentDate === date
    );
  }
  async updateAppointment(id, appointment) {
    const existing = this.appointments.get(id);
    if (!existing) return void 0;
    const updated = { ...existing, ...appointment };
    this.appointments.set(id, updated);
    return updated;
  }
  async deleteAppointment(id) {
    return this.appointments.delete(id);
  }
  // Utility methods
  async getAvailableSlots(providerId, date) {
    const provider = await this.getProvider(providerId);
    if (!provider || !provider.workingHours) return [];
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();
    if (!provider.workingHours.days.includes(dayOfWeek)) {
      return [];
    }
    const appointments2 = await this.getAppointmentsByDate(providerId, date);
    const bookedTimes = appointments2.map((a) => a.startTime);
    const slots = [];
    let [currentHour, currentMin] = provider.workingHours.start.split(":").map(Number);
    const [endHour, endMin] = provider.workingHours.end.split(":").map(Number);
    const endTotalMinutes = endHour * 60 + endMin;
    while (currentHour * 60 + currentMin < endTotalMinutes) {
      const timeStr = `${currentHour.toString().padStart(2, "0")}:${currentMin.toString().padStart(2, "0")}`;
      if (!bookedTimes.includes(timeStr)) {
        slots.push(timeStr);
      }
      currentMin += 30;
      if (currentMin >= 60) {
        currentHour += 1;
        currentMin -= 60;
      }
    }
    return slots.sort();
  }
  async isSlotAvailable(providerId, date, startTime, endTime) {
    const appointments2 = await this.getAppointmentsByDate(providerId, date);
    for (const appointment of appointments2) {
      if (startTime >= appointment.startTime && startTime < appointment.endTime || endTime > appointment.startTime && endTime <= appointment.endTime || startTime <= appointment.startTime && endTime >= appointment.endTime) {
        return false;
      }
    }
    return true;
  }
  // Memo methods
  async createMemo(insertMemo) {
    const id = this.currentId++;
    const memo = {
      ...insertMemo,
      id,
      category: insertMemo.category || null,
      isImportant: insertMemo.isImportant || null,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.memos.set(id, memo);
    return memo;
  }
  async getMemo(id) {
    return this.memos.get(id);
  }
  async getMemosByProvider(providerId) {
    return Array.from(this.memos.values()).filter((m) => m.providerId === providerId);
  }
  async updateMemo(id, memo) {
    const existing = this.memos.get(id);
    if (!existing) return void 0;
    const updated = { ...existing, ...memo, updatedAt: /* @__PURE__ */ new Date() };
    this.memos.set(id, updated);
    return updated;
  }
  async deleteMemo(id) {
    return this.memos.delete(id);
  }
  // Task methods
  async createTask(insertTask) {
    const id = this.currentId++;
    const task = {
      ...insertTask,
      id,
      status: insertTask.status || "pending",
      priority: insertTask.priority || "medium",
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date(),
      completedAt: null,
      description: insertTask.description || null,
      dueDate: insertTask.dueDate || null,
      assignedTo: insertTask.assignedTo || null
    };
    this.tasks.set(id, task);
    return task;
  }
  async getTask(id) {
    return this.tasks.get(id);
  }
  async getTasksByProvider(providerId) {
    return Array.from(this.tasks.values()).filter((t) => t.providerId === providerId);
  }
  async updateTask(id, task) {
    const existing = this.tasks.get(id);
    if (!existing) return void 0;
    const updated = {
      ...existing,
      ...task,
      updatedAt: /* @__PURE__ */ new Date(),
      completedAt: task.status === "completed" ? /* @__PURE__ */ new Date() : existing.completedAt
    };
    this.tasks.set(id, updated);
    return updated;
  }
  async deleteTask(id) {
    return this.tasks.delete(id);
  }
  // Analytics methods
  async getAnalytics(providerId, date) {
    const key = `${providerId}-${date}`;
    return this.analytics.get(key);
  }
  async createReview(review) {
    const id = this.currentId++;
    const fullReview = { ...review, id, createdAt: /* @__PURE__ */ new Date() };
    this.reviews.set(id, fullReview);
    return fullReview;
  }
  async getReviewsByProvider(providerId) {
    return Array.from(this.reviews.values()).filter((r) => r.providerId === providerId);
  }
  async updateProviderRating(providerId, rating, reviewCount) {
    const provider = this.providers.get(providerId);
    if (provider) {
      provider.rating = rating;
      provider.reviewCount = reviewCount;
      this.providers.set(providerId, provider);
    }
  }
};
var storage = new DatabaseStorage();

// server/replitAuth.ts
import * as client from "openid-client";
import { Strategy } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import memoize from "memoizee";
var isReplitEnvironment = process.env.REPLIT_DOMAINS && process.env.REPL_ID;
var getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID
    );
  },
  { maxAge: 3600 * 1e3 }
);
function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1e3;
  return session({
    secret: process.env.SESSION_SECRET || "dev-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: !!isReplitEnvironment,
      maxAge: sessionTtl
    }
  });
}
function updateUserSession(user, tokens) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}
async function upsertUser(claims) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"]
  });
}
async function setupAuth(app2) {
  app2.set("trust proxy", 1);
  app2.use(getSession());
  app2.get("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      if (!isReplitEnvironment) {
        return res.redirect("/");
      }
      (async () => {
        try {
          const config2 = await getOidcConfig();
          res.redirect(
            client.buildEndSessionUrl(config2, {
              client_id: process.env.REPL_ID,
              post_logout_redirect_uri: `${req.protocol}://${req.hostname}`
            }).href
          );
        } catch (error) {
          res.redirect("/");
        }
      })();
    });
  });
  if (!isReplitEnvironment) {
    console.log("Running in development mode - no Replit Auth setup required");
    return;
  }
  app2.use(passport.initialize());
  app2.use(passport.session());
  const config = await getOidcConfig();
  const verify = async (tokens, verified) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };
  for (const domain of process.env.REPLIT_DOMAINS.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`
      },
      verify
    );
    passport.use(strategy);
  }
  passport.serializeUser((user, cb) => cb(null, user));
  passport.deserializeUser((user, cb) => cb(null, user));
  app2.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"]
    })(req, res, next);
  });
  app2.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login"
    })(req, res, next);
  });
}

// server/routes-analytics.ts
function registerAnalyticsRoutes(app2) {
  app2.get("/api/analytics/:providerId", async (req, res) => {
    try {
      const providerId = parseInt(req.params.providerId);
      const date = req.query.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const analytics2 = await storage.getAnalytics(providerId, date);
      res.json(analytics2 || { totalAppointments: 0, completedAppointments: 0, cancelledAppointments: 0, totalRevenue: "0.00", averageRating: "0.00" });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });
  app2.get("/api/providers/:providerId/reviews", async (req, res) => {
    try {
      const providerId = parseInt(req.params.providerId);
      const reviews2 = await storage.getReviewsByProvider(providerId);
      res.json(reviews2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });
  app2.post("/api/reviews", async (req, res) => {
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
        comment
      });
      res.status(201).json(review);
    } catch (error) {
      res.status(500).json({ message: "Failed to create review" });
    }
  });
  app2.post("/api/providers/:providerId/update-rating", async (req, res) => {
    try {
      const providerId = parseInt(req.params.providerId);
      const reviews2 = await storage.getReviewsByProvider(providerId);
      if (reviews2.length === 0) {
        return res.json({ rating: "0.00", reviewCount: 0 });
      }
      const averageRating = (reviews2.reduce((sum, r) => sum + r.rating, 0) / reviews2.length).toFixed(2);
      await storage.updateProviderRating(providerId, averageRating, reviews2.length);
      res.json({ rating: averageRating, reviewCount: reviews2.length });
    } catch (error) {
      res.status(500).json({ message: "Failed to update rating" });
    }
  });
}

// shared/schema.ts
import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  decimal,
  varchar
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var providers = pgTable("providers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  title: text("title").default(""),
  // e.g. Dr., Prof., etc.
  specialty: text("specialty").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  bio: text("bio"),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.00"),
  reviewCount: integer("review_count").default(0),
  isActive: boolean("is_active").default(true),
  workingHours: jsonb("working_hours").$type().default({
    start: "09:00",
    end: "17:00",
    days: [1, 2, 3, 4, 5]
  }),
  socialLinks: jsonb("social_links").$type().default({})
});
var services = pgTable("services", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  duration: integer("duration").notNull(),
  // in minutes
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true)
});
var timeSlots = pgTable("time_slots", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  // 0-6 (Sunday-Saturday)
  startTime: text("start_time").notNull(),
  // HH:MM format
  endTime: text("end_time").notNull(),
  // HH:MM format
  isAvailable: boolean("is_available").default(true)
});
var appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull(),
  serviceId: integer("service_id").notNull(),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").notNull(),
  clientPhone: text("client_phone").notNull(),
  appointmentDate: text("appointment_date").notNull(),
  // YYYY-MM-DD format
  startTime: text("start_time").notNull(),
  // HH:MM format
  endTime: text("end_time").notNull(),
  // HH:MM format
  status: text("status").notNull().default("confirmed"),
  // confirmed, pending, cancelled, completed
  notes: text("notes"),
  paymentStatus: text("payment_status").default("pending"),
  // pending, completed, failed
  paymentAmount: decimal("payment_amount", { precision: 10, scale: 2 }),
  stripePaymentId: text("stripe_payment_id"),
  createdAt: timestamp("created_at").defaultNow()
});
var reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").notNull(),
  providerId: integer("provider_id").notNull(),
  clientName: text("client_name").notNull(),
  rating: integer("rating").notNull(),
  // 1-5 stars
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow()
});
var analytics = pgTable("analytics", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull(),
  date: text("date").notNull(),
  // YYYY-MM-DD
  totalAppointments: integer("total_appointments").default(0),
  completedAppointments: integer("completed_appointments").default(0),
  cancelledAppointments: integer("cancelled_appointments").default(0),
  totalRevenue: decimal("total_revenue", { precision: 10, scale: 2 }).default("0.00"),
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").defaultNow()
});
var memos = pgTable("memos", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").default("general"),
  // general, appointment, client, personal
  isImportant: boolean("is_important").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"),
  // pending, in_progress, completed, cancelled
  priority: text("priority").notNull().default("medium"),
  // low, medium, high, urgent
  dueDate: text("due_date"),
  // YYYY-MM-DD format
  assignedTo: text("assigned_to"),
  // for future multi-user support
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at")
});
var sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull()
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertProviderSchema = createInsertSchema(providers).omit({
  id: true,
  rating: true,
  reviewCount: true,
  isActive: true
});
var insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  isActive: true
});
var insertTimeSlotSchema = createInsertSchema(timeSlots).omit({
  id: true,
  isAvailable: true
});
var insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true
}).extend({
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format")
});
var insertMemoSchema = createInsertSchema(memos).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true
});
var insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true
});
var insertAnalyticsSchema = createInsertSchema(analytics).omit({
  id: true,
  createdAt: true
});
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// server/routes.ts
async function registerRoutes(app2) {
  await setupAuth(app2);
  registerAnalyticsRoutes(app2);
  app2.get("/api/auth/user", async (req, res) => {
    try {
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
  app2.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app2.get("/api/providers", async (req, res) => {
    try {
      const providers2 = await storage.getProviders();
      res.json(providers2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch providers" });
    }
  });
  app2.get("/api/providers/:id", async (req, res) => {
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
  app2.post("/api/providers", async (req, res) => {
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
  app2.get("/api/providers/:providerId/services", async (req, res) => {
    try {
      const providerId = parseInt(req.params.providerId);
      const services2 = await storage.getServicesByProvider(providerId);
      res.json(services2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });
  app2.post("/api/services", async (req, res) => {
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
  app2.get("/api/providers/:providerId/timeslots", async (req, res) => {
    try {
      const providerId = parseInt(req.params.providerId);
      const timeSlots2 = await storage.getTimeSlotsByProvider(providerId);
      res.json(timeSlots2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch time slots" });
    }
  });
  app2.get("/api/providers/:providerId/available-slots", async (req, res) => {
    try {
      const providerId = parseInt(req.params.providerId);
      const date = req.query.date;
      if (!date) {
        return res.status(400).json({ message: "Date parameter is required" });
      }
      const availableSlots = await storage.getAvailableSlots(providerId, date);
      res.json(availableSlots);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch available slots" });
    }
  });
  app2.get("/api/providers/:providerId/appointments", async (req, res) => {
    try {
      const providerId = parseInt(req.params.providerId);
      const date = req.query.date;
      let appointments2;
      if (date) {
        appointments2 = await storage.getAppointmentsByDate(providerId, date);
      } else {
        appointments2 = await storage.getAppointmentsByProvider(providerId);
      }
      res.json(appointments2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });
  app2.post("/api/appointments", async (req, res) => {
    try {
      const result = insertAppointmentSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid appointment data", errors: result.error.errors });
      }
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
  app2.patch("/api/appointments/:id", async (req, res) => {
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
  app2.delete("/api/appointments/:id", async (req, res) => {
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
  app2.get("/api/providers/:providerId/memos", async (req, res) => {
    try {
      const providerId = parseInt(req.params.providerId);
      const memos2 = await storage.getMemosByProvider(providerId);
      res.json(memos2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch memos" });
    }
  });
  app2.post("/api/memos", async (req, res) => {
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
  app2.patch("/api/memos/:id", async (req, res) => {
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
  app2.delete("/api/memos/:id", async (req, res) => {
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
  app2.get("/api/providers/:providerId/tasks", async (req, res) => {
    try {
      const providerId = parseInt(req.params.providerId);
      const tasks2 = await storage.getTasksByProvider(providerId);
      res.json(tasks2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });
  app2.post("/api/tasks", async (req, res) => {
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
  app2.patch("/api/tasks/:id", async (req, res) => {
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
  app2.delete("/api/tasks/:id", async (req, res) => {
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
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
