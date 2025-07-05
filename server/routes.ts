import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { spotifyService } from "./services/spotify";
import { analyzeMoodFromMusic, generatePersonalityProfile, generateMusicRecommendation } from "./services/openai";
import { insertMoodEntrySchema, insertMusicAnalysisSchema, insertRecommendationSchema, insertPersonalityInsightSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get mood entries for a user
  app.get("/api/mood-entries/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const limit = parseInt(req.query.limit as string) || 50;
      
      const entries = await storage.getMoodEntries(userId, limit);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch mood entries" });
    }
  });

  // Create a new mood entry
  app.post("/api/mood-entries", async (req, res) => {
    try {
      const validated = insertMoodEntrySchema.parse(req.body);
      const entry = await storage.createMoodEntry(validated);
      res.json(entry);
    } catch (error) {
      res.status(400).json({ error: "Invalid mood entry data" });
    }
  });

  // Get mood trends
  app.get("/api/mood-trends/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const days = parseInt(req.query.days as string) || 7;
      
      const trends = await storage.getMoodTrends(userId, days);
      res.json(trends);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch mood trends" });
    }
  });

  // Get user stats
  app.get("/api/user-stats/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      const recentEntries = await storage.getMoodEntries(userId, 10);
      const weekTrends = await storage.getMoodTrends(userId, 7);
      const musicAnalysis = await storage.getMusicAnalysis(userId, 100);
      
      // Calculate stats
      const currentMood = recentEntries[0]?.emotions?.[0] || "neutral";
      const averageMood = weekTrends.length > 0 
        ? weekTrends.reduce((sum, entry) => sum + entry.moodScore, 0) / weekTrends.length
        : 0;
      
      const streak = calculateStreak(recentEntries);
      const moodScore = averageMood;
      
      res.json({
        currentMood,
        streak: `${streak} days`,
        songsAnalyzed: musicAnalysis.length,
        moodScore: moodScore.toFixed(1),
        averageMood: averageMood.toFixed(1),
        bestDay: getBestDay(weekTrends),
        improvement: calculateImprovement(weekTrends)
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user stats" });
    }
  });

  // Search music tracks
  app.get("/api/music/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      const userId = req.query.userId as string;
      const limit = parseInt(req.query.limit as string) || 20;
      
      if (!query) {
        return res.status(400).json({ error: "Query parameter is required" });
      }
      
      // Use user's Spotify token if available for personalized results
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

  // Analyze a track
  app.post("/api/music/analyze", async (req, res) => {
    try {
      const { trackId, userId } = req.body;
      
      if (!trackId || !userId) {
        return res.status(400).json({ error: "Track ID and user ID are required" });
      }

      // Get track details and audio features
      const [tracks, audioFeatures] = await Promise.all([
        spotifyService.searchTracks(`track:${trackId}`, 1),
        spotifyService.getAudioFeatures(trackId)
      ]);

      if (!tracks.length || !audioFeatures) {
        return res.status(404).json({ error: "Track not found or audio features unavailable" });
      }

      const track = tracks[0];
      
      // Analyze mood using AI
      const moodAnalysis = await analyzeMoodFromMusic(
        audioFeatures,
        track.name,
        track.artists[0].name
      );

      // Store analysis
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

  // Get music recommendations
  app.get("/api/recommendations/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const mood = req.query.mood as string;
      const limit = parseInt(req.query.limit as string) || 10;
      
      // Get user's recent mood entries to understand preferences
      const recentEntries = await storage.getMoodEntries(userId, 5);
      const currentMood = mood || recentEntries[0]?.emotions?.[0] || "happy";
      const moodScore = recentEntries[0]?.moodScore || 7;
      
      // Get user's music analysis to understand preferences
      const musicHistory = await storage.getMusicAnalysis(userId, 20);
      
      // Calculate target audio features based on mood
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

      // Get seed tracks from user's history
      const seedTracks = musicHistory.slice(0, 3).map(analysis => analysis.spotifyTrackId);
      
      // Get recommendations from Spotify
      const tracks = await spotifyService.getRecommendations(
        seedTracks,
        targetEnergy,
        targetValence,
        limit
      );

      // Generate AI explanations for recommendations
      const recommendations = await Promise.all(
        tracks.map(async (track) => {
          const recommendation = await generateMusicRecommendation(
            currentMood,
            moodScore,
            { recentTracks: musicHistory.slice(0, 5) }
          );

          // Store recommendation
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

      res.json(recommendations);
    } catch (error) {
      res.status(500).json({ error: "Failed to get recommendations" });
    }
  });

  // Get personality insights
  app.get("/api/personality-insights/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Check for existing recent insights
      const existingInsight = await storage.getLatestPersonalityInsight(userId);
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      if (existingInsight && existingInsight.generatedAt > oneWeekAgo) {
        return res.json(existingInsight);
      }

      // Generate new insights
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
      
      // Store insights
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

  // Spotify OAuth callback - Updated to match your redirect URI
  app.get("/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      
      if (!code) {
        return res.redirect(`/?spotify=error&message=no_code`);
      }

      if (state !== 'moodscale-auth') {
        return res.redirect(`/?spotify=error&message=invalid_state`);
      }

      // Use the exact redirect URI you set in Spotify
      const redirectUri = "https://localhost:5000/callback";
      
      const tokenData = await spotifyService.exchangeCodeForToken(code as string, redirectUri);
      
      // Get user profile from Spotify
      const userProfile = await spotifyService.getUserProfile(tokenData.access_token);
      
      // Update user with Spotify credentials (using userId 1 for demo)
      const userId = 1;
      await storage.updateUser(userId, {
        spotifyId: userProfile.id,
        spotifyAccessToken: tokenData.access_token,
        spotifyRefreshToken: tokenData.refresh_token,
      });

      // Redirect to dashboard with success message
      res.redirect(`/?spotify=connected`);
    } catch (error) {
      console.error("Spotify callback error:", error);
      res.redirect(`/?spotify=error&message=callback_failed`);
    }
  });

  // Get Spotify auth URL
  app.get("/api/spotify/auth-url", (req, res) => {
    try {
      // Use the exact redirect URI you set in Spotify
      const redirectUri = "https://localhost:5000/callback";
      
      const authUrl = spotifyService.getAuthUrl(redirectUri);
      res.json({ authUrl });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate auth URL" });
    }
  });

  // Get user's Spotify playlists
  app.get("/api/spotify/playlists/:userId", async (req, res) => {
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

  // Get user's Spotify connection status
  app.get("/api/spotify/status/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(parseInt(userId));
      
      res.json({ 
        connected: !!(user?.spotifyAccessToken),
        spotifyId: user?.spotifyId 
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get Spotify status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper functions
function calculateStreak(entries: any[]): number {
  if (entries.length === 0) return 0;
  
  let streak = 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (let i = 1; i < entries.length; i++) {
    const entryDate = new Date(entries[i].createdAt);
    entryDate.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === i) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

function getBestDay(entries: any[]): string {
  if (entries.length === 0) return "N/A";
  
  const dayAverages: { [key: string]: { total: number; count: number } } = {};
  
  entries.forEach(entry => {
    const day = new Date(entry.createdAt).toLocaleDateString('en-US', { weekday: 'short' });
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

function calculateImprovement(entries: any[]): string {
  if (entries.length < 2) return "N/A";
  
  const sortedEntries = entries.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const firstHalf = sortedEntries.slice(0, Math.floor(sortedEntries.length / 2));
  const secondHalf = sortedEntries.slice(Math.floor(sortedEntries.length / 2));
  
  const firstAverage = firstHalf.reduce((sum, entry) => sum + entry.moodScore, 0) / firstHalf.length;
  const secondAverage = secondHalf.reduce((sum, entry) => sum + entry.moodScore, 0) / secondHalf.length;
  
  const improvement = ((secondAverage - firstAverage) / firstAverage) * 100;
  
  return improvement > 0 ? `+${improvement.toFixed(1)}%` : `${improvement.toFixed(1)}%`;
}