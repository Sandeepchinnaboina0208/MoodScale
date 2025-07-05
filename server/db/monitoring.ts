import { db, checkDatabaseHealth } from "./connection";
import { repository } from "./repository";

export interface DatabaseMetrics {
  health: boolean;
  responseTime: number;
  activeConnections: number;
  stats: any;
  timestamp: string;
}

export class DatabaseMonitor {
  private metrics: DatabaseMetrics[] = [];
  private maxMetricsHistory = 100;

  async collectMetrics(): Promise<DatabaseMetrics> {
    const startTime = Date.now();
    
    try {
      const health = await checkDatabaseHealth();
      const responseTime = Date.now() - startTime;
      const stats = await repository.getDatabaseStats();
      
      const metrics: DatabaseMetrics = {
        health,
        responseTime,
        activeConnections: 0, // Would need pool monitoring for accurate count
        stats,
        timestamp: new Date().toISOString()
      };
      
      // Store metrics (keep last 100)
      this.metrics.push(metrics);
      if (this.metrics.length > this.maxMetricsHistory) {
        this.metrics.shift();
      }
      
      return metrics;
    } catch (error) {
      console.error('Error collecting database metrics:', error);
      return {
        health: false,
        responseTime: Date.now() - startTime,
        activeConnections: 0,
        stats: null,
        timestamp: new Date().toISOString()
      };
    }
  }

  getMetricsHistory(): DatabaseMetrics[] {
    return [...this.metrics];
  }

  getLatestMetrics(): DatabaseMetrics | null {
    return this.metrics[this.metrics.length - 1] || null;
  }

  async startMonitoring(intervalMs: number = 60000): Promise<void> {
    console.log(`Starting database monitoring (interval: ${intervalMs}ms)`);
    
    // Initial collection
    await this.collectMetrics();
    
    // Set up periodic collection
    setInterval(async () => {
      const metrics = await this.collectMetrics();
      
      // Alert on health issues
      if (!metrics.health) {
        console.error('🚨 Database health check failed!', metrics);
      }
      
      // Alert on slow responses
      if (metrics.responseTime > 5000) {
        console.warn('⚠️ Slow database response:', metrics.responseTime + 'ms');
      }
    }, intervalMs);
  }

  // Performance analysis
  getAverageResponseTime(lastN: number = 10): number {
    const recent = this.metrics.slice(-lastN);
    if (recent.length === 0) return 0;
    
    const total = recent.reduce((sum, metric) => sum + metric.responseTime, 0);
    return total / recent.length;
  }

  getHealthPercentage(lastN: number = 10): number {
    const recent = this.metrics.slice(-lastN);
    if (recent.length === 0) return 0;
    
    const healthy = recent.filter(metric => metric.health).length;
    return (healthy / recent.length) * 100;
  }
}

export const dbMonitor = new DatabaseMonitor();