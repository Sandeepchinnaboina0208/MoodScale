# MoodScale API Documentation

## Authentication
All API endpoints require user authentication. Include user ID in request body or URL parameters.

## Rate Limiting
- Mood entries: 10 requests per minute per user
- Music analysis: 20 requests per minute per user
- General API: 100 requests per minute per IP

## Endpoints

### User Management

#### GET /api/user-stats/:userId
Get user statistics and summary data.

**Response:**
```json
{
  "currentMood": "happy",
  "streak": "5 days",
  "songsAnalyzed": 42,
  "moodScore": "7.2",
  "averageMood": "7.2",
  "bestDay": "Friday",
  "improvement": "+15.3%"
}
```

### Mood Tracking

#### GET /api/mood-entries/:userId
Get mood entries for a user.

**Query Parameters:**
- `limit` (optional): Number of entries to return (max 100, default 50)

**Response:**
```json
[
  {
    "id": 1,
    "userId": 1,
    "moodScore": 8,
    "emotions": ["happy", "energetic"],
    "notes": "Great day at work!",
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

#### POST /api/mood-entries
Create a new mood entry.

**Request Body:**
```json
{
  "userId": 1,
  "moodScore": 8,
  "emotions": ["happy", "energetic"],
  "notes": "Feeling great today!"
}
```

#### GET /api/mood-trends/:userId
Get mood trends over time.

**Query Parameters:**
- `days` (optional): Number of days to include (max 365, default 7)

### Music Analysis

#### GET /api/music/search
Search for music tracks.

**Query Parameters:**
- `q`: Search query (required)
- `limit`: Number of results (max 50, default 20)
- `userId`: User ID for personalized results (optional)

**Response:**
```json
[
  {
    "id": "4iV5W9uYEdYUVa79Axb7Rh",
    "name": "Never Gonna Give You Up",
    "artists": [{"name": "Rick Astley"}],
    "album": {
      "name": "Whenever You Need Somebody",
      "images": [{"url": "https://..."}]
    }
  }
]
```

#### POST /api/music/analyze
Analyze a music track's emotional characteristics.

**Request Body:**
```json
{
  "trackId": "4iV5W9uYEdYUVa79Axb7Rh",
  "userId": 1
}
```

**Response:**
```json
{
  "analysis": {
    "id": 1,
    "predictedMood": "energetic",
    "moodConfidence": 0.85,
    "audioFeatures": {...}
  },
  "moodAnalysis": {
    "predictedMood": "energetic",
    "confidence": 0.85,
    "emotions": ["happy", "energetic"],
    "recommendation": "Perfect for workout sessions!"
  }
}
```

### Recommendations

#### GET /api/recommendations/:userId
Get personalized music recommendations.

**Query Parameters:**
- `mood`: Target mood (optional)
- `limit`: Number of recommendations (max 20, default 10)

### Spotify Integration

#### GET /api/spotify/auth-url
Get Spotify authorization URL.

**Response:**
```json
{
  "authUrl": "https://accounts.spotify.com/authorize?..."
}
```

#### GET /api/spotify/status/:userId
Check Spotify connection status.

**Response:**
```json
{
  "connected": true,
  "spotifyId": "user123"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation error",
  "message": "Mood score must be between 1 and 10"
}
```

### 429 Too Many Requests
```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests, please try again later"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Something went wrong"
}
```

### 503 Service Unavailable
```json
{
  "error": "Database unavailable",
  "message": "Service temporarily unavailable"
}
```