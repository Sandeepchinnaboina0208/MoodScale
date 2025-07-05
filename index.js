// server/index.ts
import dotenv from "dotenv";
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/db/repository.ts
import { eq, desc, and, gte, sql } from "drizzle-orm";

// server/db/connection.ts
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
var config = {
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
var pool = mysql.createPool({
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
  dateStrings: false
});
var db = drizzle(pool);
async function checkDatabaseHealth() {
  try {
    const connection = await pool.getConnection();
    await connection.execute("SELECT 1");
    connection.release();
    return true;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
}
async function initializeDatabase() {
  try {
    console.log("\u{1F504} Initializing MySQL database...");
    const tempConnection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password
    });
    await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${config.database}\``);
    await tempConnection.end();
    await createTables();
    console.log("\u2705 Database initialized successfully");
  } catch (error) {
    console.error("\u274C Database initialization failed:", error);
    throw error;
  }
}
async function createTables() {
  const connection = await pool.getConnection();
  try {
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
    console.log("\u2705 All tables created successfully");
  } finally {
    connection.release();
  }
}

// shared/schema.ts
import { mysqlTable, text, int, timestamp, json, float, varchar } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  spotifyId: varchar("spotify_id", { length: 255 }),
  spotifyAccessToken: text("spotify_access_token"),
  spotifyRefreshToken: text("spotify_refresh_token"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var moodEntries = mysqlTable("mood_entries", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  moodScore: int("mood_score").notNull(),
  // 1-10 scale
  emotions: json("emotions"),
  // JSON array of emotion strings
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var musicAnalysis = mysqlTable("music_analysis", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  spotifyTrackId: varchar("spotify_track_id", { length: 255 }).notNull(),
  trackName: varchar("track_name", { length: 500 }).notNull(),
  artistName: varchar("artist_name", { length: 500 }).notNull(),
  albumImage: text("album_image"),
  audioFeatures: json("audio_features"),
  // Spotify audio features
  predictedMood: varchar("predicted_mood", { length: 100 }),
  moodConfidence: float("mood_confidence"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var recommendations = mysqlTable("recommendations", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  moodEntryId: int("mood_entry_id"),
  spotifyTrackId: varchar("spotify_track_id", { length: 255 }).notNull(),
  trackName: varchar("track_name", { length: 500 }).notNull(),
  artistName: varchar("artist_name", { length: 500 }).notNull(),
  albumImage: text("album_image"),
  reason: text("reason"),
  // AI-generated reason for recommendation
  matchScore: float("match_score"),
  // 0-1 confidence score
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var personalityInsights = mysqlTable("personality_insights", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  musicDNA: text("music_dna"),
  energyLevel: float("energy_level"),
  // 0-1
  positivityLevel: float("positivity_level"),
  // 0-1
  aiSuggestion: text("ai_suggestion"),
  generatedAt: timestamp("generated_at").notNull().defaultNow()
});
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true
});
var insertMoodEntrySchema = createInsertSchema(moodEntries).omit({
  id: true,
  createdAt: true
}).extend({
  emotions: z.array(z.string()).optional()
});
var insertMusicAnalysisSchema = createInsertSchema(musicAnalysis).omit({
  id: true,
  createdAt: true
});
var insertRecommendationSchema = createInsertSchema(recommendations).omit({
  id: true,
  createdAt: true
});
var insertPersonalityInsightSchema = createInsertSchema(personalityInsights).omit({
  id: true,
  generatedAt: true
});

// server/db/validators.ts
import { z as z2 } from "zod";
var userValidation = {
  create: z2.object({
    username: z2.string().min(3, "Username must be at least 3 characters").max(50, "Username must be less than 50 characters").regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
    email: z2.string().email("Invalid email format").optional(),
    spotifyId: z2.string().optional()
  }),
  update: z2.object({
    username: z2.string().min(3).max(50).optional(),
    email: z2.string().email().optional(),
    spotifyId: z2.string().optional(),
    spotifyAccessToken: z2.string().optional(),
    spotifyRefreshToken: z2.string().optional()
  })
};
var moodEntryValidation = {
  create: z2.object({
    userId: z2.number().positive("User ID must be positive"),
    moodScore: z2.number().min(1, "Mood score must be between 1 and 10").max(10, "Mood score must be between 1 and 10"),
    emotions: z2.array(z2.string()).max(10, "Too many emotions selected").optional(),
    notes: z2.string().max(1e3, "Notes must be less than 1000 characters").optional()
  })
};
var musicAnalysisValidation = {
  create: z2.object({
    userId: z2.number().positive(),
    spotifyTrackId: z2.string().min(1, "Spotify track ID is required"),
    trackName: z2.string().min(1, "Track name is required").max(200),
    artistName: z2.string().min(1, "Artist name is required").max(200),
    albumImage: z2.string().url().optional(),
    audioFeatures: z2.object({
      energy: z2.number().min(0).max(1),
      valence: z2.number().min(0).max(1),
      danceability: z2.number().min(0).max(1),
      acousticness: z2.number().min(0).max(1),
      tempo: z2.number().positive(),
      speechiness: z2.number().min(0).max(1),
      instrumentalness: z2.number().min(0).max(1),
      liveness: z2.number().min(0).max(1)
    }).optional(),
    predictedMood: z2.string().max(50).optional(),
    moodConfidence: z2.number().min(0).max(1).optional()
  })
};
function sanitizeString(input) {
  return input.trim().replace(/[<>]/g, "");
}
function sanitizeArray(input) {
  return input.map((item) => sanitizeString(item)).filter((item) => item.length > 0);
}
var rateLimitValidation = {
  moodEntry: z2.object({
    userId: z2.number(),
    timestamp: z2.date()
  }),
  musicAnalysis: z2.object({
    userId: z2.number(),
    timestamp: z2.date()
  })
};

// server/db/security.ts
import crypto from "crypto";
import bcrypt from "bcrypt";
var ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
var ALGORITHM = "aes-256-gcm";
var IV_LENGTH = 16;
function encrypt(text2) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
  cipher.setAAD(Buffer.from("moodscale-auth"));
  let encrypted = cipher.update(text2, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();
  return {
    encrypted,
    iv: iv.toString("hex"),
    tag: tag.toString("hex")
  };
}
var rateLimitStore = /* @__PURE__ */ new Map();
function checkRateLimit(identifier, maxRequests = 100, windowMs = 6e4) {
  const now = Date.now();
  const key = identifier;
  const record = rateLimitStore.get(key);
  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  if (record.count >= maxRequests) {
    return false;
  }
  record.count++;
  return true;
}
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 6e4);

// server/db/repository.ts
var DatabaseRepository = class {
  // User operations
  async createUser(userData) {
    const validated = userValidation.create.parse(userData);
    const sanitized = {
      ...validated,
      username: sanitizeString(validated.username)
    };
    try {
      const [user] = await db.insert(users).values(sanitized).$returningId();
      const createdUser = await this.getUser(user.id);
      if (!createdUser) throw new Error("Failed to retrieve created user");
      return createdUser;
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        throw new Error("Username already exists");
      }
      throw new Error("Failed to create user");
    }
  }
  async getUser(id) {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return user;
    } catch (error) {
      console.error("Error fetching user:", error);
      return void 0;
    }
  }
  async getUserByUsername(username) {
    const sanitizedUsername = sanitizeString(username);
    try {
      const [user] = await db.select().from(users).where(eq(users.username, sanitizedUsername)).limit(1);
      return user;
    } catch (error) {
      console.error("Error fetching user by username:", error);
      return void 0;
    }
  }
  async updateUser(id, updates) {
    const validated = userValidation.update.parse(updates);
    const sanitizedUpdates = { ...validated };
    if (validated.spotifyAccessToken) {
      const encrypted = encrypt(validated.spotifyAccessToken);
      sanitizedUpdates.spotifyAccessToken = JSON.stringify(encrypted);
    }
    if (validated.spotifyRefreshToken) {
      const encrypted = encrypt(validated.spotifyRefreshToken);
      sanitizedUpdates.spotifyRefreshToken = JSON.stringify(encrypted);
    }
    try {
      await db.update(users).set(sanitizedUpdates).where(eq(users.id, id));
      return await this.getUser(id);
    } catch (error) {
      console.error("Error updating user:", error);
      return void 0;
    }
  }
  // Mood entry operations
  async createMoodEntry(entryData) {
    const validated = moodEntryValidation.create.parse(entryData);
    if (!checkRateLimit(`mood_entry_${validated.userId}`, 10, 6e4)) {
      throw new Error("Rate limit exceeded for mood entries");
    }
    const sanitized = {
      ...validated,
      emotions: validated.emotions ? sanitizeArray(validated.emotions) : null,
      notes: validated.notes ? sanitizeString(validated.notes) : null
    };
    try {
      const [result] = await db.insert(moodEntries).values(sanitized).$returningId();
      const entry = await this.getMoodEntry(result.id);
      if (!entry) throw new Error("Failed to retrieve created mood entry");
      return entry;
    } catch (error) {
      console.error("Error creating mood entry:", error);
      throw new Error("Failed to create mood entry");
    }
  }
  async getMoodEntry(id) {
    try {
      const [entry] = await db.select().from(moodEntries).where(eq(moodEntries.id, id)).limit(1);
      return entry;
    } catch (error) {
      console.error("Error fetching mood entry:", error);
      return void 0;
    }
  }
  async getMoodEntries(userId, limit = 50) {
    try {
      return await db.select().from(moodEntries).where(eq(moodEntries.userId, userId)).orderBy(desc(moodEntries.createdAt)).limit(Math.min(limit, 100));
    } catch (error) {
      console.error("Error fetching mood entries:", error);
      return [];
    }
  }
  async getMoodTrends(userId, days) {
    const cutoffDate = /* @__PURE__ */ new Date();
    cutoffDate.setDate(cutoffDate.getDate() - Math.min(days, 365));
    try {
      return await db.select().from(moodEntries).where(
        and(
          eq(moodEntries.userId, userId),
          gte(moodEntries.createdAt, cutoffDate)
        )
      ).orderBy(moodEntries.createdAt);
    } catch (error) {
      console.error("Error fetching mood trends:", error);
      return [];
    }
  }
  // Music analysis operations
  async createMusicAnalysis(analysisData) {
    const validated = musicAnalysisValidation.create.parse(analysisData);
    if (!checkRateLimit(`music_analysis_${validated.userId}`, 20, 6e4)) {
      throw new Error("Rate limit exceeded for music analysis");
    }
    const sanitized = {
      ...validated,
      trackName: sanitizeString(validated.trackName),
      artistName: sanitizeString(validated.artistName),
      predictedMood: validated.predictedMood ? sanitizeString(validated.predictedMood) : null
    };
    try {
      const [result] = await db.insert(musicAnalysis).values(sanitized).$returningId();
      const analysis = await this.getMusicAnalysisById(result.id);
      if (!analysis) throw new Error("Failed to retrieve created music analysis");
      return analysis;
    } catch (error) {
      console.error("Error creating music analysis:", error);
      throw new Error("Failed to create music analysis");
    }
  }
  async getMusicAnalysisById(id) {
    try {
      const [analysis] = await db.select().from(musicAnalysis).where(eq(musicAnalysis.id, id)).limit(1);
      return analysis;
    } catch (error) {
      console.error("Error fetching music analysis:", error);
      return void 0;
    }
  }
  async getMusicAnalysis(userId, limit = 50) {
    try {
      return await db.select().from(musicAnalysis).where(eq(musicAnalysis.userId, userId)).orderBy(desc(musicAnalysis.createdAt)).limit(Math.min(limit, 100));
    } catch (error) {
      console.error("Error fetching music analysis:", error);
      return [];
    }
  }
  // Recommendation operations
  async createRecommendation(recData) {
    try {
      const [result] = await db.insert(recommendations).values(recData).$returningId();
      const recommendation = await this.getRecommendationById(result.id);
      if (!recommendation) throw new Error("Failed to retrieve created recommendation");
      return recommendation;
    } catch (error) {
      console.error("Error creating recommendation:", error);
      throw new Error("Failed to create recommendation");
    }
  }
  async getRecommendationById(id) {
    try {
      const [recommendation] = await db.select().from(recommendations).where(eq(recommendations.id, id)).limit(1);
      return recommendation;
    } catch (error) {
      console.error("Error fetching recommendation:", error);
      return void 0;
    }
  }
  async getRecommendations(userId, limit = 20) {
    try {
      return await db.select().from(recommendations).where(eq(recommendations.userId, userId)).orderBy(desc(recommendations.createdAt)).limit(Math.min(limit, 50));
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      return [];
    }
  }
  // Personality insights operations
  async createPersonalityInsight(insightData) {
    try {
      const [result] = await db.insert(personalityInsights).values(insightData).$returningId();
      const insight = await this.getPersonalityInsightById(result.id);
      if (!insight) throw new Error("Failed to retrieve created personality insight");
      return insight;
    } catch (error) {
      console.error("Error creating personality insight:", error);
      throw new Error("Failed to create personality insight");
    }
  }
  async getPersonalityInsightById(id) {
    try {
      const [insight] = await db.select().from(personalityInsights).where(eq(personalityInsights.id, id)).limit(1);
      return insight;
    } catch (error) {
      console.error("Error fetching personality insight:", error);
      return void 0;
    }
  }
  async getLatestPersonalityInsight(userId) {
    try {
      const [insight] = await db.select().from(personalityInsights).where(eq(personalityInsights.userId, userId)).orderBy(desc(personalityInsights.generatedAt)).limit(1);
      return insight;
    } catch (error) {
      console.error("Error fetching personality insight:", error);
      return void 0;
    }
  }
  // Analytics and monitoring
  async getDatabaseStats() {
    try {
      const [userCount] = await db.select({ count: sql`count(*)` }).from(users);
      const [moodCount] = await db.select({ count: sql`count(*)` }).from(moodEntries);
      const [musicCount] = await db.select({ count: sql`count(*)` }).from(musicAnalysis);
      return {
        users: userCount.count,
        moodEntries: moodCount.count,
        musicAnalysis: musicCount.count,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      console.error("Error fetching database stats:", error);
      return null;
    }
  }
  // Cleanup operations
  async cleanupOldData(daysToKeep = 365) {
    const cutoffDate = /* @__PURE__ */ new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    try {
      const recCutoff = /* @__PURE__ */ new Date();
      recCutoff.setDate(recCutoff.getDate() - 90);
      await db.delete(recommendations).where(gte(recommendations.createdAt, recCutoff));
      console.log("Database cleanup completed");
    } catch (error) {
      console.error("Error during database cleanup:", error);
    }
  }
};
var repository = new DatabaseRepository();

