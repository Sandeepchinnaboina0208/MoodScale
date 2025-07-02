import dotenv from "dotenv";
import fetch from "node-fetch";
dotenv.config();

// Interfaces to define the structure of Spotify data
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

export interface SpotifyAudioFeatures {
  energy: number;
  valence: number;
  danceability: number;
  acousticness: number;
  tempo: number;
  speechiness: number;
  instrumentalness: number;
  liveness: number;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  tracks: {
    items: {
      track: SpotifyTrack;
    }[];
  };
}

export interface SpotifyUserProfile {
  id: string;
  display_name: string;
  email: string;
  images: { url: string }[];
}

export interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token: string;
}

// Main Spotify service class
export class SpotifyService {
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;

  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID || "";
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET || "";

    if (!this.clientId || !this.clientSecret) {
      console.warn("Missing Spotify credentials in environment variables.");
    }
  }

  // Method to get Spotify authorization URL
  getAuthUrl(redirectUri: string): string {
    const scopes = [
      'user-read-private',
      'user-read-email',
      'playlist-read-private',
      'playlist-read-collaborative',
      'user-library-read',
      'user-top-read'
    ].join(' ');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      scope: scopes,
      redirect_uri: redirectUri,
      state: 'moodscale-auth'
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  // Method to exchange authorization code for access token
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<SpotifyTokenResponse> {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64"),
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      }).toString(),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Spotify Token Exchange Error:", errorData);
      throw new Error("Failed to exchange code for token");
    }

    return await response.json() as SpotifyTokenResponse;
  }

  // Method to get user profile
  async getUserProfile(accessToken: string): Promise<SpotifyUserProfile> {
    const response = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch user profile");
    }

    return await response.json() as SpotifyUserProfile;
  }

  // Method to fetch and cache Spotify access token (for app-only requests)
  async getAccessToken(): Promise<string> {
    if (this.accessToken) return this.accessToken;

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64"),
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Spotify Auth Error:", errorData);
      throw new Error("Failed to fetch Spotify access token");
    }

    const data = await response.json() as any;
    this.accessToken = data.access_token;
    return this.accessToken;
  }

  // Method to search for tracks based on a mood or query
  async searchTracks(query: string, limit = 10): Promise<SpotifyTrack[]> {
    const token = await this.getAccessToken();

    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to search tracks on Spotify");
    }

    const data = await response.json() as any;
    return data.tracks.items;
  }

  // Method to search tracks with user token for personalized results
  async searchTracksWithUserToken(query: string, userToken: string, limit = 10): Promise<SpotifyTrack[]> {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      }
    );

    if (!response.ok) {
      // Fallback to app token if user token fails
      return this.searchTracks(query, limit);
    }

    const data = await response.json() as any;
    return data.tracks.items;
  }

  // Method to get audio features of a track (mood profiling)
  async getAudioFeatures(trackId: string): Promise<SpotifyAudioFeatures | null> {
    const token = await this.getAccessToken();

    const response = await fetch(
      `https://api.spotify.com/v1/audio-features/${trackId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      console.warn(`Failed to fetch audio features for track ${trackId}`);
      return null;
    }

    return await response.json() as SpotifyAudioFeatures;
  }

  // Method to get recommendations based on seed tracks and target features
  async getRecommendations(
    seedTracks: string[],
    targetEnergy: number,
    targetValence: number,
    limit = 10
  ): Promise<SpotifyTrack[]> {
    const token = await this.getAccessToken();

    // Build query parameters
    const params = new URLSearchParams({
      limit: limit.toString(),
      target_energy: targetEnergy.toString(),
      target_valence: targetValence.toString(),
    });

    // Add seed tracks (max 5)
    const seeds = seedTracks.slice(0, 5);
    if (seeds.length > 0) {
      params.append('seed_tracks', seeds.join(','));
    } else {
      // If no seed tracks, use popular genres
      params.append('seed_genres', 'pop,rock,indie');
    }

    const response = await fetch(
      `https://api.spotify.com/v1/recommendations?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      console.warn("Failed to get recommendations, falling back to search");
      // Fallback to search if recommendations fail
      const moodQuery = targetValence > 0.6 ? "happy upbeat" : targetEnergy > 0.7 ? "energetic" : "chill relaxing";
      return this.searchTracks(moodQuery, limit);
    }

    const data = await response.json() as any;
    return data.tracks || [];
  }

  // Method to get user's playlists
  async getUserPlaylists(accessToken: string): Promise<SpotifyPlaylist[]> {
    const response = await fetch("https://api.spotify.com/v1/me/playlists?limit=20", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch user playlists");
    }

    const data = await response.json() as any;
    return data.items || [];
  }

  // Method to refresh access token
  async refreshAccessToken(refreshToken: string): Promise<SpotifyTokenResponse> {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64"),
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      }).toString(),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh access token");
    }

    return await response.json() as SpotifyTokenResponse;
  }
}

export const spotifyService = new SpotifyService();