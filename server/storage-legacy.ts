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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private moodEntries: Map<number, MoodEntry>;
  private musicAnalysis: Map<number, MusicAnalysis>;
  private recommendations: Map<number, Recommendation>;
  private personalityInsights: Map<number, PersonalityInsight>;
  private currentUserId: number;
  private currentMoodEntryId: number;
  private currentMusicAnalysisId: number;
  private currentRecommendationId: number;
  private currentPersonalityInsightId: number;

  constructor() {
    this.users = new Map();
    this.moodEntries = new Map();
    this.musicAnalysis = new Map();
    this.recommendations = new Map();
    this.personalityInsights = new Map();
    this.currentUserId = 1;
    this.currentMoodEntryId = 1;
    this.currentMusicAnalysisId = 1;
    this.currentRecommendationId = 1;
    this.currentPersonalityInsightId = 1;
    
    // Initialize with sample data
    this.initializeSampleData();
  }
  
  private initializeSampleData() {
    // Create sample user
    const sampleUser: User = {
      id: 1,
      username: "demo_user",
      spotifyId: null,
      spotifyAccessToken: null,
      spotifyRefreshToken: null,
      createdAt: new Date()
    };
    this.users.set(1, sampleUser);
    this.currentUserId = 2;
    
    // Create sample mood entries
    const now = new Date();
    const sampleMoods: MoodEntry[] = [
      {
        id: 1,
        userId: 1,
        moodScore: 8,
        emotions: ["happy", "energetic"],
        notes: "Great day at work!",
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24) // 1 day ago
      },
      {
        id: 2,
        userId: 1,
        moodScore: 6,
        emotions: ["calm", "peaceful"],
        notes: "Relaxing evening",
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 12) // 12 hours ago
      },
      {
        id: 3,
        userId: 1,
        moodScore: 7,
        emotions: ["happy"],
        notes: null,
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 2) // 2 hours ago
      }
    ];
    
    sampleMoods.forEach(mood => this.moodEntries.set(mood.id, mood));
    this.currentMoodEntryId = 4;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser,
      spotifyId: insertUser.spotifyId || null,
      spotifyAccessToken: insertUser.spotifyAccessToken || null,
      spotifyRefreshToken: insertUser.spotifyRefreshToken || null,
      id, 
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Mood entry methods
  async getMoodEntries(userId: number, limit = 50): Promise<MoodEntry[]> {
    return Array.from(this.moodEntries.values())
      .filter(entry => entry.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async getMoodEntry(id: number): Promise<MoodEntry | undefined> {
    return this.moodEntries.get(id);
  }

  async createMoodEntry(insertEntry: InsertMoodEntry): Promise<MoodEntry> {
    const id = this.currentMoodEntryId++;
    const entry: MoodEntry = {
      ...insertEntry,
      emotions: insertEntry.emotions || null,
      notes: insertEntry.notes || null,
      id,
      createdAt: new Date()
    };
    this.moodEntries.set(id, entry);
    return entry;
  }

  async getMoodTrends(userId: number, days: number): Promise<MoodEntry[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return Array.from(this.moodEntries.values())
      .filter(entry => entry.userId === userId && entry.createdAt >= cutoffDate)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  // Music analysis methods
  async getMusicAnalysis(userId: number, limit = 50): Promise<MusicAnalysis[]> {
    return Array.from(this.musicAnalysis.values())
      .filter(analysis => analysis.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async createMusicAnalysis(insertAnalysis: InsertMusicAnalysis): Promise<MusicAnalysis> {
    const id = this.currentMusicAnalysisId++;
    const analysis: MusicAnalysis = {
      ...insertAnalysis,
      albumImage: insertAnalysis.albumImage || null,
      audioFeatures: insertAnalysis.audioFeatures || null,
      predictedMood: insertAnalysis.predictedMood || null,
      moodConfidence: insertAnalysis.moodConfidence || null,
      id,
      createdAt: new Date()
    };
    this.musicAnalysis.set(id, analysis);
    return analysis;
  }

  // Recommendation methods
  async getRecommendations(userId: number, limit = 20): Promise<Recommendation[]> {
    return Array.from(this.recommendations.values())
      .filter(rec => rec.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async createRecommendation(insertRec: InsertRecommendation): Promise<Recommendation> {
    const id = this.currentRecommendationId++;
    const recommendation: Recommendation = {
      ...insertRec,
      albumImage: insertRec.albumImage || null,
      moodEntryId: insertRec.moodEntryId || null,
      reason: insertRec.reason || null,
      matchScore: insertRec.matchScore || null,
      id,
      createdAt: new Date()
    };
    this.recommendations.set(id, recommendation);
    return recommendation;
  }

  // Personality insight methods
  async getLatestPersonalityInsight(userId: number): Promise<PersonalityInsight | undefined> {
    return Array.from(this.personalityInsights.values())
      .filter(insight => insight.userId === userId)
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())[0];
  }

  async createPersonalityInsight(insertInsight: InsertPersonalityInsight): Promise<PersonalityInsight> {
    const id = this.currentPersonalityInsightId++;
    const insight: PersonalityInsight = {
      ...insertInsight,
      musicDNA: insertInsight.musicDNA || null,
      energyLevel: insertInsight.energyLevel || null,
      positivityLevel: insertInsight.positivityLevel || null,
      aiSuggestion: insertInsight.aiSuggestion || null,
      id,
      generatedAt: new Date()
    };
    this.personalityInsights.set(id, insight);
    return insight;
  }
}