// server/storage.ts
var storage = repository;

// server/services/spotify.ts
import fetch from "node-fetch";
var SpotifyService = class {
  clientId;
  clientSecret;
  accessToken = null;
  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID || "";
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET || "";
    if (!this.clientId || !this.clientSecret) {
      console.warn("Missing Spotify credentials in environment variables.");
    }
  }
  // Method to get Spotify authorization URL
  getAuthUrl(redirectUri) {
    const scopes = [
      "user-read-private",
      "user-read-email",
      "playlist-read-private",
      "playlist-read-collaborative",
      "user-library-read",
      "user-top-read"
    ].join(" ");
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      scope: scopes,
      redirect_uri: redirectUri,
      state: "moodscale-auth"
    });
    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }
  // Method to exchange authorization code for access token
  async exchangeCodeForToken(code, redirectUri) {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64")
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri
      }).toString()
    });
    if (!response.ok) {
      const errorData = await response.text();
      console.error("Spotify Token Exchange Error:", errorData);
      throw new Error("Failed to exchange code for token");
    }
    return await response.json();
  }
  // Method to get user profile
  async getUserProfile(accessToken) {
    const response = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    if (!response.ok) {
      throw new Error("Failed to fetch user profile");
    }
    return await response.json();
  }
  // Method to fetch and cache Spotify access token (for app-only requests)
  async getAccessToken() {
    if (this.accessToken) return this.accessToken;
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64")
      },
      body: "grant_type=client_credentials"
    });
    if (!response.ok) {
      const errorData = await response.text();
      console.error("Spotify Auth Error:", errorData);
      throw new Error("Failed to fetch Spotify access token");
    }
    const data = await response.json();
    this.accessToken = data.access_token;
    return this.accessToken;
  }
  // Method to search for tracks based on a mood or query
  async searchTracks(query, limit = 10) {
    const token = await this.getAccessToken();
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    if (!response.ok) {
      throw new Error("Failed to search tracks on Spotify");
    }
    const data = await response.json();
    return data.tracks.items;
  }
  // Method to search tracks with user token for personalized results
  async searchTracksWithUserToken(query, userToken, limit = 10) {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      }
    );
    if (!response.ok) {
      return this.searchTracks(query, limit);
    }
    const data = await response.json();
    return data.tracks.items;
  }
  // Method to get audio features of a track (mood profiling)
  async getAudioFeatures(trackId) {
    const token = await this.getAccessToken();
    const response = await fetch(
      `https://api.spotify.com/v1/audio-features/${trackId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    if (!response.ok) {
      console.warn(`Failed to fetch audio features for track ${trackId}`);
      return null;
    }
    return await response.json();
  }
  // Method to get recommendations based on seed tracks and target features
  async getRecommendations(seedTracks, targetEnergy, targetValence, limit = 10) {
    const token = await this.getAccessToken();
    const params = new URLSearchParams({
      limit: limit.toString(),
      target_energy: targetEnergy.toString(),
      target_valence: targetValence.toString()
    });
    const seeds = seedTracks.slice(0, 5);
    if (seeds.length > 0) {
      params.append("seed_tracks", seeds.join(","));
    } else {
      params.append("seed_genres", "pop,rock,indie");
    }
    const response = await fetch(
      `https://api.spotify.com/v1/recommendations?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    if (!response.ok) {
      console.warn("Failed to get recommendations, falling back to search");
      const moodQuery = targetValence > 0.6 ? "happy upbeat" : targetEnergy > 0.7 ? "energetic" : "chill relaxing";
      return this.searchTracks(moodQuery, limit);
    }
    const data = await response.json();
    return data.tracks || [];
  }
  // Method to get user's playlists
  async getUserPlaylists(accessToken) {
    const response = await fetch("https://api.spotify.com/v1/me/playlists?limit=20", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    if (!response.ok) {
      throw new Error("Failed to fetch user playlists");
    }
    const data = await response.json();
    return data.items || [];
  }
  // Method to refresh access token
  async refreshAccessToken(refreshToken) {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64")
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken
      }).toString()
    });
    if (!response.ok) {
      throw new Error("Failed to refresh access token");
    }
    return await response.json();
  }
};
var spotifyService = new SpotifyService();

