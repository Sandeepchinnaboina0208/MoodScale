import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";

// Database configuration
interface DatabaseConfig {
  url: string;
  maxConnections: number;
  idleTimeoutMs: number;
  connectionTimeoutMs: number;
  ssl: boolean;
}

const config: DatabaseConfig = {
  url: process.env.DATABASE_URL || "",
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || "20"),
  idleTimeoutMs: parseInt(process.env.DB_IDLE_TIMEOUT || "30000"),
  connectionTimeoutMs: parseInt(process.env.DB_CONNECTION_TIMEOUT || "5000"),
  ssl: process.env.NODE_ENV === "production"
};

// Validate database URL
if (!config.url) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Connection pool for production
let db: any;
let pool: Pool | null = null;

if (process.env.NODE_ENV === "production") {
  // Use connection pooling for production
  pool = new Pool({
    connectionString: config.url,
    max: config.maxConnections,
    idleTimeoutMillis: config.idleTimeoutMs,
    connectionTimeoutMillis: config.connectionTimeoutMs,
    ssl: config.ssl ? { rejectUnauthorized: false } : false,
  });

  db = drizzlePg(pool);
} else {
  // Use Neon HTTP for development (serverless)
  const sql = neon(config.url);
  db = drizzle(sql);
}

// Health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    if (pool) {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
    } else {
      await db.execute('SELECT 1');
    }
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  if (pool) {
    await pool.end();
    console.log('Database connection pool closed');
  }
}

export { db };