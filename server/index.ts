import { createApp } from "./app";
import { serveStatic } from "./static";

async function main() {
  const { app, server, storage } = await createApp();
  if (process.env.NODE_ENV === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = Number(process.env.PORT ?? 5000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be between 1 and 65535");
  server.listen({ port, host: "0.0.0.0" }, () => console.log(`Serving on port ${port}`));
  for (const signal of ["SIGTERM", "SIGINT"] as const) process.once(signal, () => {
    server.close(() => { void storage.close().then(() => process.exit(0)); });
  });
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : "Application startup failed");
  process.exitCode = 1;
});
