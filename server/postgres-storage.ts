import { retryBookingWrite } from "./database-retry";
import { sumAmounts } from "@shared/money";
import { and, eq, sql } from "drizzle-orm";
import type session from "express-session";
import {
  users, authCredentials, providers, services, timeSlots, appointments, memos, tasks, reviews,
  type InsertProvider, type InsertService, type InsertTimeSlot, type InsertAppointment,
  type InsertMemo, type InsertTask, type InsertReview, type UpsertUser,
} from "@shared/schema";
import type { IStorage } from "./storage";
import type { AppDatabase, AppPool } from "./db";
import { validDate, timeMinutes } from "./scheduling";

export class PostgresStorage implements IStorage {
  readonly kind = "postgres" as const;
  constructor(public readonly db: AppDatabase, private readonly pool: AppPool, public readonly sessionStore?: session.Store) {}
  async close() { await this.pool.end(); }
  async assertReady() {
    const result = await this.db.execute(sql`select version from booking_schema_version where id = 1`);
    if (result.rows[0]?.version !== 1) throw new Error("Database migrations are required before startup");
    const constraints = await this.db.execute(sql`select 1 from pg_constraint where conrelid = 'appointments'::regclass and conname = 'appointments_no_overlap' and contype = 'x'`);
    if (!constraints.rows.length) throw new Error("Database booking exclusion constraint is missing");
  }
  async getUser(id: string) { return (await this.db.select().from(users).where(eq(users.id, id)))[0]; }
  async upsertUser(data: UpsertUser) {
    return (await this.db.insert(users).values(data).onConflictDoUpdate({ target: users.id, set: { email: data.email, firstName: data.firstName, lastName: data.lastName, profileImageUrl: data.profileImageUrl, updatedAt: new Date() } }).returning())[0];
  }
  async registerUser(input: { email: string; firstName: string; lastName: string; passwordHash: string }) {
    return this.db.transaction(async tx => {
      const [user] = await tx.insert(users).values({ email: input.email, firstName: input.firstName, lastName: input.lastName }).returning();
      await tx.insert(authCredentials).values({ userId: user.id, passwordHash: input.passwordHash });
      return user;
    });
  }
  async getCredential(email: string) {
    return (await this.db.select({ userId: users.id, passwordHash: authCredentials.passwordHash }).from(users).innerJoin(authCredentials, eq(authCredentials.userId, users.id)).where(eq(users.email, email)))[0];
  }
  async consumeAuthAttempt(key: string, windowMs: number, limit: number) {
    // One atomic UPSERT shares the limit across all application processes.
    const result = await this.db.execute(sql`
      insert into auth_attempts (key, count, expires_at) values (${key}, 1, clock_timestamp() + ${windowMs} * interval '1 millisecond')
      on conflict (key) do update set
        count = case when auth_attempts.expires_at <= clock_timestamp() then 1 else auth_attempts.count + 1 end,
        expires_at = case when auth_attempts.expires_at <= clock_timestamp() then clock_timestamp() + ${windowMs} * interval '1 millisecond' else auth_attempts.expires_at end
      returning count`);
    return Number(result.rows[0]?.count) <= limit;
  }
  async getProvider(id: number) { return (await this.db.select().from(providers).where(eq(providers.id, id)))[0]; }
  async getProviderByOwnerId(id: string) { return (await this.db.select().from(providers).where(eq(providers.ownerUserId, id)))[0]; }
  async getProviders() { return this.db.select().from(providers).where(eq(providers.isActive, true)); }
  async createProvider(data: InsertProvider, userId: string) { return (await this.db.insert(providers).values({ ...data, ownerUserId: userId }).returning())[0]; }
  async updateProvider(id: number, data: Partial<InsertProvider>) { return (await this.db.update(providers).set(data).where(eq(providers.id, id)).returning())[0]; }
  async onboardProvider(profile: InsertProvider, service: Omit<InsertService, "providerId">, userId: string) {
    return this.db.transaction(async tx => {
      const [provider] = await tx.insert(providers).values({ ...profile, ownerUserId: userId }).returning();
      const [firstService] = await tx.insert(services).values({ ...service, providerId: provider.id }).returning();
      return { provider, service: firstService };
    });
  }
  async getService(id: number) { return (await this.db.select().from(services).where(eq(services.id, id)))[0]; }
  async createService(data: InsertService) { return (await this.db.insert(services).values(data).returning())[0]; }
  async getServicesByProvider(id: number) { return this.db.select().from(services).where(and(eq(services.providerId, id), eq(services.isActive, true))); }
  async updateService(id: number, data: Partial<InsertService>) { return (await this.db.update(services).set(data).where(eq(services.id, id)).returning())[0]; }
  async deleteService(id: number) { return Boolean((await this.db.update(services).set({ isActive: false }).where(eq(services.id, id)).returning({ id: services.id })).length); }
  async createTimeSlot(data: InsertTimeSlot) { return (await this.db.insert(timeSlots).values(data).returning())[0]; }
  async getTimeSlotsByProvider(id: number) { return this.db.select().from(timeSlots).where(and(eq(timeSlots.providerId, id), eq(timeSlots.isAvailable, true))); }
  async updateTimeSlot(id: number, data: Partial<InsertTimeSlot>) { return (await this.db.update(timeSlots).set(data).where(eq(timeSlots.id, id)).returning())[0]; }
  async deleteTimeSlot(id: number) { return Boolean((await this.db.update(timeSlots).set({ isAvailable: false }).where(eq(timeSlots.id, id)).returning({ id: timeSlots.id })).length); }
  // Triggers validate opening hours and service duration. The exclusion constraint
  // makes conflicting inserts/updates fail even from separate workers or SQL clients.
  async createAppointment(data: InsertAppointment) { return retryBookingWrite(async () => (await this.db.insert(appointments).values(data).returning())[0]); }
  async getAppointment(id: number) { return (await this.db.select().from(appointments).where(eq(appointments.id, id)))[0]; }
  async getAppointmentsByProvider(id: number) { return this.db.select().from(appointments).where(eq(appointments.providerId, id)); }
  async getAppointmentsByDate(id: number, date: string) { return this.db.select().from(appointments).where(and(eq(appointments.providerId, id), eq(appointments.appointmentDate, date))); }
  async getAppointmentsByClient(id: string) { return this.db.select().from(appointments).where(eq(appointments.clientUserId, id)); }
  async updateAppointment(id: number, data: Partial<InsertAppointment>) {
    if (!Object.keys(data).length) return this.getAppointment(id);
    return retryBookingWrite(async () => (await this.db.update(appointments).set(data).where(eq(appointments.id, id)).returning())[0]);
  }
  async deleteAppointment(id: number) { return Boolean((await this.db.delete(appointments).where(eq(appointments.id, id)).returning({ id: appointments.id })).length); }
  async getAvailableSlots(id: number, date: string, duration = 30) {
    const provider = await this.getProvider(id);
    const hours = provider?.workingHours;
    if (!validDate(date) || !provider?.isActive || !hours || !Number.isInteger(duration) || duration < 1 || duration > 720 || !hours.days.includes(new Date(`${date}T00:00:00Z`).getUTCDay())) return [];
    const booked = (await this.getAppointmentsByDate(id, date)).filter(a => a.status !== "cancelled");
    const result: string[] = [];
    for (let start = timeMinutes(hours.start); start + duration <= timeMinutes(hours.end); start += 30) {
      if (!booked.some(a => start < timeMinutes(a.endTime) && start + duration > timeMinutes(a.startTime))) result.push(`${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`);
    }
    return result;
  }
  async isSlotAvailable(id: number, date: string, start: string, end: string) { return (await this.getAvailableSlots(id, date, timeMinutes(end) - timeMinutes(start))).includes(start); }
  async createMemo(data: InsertMemo) { return (await this.db.insert(memos).values(data).returning())[0]; }
  async getMemo(id: number) { return (await this.db.select().from(memos).where(eq(memos.id, id)))[0]; }
  async getMemosByProvider(id: number) { return this.db.select().from(memos).where(eq(memos.providerId, id)); }
  async updateMemo(id: number, data: Partial<InsertMemo>) { return (await this.db.update(memos).set({ ...data, updatedAt: new Date() }).where(eq(memos.id, id)).returning())[0]; }
  async deleteMemo(id: number) { return Boolean((await this.db.delete(memos).where(eq(memos.id, id)).returning({ id: memos.id })).length); }
  async createTask(data: InsertTask) { return (await this.db.insert(tasks).values(data).returning())[0]; }
  async getTask(id: number) { return (await this.db.select().from(tasks).where(eq(tasks.id, id)))[0]; }
  async getTasksByProvider(id: number) { return this.db.select().from(tasks).where(eq(tasks.providerId, id)); }
  async updateTask(id: number, data: Partial<InsertTask>) { return (await this.db.update(tasks).set({ ...data, updatedAt: new Date(), ...(data.status === "completed" ? { completedAt: new Date() } : data.status ? { completedAt: null } : {}) }).where(eq(tasks.id, id)).returning())[0]; }
  async deleteTask(id: number) { return Boolean((await this.db.delete(tasks).where(eq(tasks.id, id)).returning({ id: tasks.id })).length); }
  async createReview(data: InsertReview) { return (await this.db.insert(reviews).values(data).returning())[0]; }
  async getReviewsByProvider(id: number) { return this.db.select().from(reviews).where(eq(reviews.providerId, id)); }
  async updateProviderRating(id: number, rating: string, reviewCount: number) { await this.db.update(providers).set({ rating, reviewCount }).where(eq(providers.id, id)); }
  async getAnalytics(id: number, date: string) {
    const list = await this.getAppointmentsByDate(id, date);
    const ratings = await this.getReviewsByProvider(id);
    return { providerId: id, date, totalAppointments: list.length, completedAppointments: list.filter(a => a.status === "completed").length, cancelledAppointments: list.filter(a => a.status === "cancelled").length,
      // Only settled payment evidence contributes to collections. Booking value is not revenue.
      totalRevenue: sumAmounts(list.filter(a => a.paymentStatus === "completed").map(a => a.paymentAmount)), averageRating: ratings.length ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(2) : "0.00" };
  }
}
