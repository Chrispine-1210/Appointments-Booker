import { 
  providers, 
  services, 
  timeSlots, 
  appointments,
  memos,
  tasks,
  users,
  type Provider, 
  type InsertProvider,
  type Service,
  type InsertService,
  type TimeSlot,
  type InsertTimeSlot,
  type Appointment,
  type InsertAppointment,
  type Memo,
  type InsertMemo,
  type Task,
  type InsertTask,
  type User,
  type UpsertUser
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Analytics & Review methods
  getAnalytics(providerId: number, date: string): Promise<any | undefined>;
  createReview(review: any): Promise<any>;
  getReviewsByProvider(providerId: number): Promise<any[]>;
  updateProviderRating(providerId: number, rating: string, reviewCount: number): Promise<void>;

  // Provider methods
  createProvider(provider: InsertProvider): Promise<Provider>;
  getProvider(id: number): Promise<Provider | undefined>;
  getProviders(): Promise<Provider[]>;
  updateProvider(id: number, provider: Partial<InsertProvider>): Promise<Provider | undefined>;

  // Service methods
  createService(service: InsertService): Promise<Service>;
  getService(id: number): Promise<Service | undefined>;
  getServicesByProvider(providerId: number): Promise<Service[]>;
  updateService(id: number, service: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: number): Promise<boolean>;

  // Time slot methods
  createTimeSlot(timeSlot: InsertTimeSlot): Promise<TimeSlot>;
  getTimeSlotsByProvider(providerId: number): Promise<TimeSlot[]>;
  updateTimeSlot(id: number, timeSlot: Partial<InsertTimeSlot>): Promise<TimeSlot | undefined>;
  deleteTimeSlot(id: number): Promise<boolean>;

  // Appointment methods
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  getAppointment(id: number): Promise<Appointment | undefined>;
  getAppointmentsByProvider(providerId: number): Promise<Appointment[]>;
  getAppointmentsByDate(providerId: number, date: string): Promise<Appointment[]>;
  updateAppointment(id: number, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: number): Promise<boolean>;
  
  // Memo methods
  createMemo(memo: InsertMemo): Promise<Memo>;
  getMemo(id: number): Promise<Memo | undefined>;
  getMemosByProvider(providerId: number): Promise<Memo[]>;
  updateMemo(id: number, memo: Partial<InsertMemo>): Promise<Memo | undefined>;
  deleteMemo(id: number): Promise<boolean>;

  // Task methods
  createTask(task: InsertTask): Promise<Task>;
  getTask(id: number): Promise<Task | undefined>;
  getTasksByProvider(providerId: number): Promise<Task[]>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;

  // Utility methods
  getAvailableSlots(providerId: number, date: string): Promise<string[]>;
  isSlotAvailable(providerId: number, date: string, startTime: string, endTime: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  // Using in-memory storage for now to avoid database authentication issues
  private users: Map<string, User>;
  
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    if (!userData.id) {
      throw new Error("User ID is required for upsert operation");
    }
    const existingUser = this.users.get(userData.id);
    const user: User = {
      id: userData.id,
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      createdAt: existingUser?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    this.users.set(userData.id, user);
    return user;
  }

  // Keep using in-memory storage for now - will convert to database later
  private providers: Map<number, Provider>;
  private services: Map<number, Service>;
  private timeSlots: Map<number, TimeSlot>;
  private appointments: Map<number, Appointment>;
  private memos: Map<number, Memo>;
  private tasks: Map<number, Task>;
  private reviews: Map<number, any>;
  private analytics: Map<string, any>;
  private currentId: number;

  constructor() {
    this.users = new Map();
    this.providers = new Map();
    this.services = new Map();
    this.timeSlots = new Map();
    this.appointments = new Map();
    this.memos = new Map();
    this.tasks = new Map();
    this.reviews = new Map();
    this.analytics = new Map();
    this.currentId = 1;
    
    // Initialize with sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Create sample provider
    const provider: Provider = {
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

    // Create sample services
    const consultationService: Service = {
      id: 1,
      providerId: 1,
      name: "Consultation",
      description: "Initial consultation and diagnosis",
      duration: 30,
      price: "150.00",
      isActive: true,
    };
    const followUpService: Service = {
      id: 2,
      providerId: 1,
      name: "Follow-up",
      description: "Follow-up appointment",
      duration: 15,
      price: "75.00",
      isActive: true,
    };
    this.services.set(1, consultationService);
    this.services.set(2, followUpService);

    // Create sample time slots (Monday to Friday, 9 AM to 5 PM)
    let slotId = 1;
    for (let day = 1; day <= 5; day++) { // Monday to Friday
      for (let hour = 9; hour < 17; hour++) {
        const timeSlot: TimeSlot = {
          id: slotId++,
          providerId: 1,
          dayOfWeek: day,
          startTime: `${hour.toString().padStart(2, '0')}:00`,
          endTime: `${hour.toString().padStart(2, '0')}:30`,
          isAvailable: true,
        };
        this.timeSlots.set(timeSlot.id, timeSlot);
        
        const timeSlot2: TimeSlot = {
          id: slotId++,
          providerId: 1,
          dayOfWeek: day,
          startTime: `${hour.toString().padStart(2, '0')}:30`,
          endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
          isAvailable: true,
        };
        this.timeSlots.set(timeSlot2.id, timeSlot2);
      }
    }

    // Create sample memos
    const memo1: Memo = {
      id: slotId++,
      providerId: 1,
      title: "Important Patient Follow-up",
      content: "Remember to follow up with Mrs. Anderson about her test results. She seemed anxious during the last visit.",
      category: "client",
      isImportant: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const memo2: Memo = {
      id: slotId++,
      providerId: 1,
      title: "Equipment Maintenance",
      content: "Schedule annual maintenance for the X-ray machine. Due for service next month.",
      category: "general",
      isImportant: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.memos.set(memo1.id, memo1);
    this.memos.set(memo2.id, memo2);

    // Create sample tasks
    const task1: Task = {
      id: slotId++,
      providerId: 1,
      title: "Update patient records",
      description: "Complete digital migration for all patient files from 2023",
      status: "in_progress",
      priority: "high",
      dueDate: "2025-01-20",
      assignedTo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
    };
    const task2: Task = {
      id: slotId++,
      providerId: 1,
      title: "Order medical supplies",
      description: "Restock examination gloves, syringes, and bandages",
      status: "pending",
      priority: "medium",
      dueDate: "2025-01-15",
      assignedTo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
    };
    this.tasks.set(task1.id, task1);
    this.tasks.set(task2.id, task2);

    this.currentId = slotId;
  }

  // Provider methods
  async createProvider(insertProvider: InsertProvider): Promise<Provider> {
    const id = this.currentId++;
    const provider: Provider = { 
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

  async getProvider(id: number): Promise<Provider | undefined> {
    return this.providers.get(id);
  }

  async getProviders(): Promise<Provider[]> {
    return Array.from(this.providers.values()).filter(p => p.isActive);
  }

  async updateProvider(id: number, provider: Partial<InsertProvider>): Promise<Provider | undefined> {
    const existing = this.providers.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...provider };
    this.providers.set(id, updated);
    return updated;
  }

  // Service methods
  async createService(insertService: InsertService): Promise<Service> {
    const id = this.currentId++;
    const service: Service = { 
      ...insertService, 
      id, 
      isActive: true, 
      description: insertService.description || null 
    };
    this.services.set(id, service);
    return service;
  }

  async getService(id: number): Promise<Service | undefined> {
    return this.services.get(id);
  }

  async getServicesByProvider(providerId: number): Promise<Service[]> {
    return Array.from(this.services.values()).filter(
      s => s.providerId === providerId && s.isActive
    );
  }

  async updateService(id: number, service: Partial<InsertService>): Promise<Service | undefined> {
    const existing = this.services.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...service };
    this.services.set(id, updated);
    return updated;
  }

  async deleteService(id: number): Promise<boolean> {
    const existing = this.services.get(id);
    if (!existing) return false;
    
    const updated = { ...existing, isActive: false };
    this.services.set(id, updated);
    return true;
  }

  // Time slot methods
  async createTimeSlot(insertTimeSlot: InsertTimeSlot): Promise<TimeSlot> {
    const id = this.currentId++;
    const timeSlot: TimeSlot = { ...insertTimeSlot, id, isAvailable: true };
    this.timeSlots.set(id, timeSlot);
    return timeSlot;
  }

  async getTimeSlotsByProvider(providerId: number): Promise<TimeSlot[]> {
    return Array.from(this.timeSlots.values()).filter(
      ts => ts.providerId === providerId && ts.isAvailable
    );
  }

  async updateTimeSlot(id: number, timeSlot: Partial<InsertTimeSlot>): Promise<TimeSlot | undefined> {
    const existing = this.timeSlots.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...timeSlot };
    this.timeSlots.set(id, updated);
    return updated;
  }

  async deleteTimeSlot(id: number): Promise<boolean> {
    const existing = this.timeSlots.get(id);
    if (!existing) return false;
    
    const updated = { ...existing, isAvailable: false };
    this.timeSlots.set(id, updated);
    return true;
  }

  // Appointment methods
  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    const id = this.currentId++;
    const appointment: Appointment = { 
      ...insertAppointment, 
      id, 
      status: insertAppointment.status || 'pending',
      createdAt: new Date(),
      notes: insertAppointment.notes || null
    };
    this.appointments.set(id, appointment);
    return appointment;
  }

  async getAppointment(id: number): Promise<Appointment | undefined> {
    return this.appointments.get(id);
  }

  async getAppointmentsByProvider(providerId: number): Promise<Appointment[]> {
    return Array.from(this.appointments.values()).filter(
      a => a.providerId === providerId
    );
  }

  async getAppointmentsByDate(providerId: number, date: string): Promise<Appointment[]> {
    return Array.from(this.appointments.values()).filter(
      a => a.providerId === providerId && a.appointmentDate === date
    );
  }

  async updateAppointment(id: number, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const existing = this.appointments.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...appointment };
    this.appointments.set(id, updated);
    return updated;
  }

  async deleteAppointment(id: number): Promise<boolean> {
    return this.appointments.delete(id);
  }

  // Utility methods
  async getAvailableSlots(providerId: number, date: string): Promise<string[]> {
    const provider = await this.getProvider(providerId);
    if (!provider || !provider.workingHours) return [];

    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();
    
    if (!provider.workingHours.days.includes(dayOfWeek)) {
      return [];
    }

    const appointments = await this.getAppointmentsByDate(providerId, date);
    const bookedTimes = appointments.map(a => a.startTime);
    
    const slots: string[] = [];
    let [currentHour, currentMin] = provider.workingHours.start.split(":").map(Number);
    const [endHour, endMin] = provider.workingHours.end.split(":").map(Number);
    const endTotalMinutes = endHour * 60 + endMin;

    while (currentHour * 60 + currentMin < endTotalMinutes) {
      const timeStr = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
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

  async isSlotAvailable(providerId: number, date: string, startTime: string, endTime: string): Promise<boolean> {
    const appointments = await this.getAppointmentsByDate(providerId, date);
    
    for (const appointment of appointments) {
      if (
        (startTime >= appointment.startTime && startTime < appointment.endTime) ||
        (endTime > appointment.startTime && endTime <= appointment.endTime) ||
        (startTime <= appointment.startTime && endTime >= appointment.endTime)
      ) {
        return false;
      }
    }
    
    return true;
  }

  // Memo methods
  async createMemo(insertMemo: InsertMemo): Promise<Memo> {
    const id = this.currentId++;
    const memo: Memo = {
      ...insertMemo,
      id,
      category: insertMemo.category || null,
      isImportant: insertMemo.isImportant || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.memos.set(id, memo);
    return memo;
  }

  async getMemo(id: number): Promise<Memo | undefined> {
    return this.memos.get(id);
  }

  async getMemosByProvider(providerId: number): Promise<Memo[]> {
    return Array.from(this.memos.values()).filter(m => m.providerId === providerId);
  }

  async updateMemo(id: number, memo: Partial<InsertMemo>): Promise<Memo | undefined> {
    const existing = this.memos.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...memo, updatedAt: new Date() };
    this.memos.set(id, updated);
    return updated;
  }

  async deleteMemo(id: number): Promise<boolean> {
    return this.memos.delete(id);
  }

  // Task methods
  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = this.currentId++;
    const task: Task = {
      ...insertTask,
      id,
      status: insertTask.status || 'pending',
      priority: insertTask.priority || 'medium',
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
      description: insertTask.description || null,
      dueDate: insertTask.dueDate || null,
      assignedTo: insertTask.assignedTo || null,
    };
    this.tasks.set(id, task);
    return task;
  }

  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async getTasksByProvider(providerId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(t => t.providerId === providerId);
  }

  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined> {
    const existing = this.tasks.get(id);
    if (!existing) return undefined;
    
    const updated = { 
      ...existing, 
      ...task, 
      updatedAt: new Date(),
      completedAt: task.status === 'completed' ? new Date() : existing.completedAt
    };
    this.tasks.set(id, updated);
    return updated;
  }

  async deleteTask(id: number): Promise<boolean> {
    return this.tasks.delete(id);
  }

  // Analytics methods
  async getAnalytics(providerId: number, date: string): Promise<any> {
    const key = `${providerId}-${date}`;
    return this.analytics.get(key);
  }

  async createReview(review: any): Promise<any> {
    const id = this.currentId++;
    const fullReview = { ...review, id, createdAt: new Date() };
    this.reviews.set(id, fullReview);
    return fullReview;
  }

  async getReviewsByProvider(providerId: number): Promise<any[]> {
    return Array.from(this.reviews.values()).filter(r => r.providerId === providerId);
  }

  async updateProviderRating(providerId: number, rating: string, reviewCount: number): Promise<void> {
    const provider = this.providers.get(providerId);
    if (provider) {
      provider.rating = rating;
      provider.reviewCount = reviewCount;
      this.providers.set(providerId, provider);
    }
  }
}

export const storage = new DatabaseStorage();
