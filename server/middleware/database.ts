import { Request, Response, NextFunction } from "express";
import { checkDatabaseHealth } from "../db/connection";
import { checkRateLimit } from "../db/security";

// Database health check middleware
export function databaseHealthCheck() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isHealthy = await checkDatabaseHealth();
      if (!isHealthy) {
        return res.status(503).json({ 
          error: "Database unavailable",
          message: "Service temporarily unavailable" 
        });
      }
      next();
    } catch (error) {
      console.error('Database health check failed:', error);
      res.status(503).json({ 
        error: "Database error",
        message: "Service temporarily unavailable" 
      });
    }
  };
}

// Rate limiting middleware
export function rateLimitMiddleware(maxRequests: number = 100, windowMs: number = 60000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const identifier = req.ip || 'unknown';
    
    if (!checkRateLimit(identifier, maxRequests, windowMs)) {
      return res.status(429).json({
        error: "Rate limit exceeded",
        message: "Too many requests, please try again later"
      });
    }
    
    next();
  };
}

// Request logging middleware
export function requestLogger() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logData = {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      };
      
      // Log to console (in production, use proper logging service)
      if (req.url.startsWith('/api/')) {
        console.log('API Request:', JSON.stringify(logData));
      }
    });
    
    next();
  };
}

// Error handling middleware
export function databaseErrorHandler() {
  return (error: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Database error:', error);
    
    // Don't expose internal errors in production
    if (process.env.NODE_ENV === 'production') {
      res.status(500).json({
        error: "Internal server error",
        message: "Something went wrong"
      });
    } else {
      res.status(500).json({
        error: error.message || "Database error",
        stack: error.stack
      });
    }
  };
}