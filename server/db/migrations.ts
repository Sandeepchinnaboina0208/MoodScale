import { migrate } from "drizzle-orm/neon-http/migrator";
import { db } from "./connection";
import fs from "fs";
import path from "path";

export interface MigrationResult {
  success: boolean;
  migrationsRun: number;
  error?: string;
}

export async function runMigrations(): Promise<MigrationResult> {
  try {
    const migrationsFolder = path.join(process.cwd(), "migrations");
    
    // Check if migrations folder exists
    if (!fs.existsSync(migrationsFolder)) {
      console.log("No migrations folder found, skipping migrations");
      return { success: true, migrationsRun: 0 };
    }

    console.log("Running database migrations...");
    
    await migrate(db, { migrationsFolder });
    
    console.log("Migrations completed successfully");
    return { success: true, migrationsRun: 1 };
  } catch (error) {
    console.error("Migration failed:", error);
    return { 
      success: false, 
      migrationsRun: 0, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

export async function createMigration(name: string): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${timestamp}_${name}.sql`;
  const migrationsDir = path.join(process.cwd(), "migrations");
  
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }
  
  const migrationPath = path.join(migrationsDir, filename);
  const template = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}

-- Add your SQL statements here
-- Example:
-- CREATE TABLE example (
--   id SERIAL PRIMARY KEY,
--   name VARCHAR(255) NOT NULL,
--   created_at TIMESTAMP DEFAULT NOW()
-- );
`;
  
  fs.writeFileSync(migrationPath, template);
  console.log(`Migration created: ${migrationPath}`);
}