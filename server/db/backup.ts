import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface BackupConfig {
  enabled: boolean;
  schedule: string; // cron format
  retentionDays: number;
  backupPath: string;
  compression: boolean;
}

export class DatabaseBackup {
  private config: BackupConfig;

  constructor(config: Partial<BackupConfig> = {}) {
    this.config = {
      enabled: process.env.BACKUP_ENABLED === 'true',
      schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
      retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
      backupPath: process.env.BACKUP_PATH || './backups',
      compression: process.env.BACKUP_COMPRESSION !== 'false',
      ...config
    };

    // Ensure backup directory exists
    if (!fs.existsSync(this.config.backupPath)) {
      fs.mkdirSync(this.config.backupPath, { recursive: true });
    }
  }

  async createBackup(): Promise<string> {
    if (!this.config.enabled) {
      throw new Error('Backups are disabled');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `moodscale_backup_${timestamp}.sql`;
    const filepath = path.join(this.config.backupPath, filename);

    try {
      console.log('Creating MySQL database backup...');
      
      // MySQL connection details
      const host = process.env.DB_HOST || 'localhost';
      const port = process.env.DB_PORT || '3306';
      const user = process.env.DB_USER || 'root';
      const password = process.env.DB_PASSWORD || 'Sandeep@2004';
      const database = process.env.DB_NAME || 'MoodScale';

      let command = `mysqldump -h ${host} -P ${port} -u ${user} -p${password} ${database} > "${filepath}"`;
      
      if (this.config.compression) {
        command = `mysqldump -h ${host} -P ${port} -u ${user} -p${password} ${database} | gzip > "${filepath}.gz"`;
      }

      await execAsync(command);
      
      console.log(`Backup created: ${filepath}`);
      
      // Clean up old backups
      await this.cleanupOldBackups();
      
      return filepath;
    } catch (error) {
      console.error('Backup failed:', error);
      throw new Error('Failed to create database backup');
    }
  }

  async restoreBackup(backupPath: string): Promise<void> {
    if (!fs.existsSync(backupPath)) {
      throw new Error('Backup file not found');
    }

    try {
      console.log('Restoring MySQL database backup...');
      
      const host = process.env.DB_HOST || 'localhost';
      const port = process.env.DB_PORT || '3306';
      const user = process.env.DB_USER || 'root';
      const password = process.env.DB_PASSWORD || 'Sandeep@2004';
      const database = process.env.DB_NAME || 'MoodScale';

      let command = `mysql -h ${host} -P ${port} -u ${user} -p${password} ${database} < "${backupPath}"`;
      
      if (backupPath.endsWith('.gz')) {
        command = `gunzip -c "${backupPath}" | mysql -h ${host} -P ${port} -u ${user} -p${password} ${database}`;
      }

      await execAsync(command);
      
      console.log('Backup restored successfully');
    } catch (error) {
      console.error('Restore failed:', error);
      throw new Error('Failed to restore database backup');
    }
  }

  async listBackups(): Promise<string[]> {
    try {
      const files = fs.readdirSync(this.config.backupPath);
      return files
        .filter(file => file.startsWith('moodscale_backup_'))
        .sort()
        .reverse(); // Most recent first
    } catch (error) {
      console.error('Error listing backups:', error);
      return [];
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      const backups = await this.listBackups();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

      for (const backup of backups) {
        const backupPath = path.join(this.config.backupPath, backup);
        const stats = fs.statSync(backupPath);
        
        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(backupPath);
          console.log(`Deleted old backup: ${backup}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old backups:', error);
    }
  }

  startScheduledBackups(): void {
    if (!this.config.enabled) {
      console.log('Scheduled backups are disabled');
      return;
    }

    console.log(`Scheduled backups enabled: ${this.config.schedule}`);
    
    // For production, you would use a proper cron scheduler
    // This is a simplified version for demonstration
    const intervalMs = 24 * 60 * 60 * 1000; // Daily
    
    setInterval(async () => {
      try {
        await this.createBackup();
      } catch (error) {
        console.error('Scheduled backup failed:', error);
      }
    }, intervalMs);
  }
}

export const backupManager = new DatabaseBackup();