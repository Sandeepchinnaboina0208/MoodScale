#!/usr/bin/env tsx
import { backupManager } from "../db/backup";

async function main() {
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'create':
        console.log("🔄 Creating database backup...");
        const backupPath = await backupManager.createBackup();
        console.log(`✅ Backup created: ${backupPath}`);
        break;
        
      case 'list':
        console.log("📋 Listing available backups...");
        const backups = await backupManager.listBackups();
        if (backups.length === 0) {
          console.log("No backups found");
        } else {
          backups.forEach((backup, index) => {
            console.log(`${index + 1}. ${backup}`);
          });
        }
        break;
        
      case 'restore':
        const backupFile = process.argv[3];
        if (!backupFile) {
          console.error("❌ Please specify backup file to restore");
          process.exit(1);
        }
        console.log(`🔄 Restoring backup: ${backupFile}`);
        await backupManager.restoreBackup(backupFile);
        console.log("✅ Backup restored successfully");
        break;
        
      case 'schedule':
        console.log("⏰ Starting scheduled backups...");
        backupManager.startScheduledBackups();
        console.log("✅ Scheduled backups started");
        break;
        
      default:
        console.log("Usage:");
        console.log("  npm run db:backup create    - Create a new backup");
        console.log("  npm run db:backup list      - List available backups");
        console.log("  npm run db:backup restore <file> - Restore from backup");
        console.log("  npm run db:backup schedule  - Start scheduled backups");
        break;
    }
  } catch (error) {
    console.error("❌ Backup operation failed:", error);
    process.exit(1);
  }
}

main();