// server/services/openai.ts
import OpenAI from "openai";
var openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || ""
});
async function analyzeMoodFromMusic(trackFeatures, trackName, artistName) {
  try {
    const prompt = `
Analyze the mood and emotional characteristics of this music track based on its audio features:

Track: "${trackName}" by ${artistName}
Audio Features:
- Energy: ${trackFeatures.energy}
- Valence (positivity): ${trackFeatures.valence}
- Danceability: ${trackFeatures.danceability}
- Acousticness: ${trackFeatures.acousticness}
- Tempo: ${trackFeatures.tempo}
- Speechiness: ${trackFeatures.speechiness}
- Instrumentalness: ${trackFeatures.instrumentalness}
- Liveness: ${trackFeatures.liveness}

Please provide a mood analysis in JSON format with:
- predictedMood: primary mood (happy, sad, energetic, calm, peaceful, angry, etc.)
- confidence: confidence score (0-1)
- emotions: array of 2-3 specific emotions this track evokes
- energyLevel: normalized energy level (0-1)
- positivityLevel: normalized positivity level (0-1)
- recommendation: brief recommendation on when to listen to this track
`;
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert music psychologist who analyzes the emotional impact of music. Provide detailed mood analysis based on audio features."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      predictedMood: result.predictedMood || "neutral",
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
      emotions: result.emotions || [],
      energyLevel: Math.max(0, Math.min(1, result.energyLevel || 0.5)),
      positivityLevel: Math.max(0, Math.min(1, result.positivityLevel || 0.5)),
      recommendation: result.recommendation || "Great for general listening"
    };
  } catch (error) {
    console.error("Error analyzing mood from music:", error);
    return {
      predictedMood: "neutral",
      confidence: 0.5,
      emotions: ["neutral"],
      energyLevel: 0.5,
      positivityLevel: 0.5,
      recommendation: "Perfect for any time"
    };
  }
}
async function generatePersonalityProfile(musicData, moodHistory) {
  try {
    const prompt = `
Based on the user's music listening history and mood patterns, generate a personality profile:

Music Listening Patterns:
${musicData.map((track) => `- ${track.trackName} by ${track.artistName} (Energy: ${track.audioFeatures?.energy || "N/A"}, Valence: ${track.audioFeatures?.valence || "N/A"})`).join("\n")}

Recent Mood History:
${moodHistory.map((mood) => `- ${mood.createdAt}: Mood score ${mood.moodScore}/10, Emotions: ${mood.emotions?.join(", ") || "None"}`).join("\n")}

Please provide a personality analysis in JSON format with:
- musicDNA: 2-3 sentence description of their music personality
- energyLevel: overall energy preference (0-1)
- positivityLevel: overall positivity level (0-1)
- aiSuggestion: personalized suggestion for improving mood through music
- traits: array of 3-5 personality traits based on music taste
`;
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a music psychology expert who creates personality profiles based on music preferences and mood patterns."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      musicDNA: result.musicDNA || "You have an eclectic taste in music that reflects a curious and open-minded personality.",
      energyLevel: Math.max(0, Math.min(1, result.energyLevel || 0.5)),
      positivityLevel: Math.max(0, Math.min(1, result.positivityLevel || 0.5)),
      aiSuggestion: result.aiSuggestion || "Try exploring new genres during different times of day to match your energy levels.",
      traits: result.traits || ["curious", "open-minded", "emotionally aware"]
    };
  } catch (error) {
    console.error("Error generating personality profile:", error);
    return {
      musicDNA: "You have a unique relationship with music that reflects your individual personality.",
      energyLevel: 0.5,
      positivityLevel: 0.5,
      aiSuggestion: "Continue exploring music that resonates with your emotions.",
      traits: ["music-loving", "emotionally aware"]
    };
  }
}
async function generateMusicRecommendation(currentMood, moodScore, userPreferences) {
  try {
    const prompt = `
Generate a music recommendation explanation for a user with:
- Current mood: ${currentMood}
- Mood score: ${moodScore}/10
- Music preferences: ${JSON.stringify(userPreferences)}

Please provide a recommendation analysis in JSON format with:
- reason: why this type of music would be good for their current state
- matchScore: how well this matches their mood (0-1)
- mood: the target mood this music should help achieve
- explanation: detailed explanation of the recommendation
`;
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a music therapist who provides personalized music recommendations based on current mood and preferences."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      reason: result.reason || "This music matches your current emotional state",
      matchScore: Math.max(0, Math.min(1, result.matchScore || 0.8)),
      mood: result.mood || currentMood,
      explanation: result.explanation || "This recommendation is tailored to your current mood and preferences"
    };
  } catch (error) {
    console.error("Error generating music recommendation:", error);
    return {
      reason: "Perfect for your current mood",
      matchScore: 0.8,
      mood: currentMood,
      explanation: "This music should complement your current emotional state"
    };
  }
}

