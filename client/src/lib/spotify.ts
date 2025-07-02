export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string }[];
  };
  preview_url: string | null;
}

export interface MusicRecommendation {
  id: number;
  spotifyTrackId: string;
  trackName: string;
  artistName: string;
  albumImage: string | null;
  reason: string;
  matchScore: number;
  track?: SpotifyTrack;
}

export async function searchSpotifyTracks(query: string, limit = 20, userId?: number): Promise<SpotifyTrack[]> {
  const url = userId 
    ? `/api/music/search?q=${encodeURIComponent(query)}&limit=${limit}&userId=${userId}`
    : `/api/music/search?q=${encodeURIComponent(query)}&limit=${limit}`;
    
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to search tracks');
  }
  return response.json();
}

export async function analyzeTrack(trackId: string, userId: number) {
  const response = await fetch('/api/music/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ trackId, userId }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to analyze track');
  }
  
  return response.json();
}

export async function getSpotifyAuthUrl(): Promise<string> {
  const response = await fetch('/api/spotify/auth-url');
  const data = await response.json();
  return data.authUrl;
}
