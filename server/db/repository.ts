import { eq, desc, and, gte, sql } from "drizzle-orm";
import { db } from "./connection";
import { 
  users, 
  moodEntries, 
  musicAnalysis, 
  recommendations, 
  personalityInsights,
  type User,
  type InsertUser,
  type MoodEntry,
  type InsertMoodEntry,
  type MusicAnalysis,
  type InsertMusicAnalysis,
  type Recommendation,
  type InsertRecommendation,
  type PersonalityInsight,
  type InsertPersonalityInsight
} from "@shared/schema";
import { 
  userValidation, 
  moodEntryValidation, 
  musicAnalysisValidation,
  sanitizeString,
  sanitizeArray 
} from "./validators";
import { encrypt, decrypt, checkRateLimit } from "./security";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  
  // Mood entry methods
  getMoodEntries(userId: number, limit?: number): Promise<MoodEntry[]>;
  getMoodEntry(id: number): Promise<MoodEntry | undefined>;
  createMoodEntry(entry: InsertMoodEntry): Promise<MoodEntry>;
  getMoodTrends(userId: number, days: number): Promise<MoodEntry[]>;
  
  // Music analysis methods
  getMusicAnalysis(userId: number, limit?: number): Promise<MusicAnalysis[]>;
  createMusicAnalysis(analysis: InsertMusicAnalysis): Promise<MusicAnalysis>;
  
  // Recommendation methods
  getRecommendations(userId: number, limit?: number): Promise<Recommendation[]>;
  createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation>;
  
  // Personality insight methods
  getLatestPersonalityInsight(userId: number): Promise<PersonalityInsight | undefined>;
  createPersonalityInsight(insight: InsertPersonalityInsight): Promise<PersonalityInsight>;
}

export class DatabaseRepository implements IStorage {
  // User operations
  async createUser(userData: InsertUser): Promise<User> {
    const validated = userValidation.create.parse(userData);
    
    // Sanitize inputs
    const sanitized = {
      ...validated,
      username: sanitizeString(validated.username),
    };
    
    try {
      const [user] = await db.insert(users).values(sanitized).$returningId();
      const createdUser = await this.getUser(user.id);
      if (!createdUser) throw new Error('Failed to retrieve created user');
      return createdUser;
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Username already exists');
      }
      throw new Error('Failed to create user');
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return user;
    } catch (error) {
      console.error('Error fetching user:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const sanitizedUsername = sanitizeString(username);
    
    try {
      const [user] = await db.select()
        .from(users)
        .where(eq(users.username, sanitizedUsername))
        .limit(1);
      return user;
    } catch (error) {
      console.error('Error fetching user by username:', error);
      return undefined;
    }
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const validated = userValidation.update.parse(updates);
    
    // Encrypt sensitive data
    const sanitizedUpdates: any = { ...validated };
    if (validated.spotifyAccessToken) {
      const encrypted = encrypt(validated.spotifyAccessToken);
      sanitizedUpdates.spotifyAccessToken = JSON.stringify(encrypted);
    }
    if (validated.spotifyRefreshToken) {
      const encrypted = encrypt(validated.spotifyRefreshToken);
      sanitizedUpdates.spotifyRefreshToken = JSON.stringify(encrypted);
    }
    
    try {
      await db.update(users)
        .set(sanitizedUpdates)
        .where(eq(users.id, id));
      
      return await this.getUser(id);
    } catch (error) {
      console.error('Error updating user:', error);
      return undefined;
    }
  }

  // Mood entry operations
  async createMoodEntry(entryData: InsertMoodEntry): Promise<MoodEntry> {
    const validated = moodEntryValidation.create.parse(entryData);
    
    // Rate limiting
    if (!checkRateLimit(`mood_entry_${validated.userId}`, 10, 60000)) {
      throw new Error('Rate limit exceeded for mood entries');
    }
    
    // Sanitize inputs
    const sanitized = {
      ...validated,
      emotions: validated.emotions ? sanitizeArray(validated.emotions) : null,
      notes: validated.notes ? sanitizeString(validated.notes) : null,
    };
    
    try {
      const [result] = await db.insert(moodEntries).values(sanitized).$returningId();
      const entry = await this.getMoodEntry(result.id);
      if (!entry) throw new Error('Failed to retrieve created mood entry');
      return entry;
    } catch (error) {
      console.error('Error creating mood entry:', error);
      throw new Error('Failed to create mood entry');
    }
  }

  async getMoodEntry(id: number): Promise<MoodEntry | undefined> {
    try {
      const [entry] = await db.select().from(moodEntries).where(eq(moodEntries.id, id)).limit(1);
      return entry;
    } catch (error) {
      console.error('Error fetching mood entry:', error);
      return undefined;
    }
  }

  async getMoodEntries(userId: number, limit: number = 50): Promise<MoodEntry[]> {
    try {
      return await db.select()
        .from(moodEntries)
        .where(eq(moodEntries.userId, userId))
        .orderBy(desc(moodEntries.createdAt))
        .limit(Math.min(limit, 100)); // Cap at 100 for performance
    } catch (error) {
      console.error('Error fetching mood entries:', error);
      return [];
    }
  }

  async getMoodTrends(userId: number, days: number): Promise<MoodEntry[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - Math.min(days, 365)); // Cap at 1 year
    
    try {
      return await db.select()
        .from(moodEntries)
        .where(
          and(
            eq(moodEntries.userId, userId),
            gte(moodEntries.createdAt, cutoffDate)
          )
        )
        .orderBy(moodEntries.createdAt);
    } catch (error) {
      console.error('Error fetching mood trends:', error);
      return [];
    }
  }

