import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

// Database configuration
interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  maxConnections: number;
  idleTimeoutMs: number;
  connectionTimeoutMs: number;
  ssl: boolean;
}

const config: DatabaseConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306"),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "Sandeep@2004",
  database: process.env.DB_NAME || "MoodScale",
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || "20"),
  idleTimeoutMs: parseInt(process.env.DB_IDLE_TIMEOUT || "30000"),
  connectionTimeoutMs: parseInt(process.env.DB_CONNECTION_TIMEOUT || "5000"),
  ssl: process.env.NODE_ENV === "production"
};

// Create connection pool
const pool = mysql.createPool({
  host: config.host,
  port: config.port,
  user: config.user,
  password: config.password,
  database: config.database,
  connectionLimit: config.maxConnections,
  acquireTimeout: config.connectionTimeoutMs,
  timeout: config.idleTimeoutMs,
  ssl: config.ssl ? { rejectUnauthorized: false } : false,
  multipleStatements: false,
  dateStrings: false,
});

// Initialize Drizzle with the pool
export const db = drizzle(pool);

// Health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const connection = await pool.getConnection();
    await connection.execute('SELECT 1');
    connection.release();
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Get connection pool stats
export async function getPoolStats() {
  return {
    totalConnections: pool.pool.config.connectionLimit,
    activeConnections: pool.pool._allConnections.length,
    freeConnections: pool.pool._freeConnections.length,
    queuedConnections: pool.pool._connectionQueue.length,
  };
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await pool.end();
    console.log('MySQL connection pool closed');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
}

// Initialize database and create tables if they don't exist
export async function initializeDatabase(): Promise<void> {
  try {
    console.log('🔄 Initializing MySQL database...');
    
    // Create database if it doesn't exist
    const tempConnection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
    });
    
    await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${config.database}\``);
    await tempConnection.end();
    
    // Create tables
    await createTables();
    
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

async function createTables(): Promise<void> {
  const connection = await pool.getConnection();
  
  try {
    // Users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        spotify_id VARCHAR(255),
        spotify_access_token TEXT,
        spotify_refresh_token TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_username (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Mood entries table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS mood_entries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        mood_score INT NOT NULL CHECK (mood_score >= 1 AND mood_score <= 10),
        emotions JSON,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_created (user_id, created_at DESC),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Music analysis table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS music_analysis (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        spotify_track_id VARCHAR(255) NOT NULL,
        track_name VARCHAR(500) NOT NULL,
        artist_name VARCHAR(500) NOT NULL,
        album_image TEXT,
        audio_features JSON,
        predicted_mood VARCHAR(100),
        mood_confidence FLOAT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_created (user_id, created_at DESC),
        INDEX idx_track (spotify_track_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Recommendations table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS recommendations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        mood_entry_id INT,
        spotify_track_id VARCHAR(255) NOT NULL,
        track_name VARCHAR(500) NOT NULL,
        artist_name VARCHAR(500) NOT NULL,
        album_image TEXT,
        reason TEXT,
        match_score FLOAT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_created (user_id, created_at DESC),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (mood_entry_id) REFERENCES mood_entries(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Personality insights table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS personality_insights (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        music_dna TEXT,
        energy_level FLOAT,
        positivity_level FLOAT,
        ai_suggestion TEXT,
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_generated (user_id, generated_at DESC),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ All tables created successfully');
  } finally {
    connection.release();
  }
}