import express, { type ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { BookingError } from "./scheduling";
import { registerRoutes } from "./routes";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({ message: "Invalid request data", errors: error.issues.map(issue => ({ path: issue.path, message: issue.message })) });
    return;
  }
  if (error instanceof BookingError) {
    res.status(error.status).json({ message: error.message });
    return;
  }
  const status = Number.isInteger(error?.status) && error.status >= 400 && error.status < 500 ? error.status : 500;
  if (status === 500) console.error("API request failed");
  res.status(status).json({ message: status === 500 ? "Internal Server Error" : "Invalid request" });
};

export async function createApp(options: Parameters<typeof registerRoutes>[1] = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "64kb" }));
  app.use(express.urlencoded({ extended: false, limit: "64kb" }));
  // Log request metadata only. Responses may contain client contact details or notes.
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      if (req.path.startsWith("/api")) console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
    });
    next();
  });
  const server = await registerRoutes(app, options);
  app.use(errorHandler);
  return { app, server };
}
