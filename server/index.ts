import dotenv from "dotenv";
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { runMigrations } from "./db/migrations";
import { dbMonitor } from "./db/monitoring";
import { backupManager } from "./db/backup";
import { 
  databaseHealthCheck, 
  rateLimitMiddleware, 
  requestLogger, 
  databaseErrorHandler 
} from "./middleware/database";

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Database middleware
app.use(requestLogger());
app.use(databaseHealthCheck());
app.use(rateLimitMiddleware(100, 60000)); // 100 requests per minute

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Initialize database
    log("🔄 Running database migrations...");
    const migrationResult = await runMigrations();
    if (migrationResult.success) {
      log("✅ Database migrations completed");
    } else {
      log(`⚠️ Migration warning: ${migrationResult.error}`);
    }

    // Start database monitoring in production
    if (process.env.NODE_ENV === "production") {
      log("🔍 Starting database monitoring...");
      await dbMonitor.startMonitoring(60000); // Monitor every minute
      
      // Start scheduled backups
      if (process.env.BACKUP_ENABLED === 'true') {
        log("💾 Starting scheduled backups...");
        backupManager.startScheduledBackups();
      }
    }

    // Register API routes
    const server = await registerRoutes(app);

    // Error handling middleware (must be after routes)
    app.use(databaseErrorHandler());
    
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    // Setup Vite in development or serve static files in production
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start server
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`🚀 MoodScale server running on port ${port}`);
      log(`📊 Database: ${process.env.NODE_ENV === 'production' ? 'PostgreSQL' : 'Development'}`);
      log(`🔒 Security: Rate limiting, input validation, encryption enabled`);
      log(`💾 Backups: ${process.env.BACKUP_ENABLED === 'true' ? 'Enabled' : 'Disabled'}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      log('🛑 Received SIGTERM, shutting down gracefully...');
      server.close(() => {
        log('👋 Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
})();