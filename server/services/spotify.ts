// server/services/spotify.ts
import { spotifyService } from "../services/spotify";
import dotenv from "dotenv";
import fetch from "node-fetch"; // required for making HTTP requests in Node.js
dotenv.config();

// Interfaces to define the structure of Spotify data
interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string }[];
  };
  preview_url: string | null;
}

interface SpotifyAudioFeatures {
  energy: number;
  valence: number;
  danceability: number;
  acousticness: number;
  tempo: number;
  speechiness: number;
  instrumentalness: number;
  liveness: number;
}

interface SpotifyPlaylist {
  id: string;
  name: string;
  tracks: {
    items: {
      track: SpotifyTrack;
    }[];
  };
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
      throw new Error("Missing Spotify credentials in environment variables.");
    }
  }

  // Method to fetch and cache Spotify access token
  async getAccessToken(): Promise<string> {
    if (this.accessToken) return this.accessToken;

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64"),
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Spotify Auth Error:", errorData);
      throw new Error("Failed to fetch Spotify access token");
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    return this.accessToken;
  }

  // Method to search for tracks based on a mood or query
  async searchTracks(query: string): Promise<SpotifyTrack[]> {
    const token = await this.getAccessToken();

    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to search tracks on Spotify");
    }

    const data = await response.json();
    return data.tracks.items;
  }

  // Method to get audio features of a track (mood profiling)
  async getAudioFeatures(trackId: string): Promise<SpotifyAudioFeatures> {
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
      throw new Error("Failed to fetch audio features from Spotify");
    }

    return await response.json();
  }
}
// ...existing code...

export const spotifyService = new SpotifyService();