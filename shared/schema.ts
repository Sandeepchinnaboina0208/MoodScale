import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  spotifyId: text("spotify_id"),
  spotifyAccessToken: text("spotify_access_token"),
  spotifyRefreshToken: text("spotify_refresh_token"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const moodEntries = pgTable("mood_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  moodScore: integer("mood_score").notNull(), // 1-10 scale
  emotions: text("emotions").array(), // array of emotion strings
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const musicAnalysis = pgTable("music_analysis", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  spotifyTrackId: text("spotify_track_id").notNull(),
  trackName: text("track_name").notNull(),
  artistName: text("artist_name").notNull(),
  albumImage: text("album_image"),
  audioFeatures: jsonb("audio_features"), // Spotify audio features
  predictedMood: text("predicted_mood"),
  moodConfidence: real("mood_confidence"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const recommendations = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  moodEntryId: integer("mood_entry_id"),
  spotifyTrackId: text("spotify_track_id").notNull(),
  trackName: text("track_name").notNull(),
  artistName: text("artist_name").notNull(),
  albumImage: text("album_image"),
  reason: text("reason"), // AI-generated reason for recommendation
  matchScore: real("match_score"), // 0-1 confidence score
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const personalityInsights = pgTable("personality_insights", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  musicDNA: text("music_dna"),
  energyLevel: real("energy_level"), // 0-1
  positivityLevel: real("positivity_level"), // 0-1
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
