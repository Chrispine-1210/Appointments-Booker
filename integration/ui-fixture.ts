// Isolated visual-review server. This uses only fictional in-memory records and
// an injected test identity, just like the HTTP regression adapter. It is not
// imported by the application or either production bundle.
import { createApp } from "../server/app";
import { MemoryStorage } from "../server/storage";
import { setupAuth } from "../server/auth";
import { setupVite } from "../server/vite";
import { addDays, format } from "date-fns";
if (process.env.NODE_ENV !== "development" || process.env.DATABASE_URL)
  throw new Error(
    "UI fixture requires development mode without a database connection",
  );
const storage = new MemoryStorage();
const user = await storage.upsertUser({
  id: "isolated-ui-review",
  email: "workspace@example.invalid",
  firstName: "Preview",
  lastName: "Workspace",
});
const reviewClient = await storage.upsertUser({
  id: "isolated-ui-client",
  email: "client@example.invalid",
  firstName: "Preview",
  lastName: "Client",
});
const subject = process.argv.includes("--client") ? reviewClient : user;
const provider = await storage.createProvider(
  {
    name: "Interface Review Studio",
    specialty: "Consulting",
    email: "studio@example.invalid",
    phone: "+265000000000",
    workingHours: { start: "08:00", end: "17:00", days: [0, 1, 2, 3, 4, 5, 6] },
    bio: "Fictional records for isolated interface review.",
  },
  user.id,
);
const service = await storage.createService({
  providerId: provider.id,
  name: "Consultation",
  duration: 30,
  price: "15000.00",
  description: "An introductory consultation",
});
const today = new Date();
for (const [i, name] of [
  "Review Client A",
  "Review Client B",
  "Review Client C",
].entries())
  await storage.createAppointment({
    providerId: provider.id,
    serviceId: service.id,
    clientUserId: reviewClient.id,
    clientName: name,
    clientEmail: `client-${i}@example.invalid`,
    clientPhone: "+265000000000",
    appointmentDate: format(today, "yyyy-MM-dd"),
    startTime: `${9 + i}:00`.padStart(5, "0"),
    endTime: `${9 + i}:30`.padStart(5, "0"),
    status: i === 0 ? "completed" : "confirmed",
    paymentAmount: "15000.00",
    paymentStatus: "pending",
  });
await storage.createAppointment({
  providerId: provider.id,
  serviceId: service.id,
  clientUserId: reviewClient.id,
  clientName: "Review Client D",
  clientEmail: "client-d@example.invalid",
  clientPhone: "+265000000000",
  appointmentDate: format(addDays(today, 3), "yyyy-MM-dd"),
  startTime: "13:00",
  endTime: "13:30",
  status: "confirmed",
  paymentAmount: "15000.00",
});
await storage.createTask({
  providerId: provider.id,
  title: "Prepare consultation notes",
  description: "Review the points for the next working day.",
  status: "pending",
  priority: "high",
  dueDate: format(today, "yyyy-MM-dd"),
});
await storage.createTask({
  providerId: provider.id,
  title: "Update service descriptions",
  status: "completed",
  priority: "medium",
});
await storage.createMemo({
  providerId: provider.id,
  title: "Ideas for next week",
  content: "Set aside a little time for planning.\nKeep the next step clear.",
  category: "ideas",
  isImportant: true,
});
const { app, server } = await createApp({
  storage,
  setupAuth: async (app) => {
    await setupAuth(app, storage);
    app.use((req, _res, next) => {
      req.user = {
        claims: { sub: subject.id },
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      } as Express.User;
      req.isAuthenticated = (() => true) as typeof req.isAuthenticated;
      next();
    });
  },
});
await setupVite(app, server);
const index = process.argv.indexOf("--port");
const port = index >= 0 ? Number(process.argv[index + 1]) : 4173;
server.listen({ port, host: "0.0.0.0" }, () =>
  console.log("Isolated UI fixture ready"),
);
