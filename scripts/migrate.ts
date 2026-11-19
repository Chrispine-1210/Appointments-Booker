import { migrate } from "drizzle-orm/node-postgres/migrator";
import { migrate as migrateNeon } from "drizzle-orm/neon-serverless/migrator";
import { connectDatabase } from "../server/db";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";

const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL_UNPOOLED or DATABASE_URL is required for migration");
if (new URL(connectionString).hostname.includes("-pooler")) throw new Error("Use a direct database URL for migrations");
const { db, pool } = connectDatabase(connectionString);
try {
  if (new URL(connectionString).hostname.endsWith(".neon.tech")) await migrateNeon(db as NeonDatabase, { migrationsFolder: "./migrations" });
  else await migrate(db as NodePgDatabase, { migrationsFolder: "./migrations" });
  console.log("Database migrations completed");
} finally { await pool.end(); }
