import { z } from "zod";

// Input validation schemas
export const userValidation = {
  create: z.object({
    username: z.string()
      .min(3, "Username must be at least 3 characters")
      .max(50, "Username must be less than 50 characters")
      .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
    email: z.string().email("Invalid email format").optional(),
    spotifyId: z.string().optional(),
  }),
  
  update: z.object({
    username: z.string().min(3).max(50).optional(),
    email: z.string().email().optional(),
    spotifyId: z.string().optional(),
    spotifyAccessToken: z.string().optional(),
    spotifyRefreshToken: z.string().optional(),
  })
};

export const moodEntryValidation = {
  create: z.object({
    userId: z.number().positive("User ID must be positive"),
    moodScore: z.number()
      .min(1, "Mood score must be between 1 and 10")
      .max(10, "Mood score must be between 1 and 10"),
    emotions: z.array(z.string()).max(10, "Too many emotions selected").optional(),
    notes: z.string().max(1000, "Notes must be less than 1000 characters").optional(),
  })
};

export const musicAnalysisValidation = {
  create: z.object({
    userId: z.number().positive(),
    spotifyTrackId: z.string().min(1, "Spotify track ID is required"),
    trackName: z.string().min(1, "Track name is required").max(200),
    artistName: z.string().min(1, "Artist name is required").max(200),
    albumImage: z.string().url().optional(),
    audioFeatures: z.object({
      energy: z.number().min(0).max(1),
      valence: z.number().min(0).max(1),
      danceability: z.number().min(0).max(1),
      acousticness: z.number().min(0).max(1),
      tempo: z.number().positive(),
      speechiness: z.number().min(0).max(1),
      instrumentalness: z.number().min(0).max(1),
      liveness: z.number().min(0).max(1),
    }).optional(),
    predictedMood: z.string().max(50).optional(),
    moodConfidence: z.number().min(0).max(1).optional(),
  })
};

// Sanitization functions
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

export function sanitizeArray(input: string[]): string[] {
  return input.map(item => sanitizeString(item)).filter(item => item.length > 0);
}

// Rate limiting validation
export const rateLimitValidation = {
  moodEntry: z.object({
    userId: z.number(),
    timestamp: z.date(),
  }),
  
  musicAnalysis: z.object({
    userId: z.number(),
    timestamp: z.date(),
  })
};