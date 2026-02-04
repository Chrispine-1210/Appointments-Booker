import { sql } from 'drizzle-orm';
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
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const providers = pgTable("providers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  title: text("title").default(""), // e.g. Dr., Prof., etc.
  specialty: text("specialty").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  bio: text("bio"),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.00"),
  reviewCount: integer("review_count").default(0),
  isActive: boolean("is_active").default(true),
  workingHours: jsonb("working_hours").$type<{
    start: string; // HH:MM
    end: string;   // HH:MM
    days: number[]; // 0-6
  }>().default({
    start: "09:00",
    end: "17:00",
    days: [1, 2, 3, 4, 5]
  }),
  socialLinks: jsonb("social_links").$type<{
    website?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    facebook?: string;
  }>().default({}),
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  duration: integer("duration").notNull(), // in minutes
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true),
});

export const timeSlots = pgTable("time_slots", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0-6 (Sunday-Saturday)
  startTime: text("start_time").notNull(), // HH:MM format
  endTime: text("end_time").notNull(), // HH:MM format
  isAvailable: boolean("is_available").default(true),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull(),
  serviceId: integer("service_id").notNull(),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").notNull(),
  clientPhone: text("client_phone").notNull(),
  appointmentDate: text("appointment_date").notNull(), // YYYY-MM-DD format
  startTime: text("start_time").notNull(), // HH:MM format
  endTime: text("end_time").notNull(), // HH:MM format
  status: text("status").notNull().default("confirmed"), // confirmed, pending, cancelled, completed
  notes: text("notes"),
  paymentStatus: text("payment_status").default("pending"), // pending, completed, failed
  paymentAmount: decimal("payment_amount", { precision: 10, scale: 2 }),
  stripePaymentId: text("stripe_payment_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").notNull(),
  providerId: integer("provider_id").notNull(),
  clientName: text("client_name").notNull(),
  rating: integer("rating").notNull(), // 1-5 stars
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const analytics = pgTable("analytics", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  totalAppointments: integer("total_appointments").default(0),
  completedAppointments: integer("completed_appointments").default(0),
  cancelledAppointments: integer("cancelled_appointments").default(0),
  totalRevenue: decimal("total_revenue", { precision: 10, scale: 2 }).default("0.00"),
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const memos = pgTable("memos", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").default("general"), // general, appointment, client, personal
  isImportant: boolean("is_important").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, cancelled
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  dueDate: text("due_date"), // YYYY-MM-DD format
  assignedTo: text("assigned_to"), // for future multi-user support
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertProviderSchema = createInsertSchema(providers).omit({
  id: true,
  rating: true,
  reviewCount: true,
  isActive: true,
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  isActive: true,
});

export const insertTimeSlotSchema = createInsertSchema(timeSlots).omit({
  id: true,
  isAvailable: true,
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
}).extend({
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
});

export const insertMemoSchema = createInsertSchema(memos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

// Types
export type Provider = typeof providers.$inferSelect;
export type InsertProvider = z.infer<typeof insertProviderSchema>;

export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;

export type TimeSlot = typeof timeSlots.$inferSelect;
export type InsertTimeSlot = z.infer<typeof insertTimeSlotSchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type Review = typeof reviews.$inferSelect;
export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
});
export type InsertReview = z.infer<typeof insertReviewSchema>;

export type Analytics = typeof analytics.$inferSelect;
export const insertAnalyticsSchema = createInsertSchema(analytics).omit({
  id: true,
  createdAt: true,
});

export type Memo = typeof memos.$inferSelect;
export type InsertMemo = z.infer<typeof insertMemoSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