// server/routes.ts
async function registerRoutes(app2) {
  app2.get("/api/mood-entries/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const limit = parseInt(req.query.limit) || 50;
      const entries = await storage.getMoodEntries(userId, limit);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch mood entries" });
    }
  });
  app2.post("/api/mood-entries", async (req, res) => {
    try {
      const validated = insertMoodEntrySchema.parse(req.body);
      const entry = await storage.createMoodEntry(validated);
      res.json(entry);
    } catch (error) {
      res.status(400).json({ error: "Invalid mood entry data" });
    }
  });
  app2.get("/api/mood-trends/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const days = parseInt(req.query.days) || 7;
      const trends = await storage.getMoodTrends(userId, days);
      res.json(trends);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch mood trends" });
    }
  });
  app2.get("/api/user-stats/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const recentEntries = await storage.getMoodEntries(userId, 10);
      const weekTrends = await storage.getMoodTrends(userId, 7);
      const musicAnalysis2 = await storage.getMusicAnalysis(userId, 100);
      const currentMood = recentEntries[0]?.emotions?.[0] || "neutral";
      const averageMood = weekTrends.length > 0 ? weekTrends.reduce((sum, entry) => sum + entry.moodScore, 0) / weekTrends.length : 0;
      const streak = calculateStreak(recentEntries);
      const moodScore = averageMood;
      res.json({
        currentMood,
        streak: `${streak} days`,
        songsAnalyzed: musicAnalysis2.length,
        moodScore: moodScore.toFixed(1),
        averageMood: averageMood.toFixed(1),
        bestDay: getBestDay(weekTrends),
        improvement: calculateImprovement(weekTrends)
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user stats" });
    }
  });
  app2.get("/api/music/search", async (req, res) => {
    try {
      const query = req.query.q;
      const userId = req.query.userId;
      const limit = parseInt(req.query.limit) || 20;
      if (!query) {
        return res.status(400).json({ error: "Query parameter is required" });
      }
      let tracks;
      if (userId) {
        const user = await storage.getUser(parseInt(userId));
        if (user?.spotifyAccessToken) {
          tracks = await spotifyService.searchTracksWithUserToken(query, user.spotifyAccessToken, limit);
        } else {
          tracks = await spotifyService.searchTracks(query, limit);
        }
      } else {
        tracks = await spotifyService.searchTracks(query, limit);
      }
      res.json(tracks);
    } catch (error) {
      res.status(500).json({ error: "Failed to search tracks" });
    }
  });
  app2.post("/api/music/analyze", async (req, res) => {
    try {
      const { trackId, userId } = req.body;
      if (!trackId || !userId) {
        return res.status(400).json({ error: "Track ID and user ID are required" });
      }
      const [tracks, audioFeatures] = await Promise.all([
        spotifyService.searchTracks(`track:${trackId}`, 1),
        spotifyService.getAudioFeatures(trackId)
      ]);
      if (!tracks.length || !audioFeatures) {
        return res.status(404).json({ error: "Track not found or audio features unavailable" });
      }
      const track = tracks[0];
      const moodAnalysis = await analyzeMoodFromMusic(
        audioFeatures,
        track.name,
        track.artists[0].name
      );
      const analysis = await storage.createMusicAnalysis({
        userId,
        spotifyTrackId: trackId,
        trackName: track.name,
        artistName: track.artists[0].name,
        albumImage: track.album.images[0]?.url,
        audioFeatures,
        predictedMood: moodAnalysis.predictedMood,
        moodConfidence: moodAnalysis.confidence
      });
      res.json({ analysis, moodAnalysis });
    } catch (error) {
      res.status(500).json({ error: "Failed to analyze track" });
    }
  });
  app2.get("/api/recommendations/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const mood = req.query.mood;
      const limit = parseInt(req.query.limit) || 10;
      const recentEntries = await storage.getMoodEntries(userId, 5);
      const currentMood = mood || recentEntries[0]?.emotions?.[0] || "happy";
      const moodScore = recentEntries[0]?.moodScore || 7;
      const musicHistory = await storage.getMusicAnalysis(userId, 20);
      let targetEnergy = 0.5;
      let targetValence = 0.5;
      switch (currentMood.toLowerCase()) {
        case "happy":
          targetEnergy = 0.7;
          targetValence = 0.8;
          break;
        case "sad":
          targetEnergy = 0.3;
          targetValence = 0.2;
          break;
        case "energetic":
          targetEnergy = 0.9;
          targetValence = 0.7;
          break;
        case "calm":
        case "peaceful":
          targetEnergy = 0.3;
          targetValence = 0.6;
          break;
      }
      const seedTracks = musicHistory.slice(0, 3).map((analysis) => analysis.spotifyTrackId);
      const tracks = await spotifyService.getRecommendations(
        seedTracks,
        targetEnergy,
        targetValence,
        limit
      );
      const recommendations2 = await Promise.all(
        tracks.map(async (track) => {
          const recommendation = await generateMusicRecommendation(
            currentMood,
            moodScore,
            { recentTracks: musicHistory.slice(0, 5) }
          );
          const storedRec = await storage.createRecommendation({
            userId,
            moodEntryId: recentEntries[0]?.id,
            spotifyTrackId: track.id,
            trackName: track.name,
            artistName: track.artists[0].name,
            albumImage: track.album.images[0]?.url,
            reason: recommendation.reason,
            matchScore: recommendation.matchScore
          });
          return {
            ...storedRec,
            track,
            recommendation
          };
        })
      );
      res.json(recommendations2);
    } catch (error) {
      res.status(500).json({ error: "Failed to get recommendations" });
    }
  });
  app2.get("/api/personality-insights/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const existingInsight = await storage.getLatestPersonalityInsight(userId);
      const oneWeekAgo = /* @__PURE__ */ new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      if (existingInsight && existingInsight.generatedAt > oneWeekAgo) {
        return res.json(existingInsight);
      }
      const [musicData, moodHistory] = await Promise.all([
        storage.getMusicAnalysis(userId, 50),
        storage.getMoodEntries(userId, 30)
      ]);
      if (musicData.length === 0 || moodHistory.length === 0) {
        return res.json({
          musicDNA: "Start tracking your music and mood to get personalized insights!",
          energyLevel: 0.5,
          positivityLevel: 0.5,
          aiSuggestion: "Log your mood and analyze some songs to get started.",
          traits: []
        });
      }
      const profile = await generatePersonalityProfile(musicData, moodHistory);
      const insight = await storage.createPersonalityInsight({
        userId,
        musicDNA: profile.musicDNA,
        energyLevel: profile.energyLevel,
        positivityLevel: profile.positivityLevel,
        aiSuggestion: profile.aiSuggestion
      });
      res.json({ ...insight, traits: profile.traits });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate personality insights" });
    }
  });
  app2.get("/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      if (!code) {
        return res.redirect(`/?spotify=error&message=no_code`);
      }
      if (state !== "moodscale-auth") {
        return res.redirect(`/?spotify=error&message=invalid_state`);
      }
      const redirectUri = "https://localhost:5000/callback";
      const tokenData = await spotifyService.exchangeCodeForToken(code, redirectUri);
      const userProfile = await spotifyService.getUserProfile(tokenData.access_token);
      const userId = 1;
      await storage.updateUser(userId, {
        spotifyId: userProfile.id,
        spotifyAccessToken: tokenData.access_token,
        spotifyRefreshToken: tokenData.refresh_token
      });
      res.redirect(`/?spotify=connected`);
    } catch (error) {
      console.error("Spotify callback error:", error);
      res.redirect(`/?spotify=error&message=callback_failed`);
    }
  });
  app2.get("/api/spotify/auth-url", (req, res) => {
    try {
      const redirectUri = "https://localhost:5000/callback";
      const authUrl = spotifyService.getAuthUrl(redirectUri);
      res.json({ authUrl });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate auth URL" });
    }
  });
  app2.get("/api/spotify/playlists/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(parseInt(userId));
      if (!user || !user.spotifyAccessToken) {
        return res.status(401).json({ error: "Spotify not connected" });
      }
      const playlists = await spotifyService.getUserPlaylists(user.spotifyAccessToken);
      res.json(playlists);
    } catch (error) {
      res.status(500).json({ error: "Failed to get playlists" });
    }
  });
  app2.get("/api/spotify/status/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(parseInt(userId));
      res.json({
        connected: !!user?.spotifyAccessToken,
        spotifyId: user?.spotifyId
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get Spotify status" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}
function calculateStreak(entries) {
  if (entries.length === 0) return 0;
  let streak = 1;
  const today = /* @__PURE__ */ new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 1; i < entries.length; i++) {
    const entryDate = new Date(entries[i].createdAt);
    entryDate.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor((today.getTime() - entryDate.getTime()) / (1e3 * 60 * 60 * 24));
    if (daysDiff === i) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
function getBestDay(entries) {
  if (entries.length === 0) return "N/A";
  const dayAverages = {};
  entries.forEach((entry) => {
    const day = new Date(entry.createdAt).toLocaleDateString("en-US", { weekday: "short" });
    if (!dayAverages[day]) {
      dayAverages[day] = { total: 0, count: 0 };
    }
    dayAverages[day].total += entry.moodScore;
    dayAverages[day].count++;
  });
  let bestDay = "N/A";
  let bestAverage = 0;
  Object.entries(dayAverages).forEach(([day, data]) => {
    const average = data.total / data.count;
    if (average > bestAverage) {
      bestAverage = average;
      bestDay = day;
    }
  });
  return bestDay;
}
function calculateImprovement(entries) {
  if (entries.length < 2) return "N/A";
  const sortedEntries = entries.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const firstHalf = sortedEntries.slice(0, Math.floor(sortedEntries.length / 2));
  const secondHalf = sortedEntries.slice(Math.floor(sortedEntries.length / 2));
  const firstAverage = firstHalf.reduce((sum, entry) => sum + entry.moodScore, 0) / firstHalf.length;
  const secondAverage = secondHalf.reduce((sum, entry) => sum + entry.moodScore, 0) / secondHalf.length;
  const improvement = (secondAverage - firstAverage) / firstAverage * 100;
  return improvement > 0 ? `+${improvement.toFixed(1)}%` : `${improvement.toFixed(1)}%`;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  base: "/MoodScale",
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/db/migrations.ts
async function runMigrations() {
  try {
    console.log("\u{1F504} Running MySQL database initialization...");
    await initializeDatabase();
    console.log("\u2705 Database initialization completed successfully");
    return { success: true, migrationsRun: 1 };
  } catch (error) {
    console.error("\u274C Database initialization failed:", error);
    return {
      success: false,
      migrationsRun: 0,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
async function createSampleData() {
  try {
    console.log("\u{1F504} Creating sample data...");
    const [existingUser] = await db.execute("SELECT id FROM users WHERE username = ? LIMIT 1", ["demo_user"]);
    if (!existingUser) {
      await db.execute(
        "INSERT INTO users (username, created_at) VALUES (?, NOW())",
        ["demo_user"]
      );
      const [userResult] = await db.execute("SELECT LAST_INSERT_ID() as id");
      const userId = userResult[0].id;
      const sampleMoods = [
        [userId, 8, JSON.stringify(["happy", "energetic"]), "Great day at work!"],
        [userId, 6, JSON.stringify(["calm", "peaceful"]), "Relaxing evening"],
        [userId, 7, JSON.stringify(["happy"]), null]
      ];
      for (const mood of sampleMoods) {
        await db.execute(
          "INSERT INTO mood_entries (user_id, mood_score, emotions, notes, created_at) VALUES (?, ?, ?, ?, NOW())",
          mood
        );
      }
      console.log("\u2705 Sample data created successfully");
    } else {
      console.log("\u2139\uFE0F Sample data already exists");
    }
  } catch (error) {
    console.error("\u274C Failed to create sample data:", error);
  }
}

// server/db/monitoring.ts
var DatabaseMonitor = class {
  metrics = [];
  maxMetricsHistory = 100;
  async collectMetrics() {
    const startTime = Date.now();
    try {
      const health = await checkDatabaseHealth();
      const responseTime = Date.now() - startTime;
      const stats = await repository.getDatabaseStats();
      const metrics = {
        health,
        responseTime,
        activeConnections: 0,
        // Would need pool monitoring for accurate count
        stats,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      this.metrics.push(metrics);
      if (this.metrics.length > this.maxMetricsHistory) {
        this.metrics.shift();
      }
      return metrics;
    } catch (error) {
      console.error("Error collecting database metrics:", error);
      return {
        health: false,
        responseTime: Date.now() - startTime,
        activeConnections: 0,
        stats: null,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
  }
  getMetricsHistory() {
    return [...this.metrics];
  }
  getLatestMetrics() {
    return this.metrics[this.metrics.length - 1] || null;
  }
  async startMonitoring(intervalMs = 6e4) {
    console.log(`Starting database monitoring (interval: ${intervalMs}ms)`);
    await this.collectMetrics();
    setInterval(async () => {
      const metrics = await this.collectMetrics();
      if (!metrics.health) {
        console.error("\u{1F6A8} Database health check failed!", metrics);
      }
      if (metrics.responseTime > 5e3) {
        console.warn("\u26A0\uFE0F Slow database response:", metrics.responseTime + "ms");
      }
    }, intervalMs);
  }
  // Performance analysis
  getAverageResponseTime(lastN = 10) {
    const recent = this.metrics.slice(-lastN);
    if (recent.length === 0) return 0;
    const total = recent.reduce((sum, metric) => sum + metric.responseTime, 0);
    return total / recent.length;
  }
  getHealthPercentage(lastN = 10) {
    const recent = this.metrics.slice(-lastN);
    if (recent.length === 0) return 0;
    const healthy = recent.filter((metric) => metric.health).length;
    return healthy / recent.length * 100;
  }
};
var dbMonitor = new DatabaseMonitor();

// server/db/backup.ts
import fs2 from "fs";
import path3 from "path";
import { exec } from "child_process";
import { promisify } from "util";
var execAsync = promisify(exec);
var DatabaseBackup = class {
  config;
  constructor(config2 = {}) {
    this.config = {
      enabled: process.env.BACKUP_ENABLED === "true",
      schedule: process.env.BACKUP_SCHEDULE || "0 2 * * *",
      // Daily at 2 AM
      retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || "30"),
      backupPath: process.env.BACKUP_PATH || "./backups",
      compression: process.env.BACKUP_COMPRESSION !== "false",
      ...config2
    };
    if (!fs2.existsSync(this.config.backupPath)) {
      fs2.mkdirSync(this.config.backupPath, { recursive: true });
    }
  }
  async createBackup() {
    if (!this.config.enabled) {
      throw new Error("Backups are disabled");
    }
    const timestamp2 = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    const filename = `moodscale_backup_${timestamp2}.sql`;
    const filepath = path3.join(this.config.backupPath, filename);
    try {
      console.log("Creating MySQL database backup...");
      const host = process.env.DB_HOST || "localhost";
      const port = process.env.DB_PORT || "3306";
      const user = process.env.DB_USER || "root";
      const password = process.env.DB_PASSWORD || "Sandeep@2004";
      const database = process.env.DB_NAME || "MoodScale";
      let command = `mysqldump -h ${host} -P ${port} -u ${user} -p${password} ${database} > "${filepath}"`;
      if (this.config.compression) {
        command = `mysqldump -h ${host} -P ${port} -u ${user} -p${password} ${database} | gzip > "${filepath}.gz"`;
      }
      await execAsync(command);
      console.log(`Backup created: ${filepath}`);
      await this.cleanupOldBackups();
      return filepath;
    } catch (error) {
      console.error("Backup failed:", error);
      throw new Error("Failed to create database backup");
    }
  }
  async restoreBackup(backupPath) {
    if (!fs2.existsSync(backupPath)) {
      throw new Error("Backup file not found");
    }
    try {
      console.log("Restoring MySQL database backup...");
      const host = process.env.DB_HOST || "localhost";
      const port = process.env.DB_PORT || "3306";
      const user = process.env.DB_USER || "root";
      const password = process.env.DB_PASSWORD || "Sandeep@2004";
      const database = process.env.DB_NAME || "MoodScale";
      let command = `mysql -h ${host} -P ${port} -u ${user} -p${password} ${database} < "${backupPath}"`;
      if (backupPath.endsWith(".gz")) {
        command = `gunzip -c "${backupPath}" | mysql -h ${host} -P ${port} -u ${user} -p${password} ${database}`;
      }
      await execAsync(command);
      console.log("Backup restored successfully");
    } catch (error) {
      console.error("Restore failed:", error);
      throw new Error("Failed to restore database backup");
    }
  }
  async listBackups() {
    try {
      const files = fs2.readdirSync(this.config.backupPath);
      return files.filter((file) => file.startsWith("moodscale_backup_")).sort().reverse();
    } catch (error) {
      console.error("Error listing backups:", error);
      return [];
    }
  }
  async cleanupOldBackups() {
    try {
      const backups = await this.listBackups();
      const cutoffDate = /* @__PURE__ */ new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
      for (const backup of backups) {
        const backupPath = path3.join(this.config.backupPath, backup);
        const stats = fs2.statSync(backupPath);
        if (stats.mtime < cutoffDate) {
          fs2.unlinkSync(backupPath);
          console.log(`Deleted old backup: ${backup}`);
        }
      }
    } catch (error) {
      console.error("Error cleaning up old backups:", error);
    }
  }
  startScheduledBackups() {
    if (!this.config.enabled) {
      console.log("Scheduled backups are disabled");
      return;
    }
    console.log(`Scheduled backups enabled: ${this.config.schedule}`);
    const intervalMs = 24 * 60 * 60 * 1e3;
    setInterval(async () => {
      try {
        await this.createBackup();
      } catch (error) {
        console.error("Scheduled backup failed:", error);
      }
    }, intervalMs);
  }
};
var backupManager = new DatabaseBackup();

// server/middleware/database.ts
function databaseHealthCheck() {
  return async (req, res, next) => {
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
      console.error("Database health check failed:", error);
      res.status(503).json({
        error: "Database error",
        message: "Service temporarily unavailable"
      });
    }
  };
}
function rateLimitMiddleware(maxRequests = 100, windowMs = 6e4) {
  return (req, res, next) => {
    const identifier = req.ip || "unknown";
    if (!checkRateLimit(identifier, maxRequests, windowMs)) {
      return res.status(429).json({
        error: "Rate limit exceeded",
        message: "Too many requests, please try again later"
      });
    }
    next();
  };
}
function requestLogger() {
  return (req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      const logData = {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (req.url.startsWith("/api/")) {
        console.log("API Request:", JSON.stringify(logData));
      }
    });
    next();
  };
}
function databaseErrorHandler() {
  return (error, req, res, next) => {
    console.error("Database error:", error);
    if (process.env.NODE_ENV === "production") {
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

// server/index.ts
dotenv.config();
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use(requestLogger());
app.use(databaseHealthCheck());
app.use(rateLimitMiddleware(100, 6e4));
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  try {
    log("\u{1F504} Initializing MySQL database...");
    const migrationResult = await runMigrations();
    if (migrationResult.success) {
      log("\u2705 MySQL database initialized successfully");
      await createSampleData();
    } else {
      log(`\u26A0\uFE0F Database initialization warning: ${migrationResult.error}`);
    }
    if (process.env.NODE_ENV === "production") {
      log("\u{1F50D} Starting database monitoring...");
      await dbMonitor.startMonitoring(6e4);
      if (process.env.BACKUP_ENABLED === "true") {
        log("\u{1F4BE} Starting scheduled backups...");
        backupManager.startScheduledBackups();
      }
    }
    const server = await registerRoutes(app);
    app.use(databaseErrorHandler());
    app.use((err, _req, res, _next) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      throw err;
    });
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
    const port = 5e3;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true
    }, () => {
      log(`\u{1F680} MoodScale server running on port ${port}`);
      log(`\u{1F5C4}\uFE0F Database: MySQL (${process.env.DB_NAME || "MoodScale"})`);
      log(`\u{1F512} Security: Rate limiting, input validation, encryption enabled`);
      log(`\u{1F4BE} Backups: ${process.env.BACKUP_ENABLED === "true" ? "Enabled" : "Disabled"}`);
    });
    process.on("SIGTERM", async () => {
      log("\u{1F6D1} Received SIGTERM, shutting down gracefully...");
      server.close(() => {
        log("\u{1F44B} Server closed");
        process.exit(0);
      });
    });
  } catch (error) {
    console.error("\u274C Failed to start server:", error);
    process.exit(1);
  }
})();