  // Music analysis operations
  async createMusicAnalysis(analysisData: InsertMusicAnalysis): Promise<MusicAnalysis> {
    const validated = musicAnalysisValidation.create.parse(analysisData);
    
    // Rate limiting
    if (!checkRateLimit(`music_analysis_${validated.userId}`, 20, 60000)) {
      throw new Error('Rate limit exceeded for music analysis');
    }
    
    // Sanitize inputs
    const sanitized = {
      ...validated,
      trackName: sanitizeString(validated.trackName),
      artistName: sanitizeString(validated.artistName),
      predictedMood: validated.predictedMood ? sanitizeString(validated.predictedMood) : null,
    };
    
    try {
      const [result] = await db.insert(musicAnalysis).values(sanitized).$returningId();
      const analysis = await this.getMusicAnalysisById(result.id);
      if (!analysis) throw new Error('Failed to retrieve created music analysis');
      return analysis;
    } catch (error) {
      console.error('Error creating music analysis:', error);
      throw new Error('Failed to create music analysis');
    }
  }

  async getMusicAnalysisById(id: number): Promise<MusicAnalysis | undefined> {
    try {
      const [analysis] = await db.select().from(musicAnalysis).where(eq(musicAnalysis.id, id)).limit(1);
      return analysis;
    } catch (error) {
      console.error('Error fetching music analysis:', error);
      return undefined;
    }
  }

  async getMusicAnalysis(userId: number, limit: number = 50): Promise<MusicAnalysis[]> {
    try {
      return await db.select()
        .from(musicAnalysis)
        .where(eq(musicAnalysis.userId, userId))
        .orderBy(desc(musicAnalysis.createdAt))
        .limit(Math.min(limit, 100));
    } catch (error) {
      console.error('Error fetching music analysis:', error);
      return [];
    }
  }

  // Recommendation operations
  async createRecommendation(recData: InsertRecommendation): Promise<Recommendation> {
    try {
      const [result] = await db.insert(recommendations).values(recData).$returningId();
      const recommendation = await this.getRecommendationById(result.id);
      if (!recommendation) throw new Error('Failed to retrieve created recommendation');
      return recommendation;
    } catch (error) {
      console.error('Error creating recommendation:', error);
      throw new Error('Failed to create recommendation');
    }
  }

  async getRecommendationById(id: number): Promise<Recommendation | undefined> {
    try {
      const [recommendation] = await db.select().from(recommendations).where(eq(recommendations.id, id)).limit(1);
      return recommendation;
    } catch (error) {
      console.error('Error fetching recommendation:', error);
      return undefined;
    }
  }

  async getRecommendations(userId: number, limit: number = 20): Promise<Recommendation[]> {
    try {
      return await db.select()
        .from(recommendations)
        .where(eq(recommendations.userId, userId))
        .orderBy(desc(recommendations.createdAt))
        .limit(Math.min(limit, 50));
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      return [];
    }
  }

  // Personality insights operations
  async createPersonalityInsight(insightData: InsertPersonalityInsight): Promise<PersonalityInsight> {
    try {
      const [result] = await db.insert(personalityInsights).values(insightData).$returningId();
      const insight = await this.getPersonalityInsightById(result.id);
      if (!insight) throw new Error('Failed to retrieve created personality insight');
      return insight;
    } catch (error) {
      console.error('Error creating personality insight:', error);
      throw new Error('Failed to create personality insight');
    }
  }

  async getPersonalityInsightById(id: number): Promise<PersonalityInsight | undefined> {
    try {
      const [insight] = await db.select().from(personalityInsights).where(eq(personalityInsights.id, id)).limit(1);
      return insight;
    } catch (error) {
      console.error('Error fetching personality insight:', error);
      return undefined;
    }
  }

  async getLatestPersonalityInsight(userId: number): Promise<PersonalityInsight | undefined> {
    try {
      const [insight] = await db.select()
        .from(personalityInsights)
        .where(eq(personalityInsights.userId, userId))
        .orderBy(desc(personalityInsights.generatedAt))
        .limit(1);
      return insight;
    } catch (error) {
      console.error('Error fetching personality insight:', error);
      return undefined;
    }
  }

  // Analytics and monitoring
  async getDatabaseStats(): Promise<any> {
    try {
      const [userCount] = await db.select({ count: sql`count(*)` }).from(users);
      const [moodCount] = await db.select({ count: sql`count(*)` }).from(moodEntries);
      const [musicCount] = await db.select({ count: sql`count(*)` }).from(musicAnalysis);
      
      return {
        users: userCount.count,
        moodEntries: moodCount.count,
        musicAnalysis: musicCount.count,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching database stats:', error);
      return null;
    }
  }

  // Cleanup operations
  async cleanupOldData(daysToKeep: number = 365): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    try {
      // Clean up old recommendations (keep for 90 days)
      const recCutoff = new Date();
      recCutoff.setDate(recCutoff.getDate() - 90);
      
      await db.delete(recommendations)
        .where(gte(recommendations.createdAt, recCutoff));
      
      console.log('Database cleanup completed');
    } catch (error) {
      console.error('Error during database cleanup:', error);
    }
  }
}

export const repository = new DatabaseRepository();