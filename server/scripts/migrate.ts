#!/usr/bin/env tsx
import { runMigrations } from "../db/migrations";

async function main() {
  console.log("🚀 Starting database migrations...");
  
  try {
    const result = await runMigrations();
    
    if (result.success) {
      console.log(`✅ Migrations completed successfully! (${result.migrationsRun} migrations run)`);
      process.exit(0);
    } else {
      console.error(`❌ Migration failed: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Migration script failed:", error);
    process.exit(1);
  }
}

main();