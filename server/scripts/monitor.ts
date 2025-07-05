#!/usr/bin/env tsx
import { dbMonitor } from "../db/monitoring";

async function main() {
  console.log("🔍 Starting database monitoring...");
  
  try {
    // Start monitoring with 30-second intervals
    await dbMonitor.startMonitoring(30000);
    
    // Keep the process running
    process.on('SIGINT', () => {
      console.log("\n👋 Stopping database monitoring...");
      process.exit(0);
    });
    
    // Display periodic reports
    setInterval(() => {
      const latest = dbMonitor.getLatestMetrics();
      const avgResponse = dbMonitor.getAverageResponseTime();
      const healthPercent = dbMonitor.getHealthPercentage();
      
      console.log("\n📊 Database Status Report:");
      console.log(`   Health: ${latest?.health ? '🟢 Healthy' : '🔴 Unhealthy'}`);
      console.log(`   Response Time: ${latest?.responseTime}ms (avg: ${avgResponse.toFixed(1)}ms)`);
      console.log(`   Health %: ${healthPercent.toFixed(1)}%`);
      
      if (latest?.stats) {
        console.log(`   Users: ${latest.stats.users}`);
        console.log(`   Mood Entries: ${latest.stats.moodEntries}`);
        console.log(`   Music Analysis: ${latest.stats.musicAnalysis}`);
      }
    }, 60000); // Report every minute
    
  } catch (error) {
    console.error("❌ Monitoring failed:", error);
    process.exit(1);
  }
}

main();