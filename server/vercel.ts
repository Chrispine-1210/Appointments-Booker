import type { IncomingMessage, ServerResponse } from "node:http";
import { createApp } from "./app";

// Preview instances have a platform-generated canonical URL. Production keeps
// the explicitly configured APP_ORIGIN and never trusts the request Host header.
if (process.env.VERCEL_ENV === "preview" && !process.env.APP_ORIGIN && process.env.VERCEL_URL) {
  process.env.APP_ORIGIN = `https://${process.env.VERCEL_URL}`;
}

let application: ReturnType<typeof createApp> | undefined;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    application ??= createApp().then(result => {
      result.app.use((_req, response) => response.status(404).json({ message: "API route not found" }));
      return result;
    }).catch(error => {
      application = undefined;
      throw error;
    });
    const { app } = await application;
    app(req, res);
  } catch {
    console.error("Application initialization failed");
    res.writeHead(503, { "Content-Type": "application/json", "Cache-Control": "no-store", "Retry-After": "5" });
    res.end(JSON.stringify({ message: "Service temporarily unavailable" }));
  }
}
