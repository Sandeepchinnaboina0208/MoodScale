import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Mock storage for demo
let moodEntries = [
  {
    id: 1,
    userId: 1,
    moodScore: 8,
    emotions: ["happy", "energetic"],
    notes: "Great day at work!",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
  },
  {
    id: 2,
    userId: 1,
    moodScore: 6,
    emotions: ["calm", "peaceful"],
    notes: "Relaxing evening",
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000)
  }
];

let nextId = 3;

// API Routes
app.get('/api/user-stats/1', (req, res) => {
  const avgMood = moodEntries.reduce((sum, entry) => sum + entry.moodScore, 0) / moodEntries.length;
  
  res.json({
    currentMood: moodEntries[0]?.emotions?.[0] || "happy",
    streak: "3 days",
    songsAnalyzed: 15,
    moodScore: avgMood.toFixed(1),
    averageMood: avgMood.toFixed(1),
    bestDay: "Fri",
    improvement: "+12.5%"
  });
});

app.get('/api/mood-entries/1', (req, res) => {
  res.json(moodEntries);
});

app.post('/api/mood-entries', (req, res) => {
  const entry = {
    id: nextId++,
    ...req.body,
    createdAt: new Date()
  };
  moodEntries.unshift(entry);
  res.json(entry);
});

app.get('/api/music/search', (req, res) => {
  const query = req.query.q;
  // Mock Spotify results
  const mockTracks = [
    {
      id: "4iV5W9uYEdYUVa79Axb7Rh",
      name: "Never Gonna Give You Up",
      artists: [{ name: "Rick Astley" }],
      album: {
        name: "Whenever You Need Somebody",
        images: [{ url: "https://i.scdn.co/image/ab67616d0000b2735755e164993798e0c9ef7d7a" }]
      }
    },
    {
      id: "7qiZfU4dY1lWllzX7mPBI3",
      name: "Shape of You",
      artists: [{ name: "Ed Sheeran" }],
      album: {
        name: "÷ (Divide)",
        images: [{ url: "https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96" }]
      }
    }
  ].filter(track => 
    track.name.toLowerCase().includes(query.toLowerCase()) ||
    track.artists[0].name.toLowerCase().includes(query.toLowerCase())
  );
  
  res.json(mockTracks);
});

app.post('/api/music/analyze', (req, res) => {
  const { trackId } = req.body;
  
  // Mock analysis response
  res.json({
    analysis: {
      id: 1,
      userId: 1,
      spotifyTrackId: trackId,
      trackName: "Sample Track",
      artistName: "Sample Artist",
      predictedMood: "energetic",
      moodConfidence: 0.85,
      createdAt: new Date()
    },
    moodAnalysis: {
      predictedMood: "energetic",
      confidence: 0.85,
      emotions: ["happy", "energetic"],
      energyLevel: 0.8,
      positivityLevel: 0.9,
      recommendation: "Perfect for workout sessions!"
    }
  });
});

// Serve demo page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../test.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎵 MoodScale demo server running on port ${PORT}`);
  console.log(`📱 Visit: http://localhost:${PORT}`);
  console.log(`🧪 Features: Mood logging, Music search, AI analysis`);
});