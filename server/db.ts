import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { drizzle as neonDrizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import { drizzle as pgDrizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool as PgPool } from "pg";
import ws from "ws";
import session from "express-session";
import connectPg from "connect-pg-simple";
import * as schema from "@shared/schema";
import { MemoryStorage, type IStorage } from "./storage";

neonConfig.webSocketConstructor = ws;
export type AppDatabase = NeonDatabase<typeof schema> | NodePgDatabase<typeof schema>;
export type AppPool = NeonPool | PgPool;

export function connectDatabase(connectionString: string) {
  // Keep the existing Neon WebSocket driver for Neon. Standard PostgreSQL uses
  // TCP, which also permits isolated integration tests against real PostgreSQL.
  const neon = new URL(connectionString).hostname.endsWith(".neon.tech");
  const pool: AppPool = neon ? new NeonPool({ connectionString, max: 10 }) : new PgPool({ connectionString, max: 10, connectionTimeoutMillis: 10000 });
  const db: AppDatabase = neon ? neonDrizzle(pool as NeonPool, { schema }) : pgDrizzle(pool as PgPool, { schema });
  const PgStore = connectPg(session);
  // Both drivers implement the node-postgres pool contract used by this store.
  const sessionStore = new PgStore({ pool: pool as PgPool, tableName: "sessions", createTableIfMissing: false, pruneSessionInterval: false });
  return { db, pool, sessionStore };
}

export async function createStorage(): Promise<IStorage> {
  if (!process.env.DATABASE_URL) {
    if (process.env.NODE_ENV === "production") throw new Error("DATABASE_URL is required in production");
    return new MemoryStorage();
  }
  const { PostgresStorage } = await import("./postgres-storage");
  const connection = connectDatabase(process.env.DATABASE_URL);
  const storage = new PostgresStorage(connection.db, connection.pool, connection.sessionStore);
  try { await storage.assertReady(); }
  catch (error) { await storage.close(); throw error; }
  return storage;
}
