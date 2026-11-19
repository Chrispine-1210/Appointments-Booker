import express, { type ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { BookingError } from "./scheduling";
import { registerRoutes } from "./routes";
import { createStorage } from "./db";
import { sameOrigin } from "./access";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({ message: "Invalid request data", errors: error.issues.map(issue => ({ path: issue.path, message: issue.message })) });
    return;
  }
  if (error instanceof BookingError) {
    if (error.status === 503) res.set("Retry-After", "1");
    res.status(error.status).json({ message: error.message });
    return;
  }
  let databaseError = error;
  for (let depth = 0; depth < 4 && databaseError?.cause; depth++) databaseError = databaseError.cause;
  const databaseStatus: Record<string, [number, string]> = {
    "40P01": [503, "Database is temporarily busy. Please retry shortly."],
    "40001": [503, "Database is temporarily busy. Please retry shortly."],
    "23P01": [409, "Time slot is not available"],
    "23505": [409, "A record with these details already exists"],
    "23503": [400, "Invalid related record"],
    "23514": [400, "Invalid booking or record data"],
    "22007": [400, "Invalid appointment date or time"],
    "22008": [400, "Invalid appointment date or time"],
  };
  if (databaseStatus[databaseError?.code]) {
    const [status, message] = databaseStatus[databaseError.code];
    res.status(status).json({ message });
    return;
  }
  const status = Number.isInteger(error?.status) && error.status >= 400 && error.status < 500 ? error.status : 500;
  if (status === 500) console.error("API request failed");
  res.status(status).json({ message: status === 500 ? "Internal Server Error" : "Invalid request" });
};

export async function createApp(options: Parameters<typeof registerRoutes>[1] = {}) {
  const app = express();
  const storage = options.storage ?? await createStorage();
  const proxyHops = Number(process.env.TRUST_PROXY ?? (process.env.NODE_ENV === "production" ? 1 : 0));
  if (!Number.isInteger(proxyHops) || proxyHops < 0 || proxyHops > 3) throw new Error("TRUST_PROXY must be a hop count between 0 and 3");
  app.set("trust proxy", proxyHops);
  app.disable("x-powered-by");
  app.use(express.json({ limit: "64kb" }));
  app.use(express.urlencoded({ extended: false, limit: "64kb" }));
  app.use("/api", sameOrigin);
  // Log request metadata only. Responses may contain client contact details or notes.
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      if (req.path.startsWith("/api")) console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
    });
    next();
  });
  const server = await registerRoutes(app, { ...options, storage });
  app.use(errorHandler);
  return { app, server, storage };
}
