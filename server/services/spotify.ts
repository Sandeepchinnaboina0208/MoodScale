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

export class SpotifyService {
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;

  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID || "";
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET || "";
  }

  async getAccessToken(): Promise<string> {
    if (this.accessToken) return this.accessToken;

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64")}`,
      },
      body: "grant_type=client_credentials",
    });

    const data = await response.json();
    this.accessToken = data.access_token;
    return this.accessToken || "";
  }

  async searchTracks(query: string, limit = 20): Promise<SpotifyTrack[]> {
    const token = await this.getAccessToken();
    
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    return data.tracks?.items || [];
  }

  async searchTracksWithUserToken(query: string, userToken: string, limit = 20): Promise<SpotifyTrack[]> {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      }
    );

    if (!response.ok) {
      // Fall back to app token if user token fails
      return this.searchTracks(query, limit);
    }

    const data = await response.json();
    return data.tracks?.items || [];
  }

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

    if (!response.ok) return null;
    return await response.json();
  }

  async getRecommendations(
    seedTracks: string[] = [],
    targetEnergy?: number,
    targetValence?: number,
    limit = 20
  ): Promise<SpotifyTrack[]> {
    const token = await this.getAccessToken();
    
    let url = `https://api.spotify.com/v1/recommendations?limit=${limit}`;
    
    if (seedTracks.length > 0) {
      url += `&seed_tracks=${seedTracks.slice(0, 5).join(",")}`;
    } else {
      // Use popular seed genres if no tracks provided
      url += "&seed_genres=pop,rock,indie,electronic,hip-hop";
    }

    if (targetEnergy !== undefined) {
      url += `&target_energy=${targetEnergy}`;
    }

    if (targetValence !== undefined) {
      url += `&target_valence=${targetValence}`;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    return data.tracks || [];
  }

  async getUserPlaylists(userToken: string): Promise<SpotifyPlaylist[]> {
    const response = await fetch("https://api.spotify.com/v1/me/playlists", {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    });

    const data = await response.json();
    return data.items || [];
  }

  async getPlaylistTracks(playlistId: string, userToken: string): Promise<SpotifyTrack[]> {
    const response = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      }
    );

    const data = await response.json();
    return data.items?.map((item: any) => item.track) || [];
  }

  async getUserProfile(userToken: string): Promise<{ id: string; display_name: string; email: string }> {
    const response = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  getAuthUrl(redirectUri: string): string {
    const scopes = [
      "user-read-private",
      "user-read-email",
      "playlist-read-private",
      "playlist-read-collaborative",
      "user-read-recently-played",
      "user-read-currently-playing"
    ].join(" ");

    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      scope: scopes,
      redirect_uri: redirectUri,
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string, redirectUri: string): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    return await response.json();
  }
}

export const spotifyService = new SpotifyService();
