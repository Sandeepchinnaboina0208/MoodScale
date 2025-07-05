import { mysqlTable, text, int, boolean, timestamp, json, float, varchar } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  spotifyId: varchar("spotify_id", { length: 255 }),
  spotifyAccessToken: text("spotify_access_token"),
  spotifyRefreshToken: text("spotify_refresh_token"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const moodEntries = mysqlTable("mood_entries", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  moodScore: int("mood_score").notNull(), // 1-10 scale
  emotions: json("emotions"), // JSON array of emotion strings
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const musicAnalysis = mysqlTable("music_analysis", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  spotifyTrackId: varchar("spotify_track_id", { length: 255 }).notNull(),
  trackName: varchar("track_name", { length: 500 }).notNull(),
  artistName: varchar("artist_name", { length: 500 }).notNull(),
  albumImage: text("album_image"),
  audioFeatures: json("audio_features"), // Spotify audio features
  predictedMood: varchar("predicted_mood", { length: 100 }),
  moodConfidence: float("mood_confidence"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const recommendations = mysqlTable("recommendations", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  moodEntryId: int("mood_entry_id"),
  spotifyTrackId: varchar("spotify_track_id", { length: 255 }).notNull(),
  trackName: varchar("track_name", { length: 500 }).notNull(),
  artistName: varchar("artist_name", { length: 500 }).notNull(),
  albumImage: text("album_image"),
  reason: text("reason"), // AI-generated reason for recommendation
  matchScore: float("match_score"), // 0-1 confidence score
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const personalityInsights = mysqlTable("personality_insights", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  musicDNA: text("music_dna"),
  energyLevel: float("energy_level"), // 0-1
  positivityLevel: float("positivity_level"), // 0-1
  aiSuggestion: text("ai_suggestion"),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertMoodEntrySchema = createInsertSchema(moodEntries).omit({
  id: true,
  createdAt: true,
}).extend({
  emotions: z.array(z.string()).optional(),
});

export const insertMusicAnalysisSchema = createInsertSchema(musicAnalysis).omit({
  id: true,
  createdAt: true,
});

export const insertRecommendationSchema = createInsertSchema(recommendations).omit({
  id: true,
  createdAt: true,
});

export const insertPersonalityInsightSchema = createInsertSchema(personalityInsights).omit({
  id: true,
  generatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type MoodEntry = typeof moodEntries.$inferSelect;
export type InsertMoodEntry = z.infer<typeof insertMoodEntrySchema>;
export type MusicAnalysis = typeof musicAnalysis.$inferSelect;
export type InsertMusicAnalysis = z.infer<typeof insertMusicAnalysisSchema>;
export type Recommendation = typeof recommendations.$inferSelect;
export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type PersonalityInsight = typeof personalityInsights.$inferSelect;
export type InsertPersonalityInsight = z.infer<typeof insertPersonalityInsightSchema>;