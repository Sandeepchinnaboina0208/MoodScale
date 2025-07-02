import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Sparkles, Heart, CheckCircle } from "lucide-react";
import { FaSpotify } from "react-icons/fa";
import { useToast } from "@/hooks/use-toast";
import { getSpotifyAuthUrl } from "@/lib/spotify";

export default function SpotifyIntegration() {
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();
  const userId = 1; // Demo user ID

  // Check Spotify connection status
  const { data: spotifyStatus, refetch: refetchStatus } = useQuery<{
    connected: boolean;
    spotifyId?: string;
  }>({
    queryKey: [`/api/spotify/status/${userId}`],
  });

  // Check for OAuth callback success/error in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const spotifyStatus = urlParams.get('spotify');
    
    if (spotifyStatus === 'connected') {
      toast({
        title: "Success!",
        description: "Your Spotify account has been connected successfully.",
      });
      refetchStatus();
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (spotifyStatus === 'error') {
      toast({
        title: "Connection Failed",
        description: "Failed to connect your Spotify account. Please try again.",
        variant: "destructive",
      });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast, refetchStatus]);

  const handleConnectSpotify = async () => {
    setIsConnecting(true);
    try {
      const authUrl = await getSpotifyAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to Spotify. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <section className="mt-12 bg-gradient-to-r from-spotify-green/10 to-dark-card rounded-xl p-8 border border-spotify-green/20">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4 text-text-primary">
          <FaSpotify className="inline mr-3 text-spotify-green" />
          Connect Your Music
        </h2>
        <p className="text-text-secondary text-lg">
          Analyze your Spotify playlists to get personalized mood insights and better recommendations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-spotify-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="text-spotify-green text-2xl w-8 h-8" />
          </div>
          <h3 className="font-semibold mb-2 text-text-primary">
            Playlist Analysis
          </h3>
          <p className="text-sm text-text-secondary">
            Extract mood patterns from your favorite playlists
          </p>
        </div>
        
        <div className="text-center">
          <div className="w-16 h-16 bg-mood-happy/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="text-mood-happy text-2xl w-8 h-8" />
          </div>
          <h3 className="font-semibold mb-2 text-text-primary">
            Smart Recommendations
          </h3>
          <p className="text-sm text-text-secondary">
            Get AI-powered suggestions based on your mood
          </p>
        </div>
        
        <div className="text-center">
          <div className="w-16 h-16 bg-mood-calm/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="text-mood-calm text-2xl w-8 h-8" />
          </div>
          <h3 className="font-semibold mb-2 text-text-primary">
            Mood Tracking
          </h3>
          <p className="text-sm text-text-secondary">
            Track how music influences your emotional state
          </p>
        </div>
      </div>

      <div className="text-center">
        {spotifyStatus && spotifyStatus.connected ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center text-spotify-green text-lg font-medium">
              <CheckCircle className="mr-2" />
              Connected to Spotify
            </div>
            <p className="text-text-secondary">
              Spotify ID: {spotifyStatus.spotifyId}
            </p>
            <p className="text-sm text-text-secondary">
              Your music preferences will now enhance mood recommendations!
            </p>
          </div>
        ) : (
          <Button 
            onClick={handleConnectSpotify}
            disabled={isConnecting}
            className="bg-spotify-green text-white px-8 py-4 text-lg font-medium hover:bg-green-600 transform hover:scale-105 transition-all"
          >
            <FaSpotify className="mr-3" />
            {isConnecting ? "Connecting..." : "Connect Spotify Account"}
          </Button>
        )}
      </div>
    </section>
  );
}
