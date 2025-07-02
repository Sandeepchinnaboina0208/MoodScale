import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, RefreshCw, Search } from "lucide-react";
import { getMoodColor } from "@/lib/mood-colors";
import { searchSpotifyTracks, analyzeTrack, type SpotifyTrack } from "@/lib/spotify";
import { useToast } from "@/hooks/use-toast";

interface MusicRecommendationsProps {
  userId: number;
}

export default function MusicRecommendations({ userId }: MusicRecommendationsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMood, setSelectedMood] = useState("");
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: recommendations, isLoading } = useQuery({
    queryKey: [`/api/recommendations/${userId}`, selectedMood],
    queryFn: async () => {
      const url = selectedMood && selectedMood !== "all"
        ? `/api/recommendations/${userId}?mood=${selectedMood}&limit=10`
        : `/api/recommendations/${userId}?limit=10`;
      const response = await fetch(url);
      return response.json();
    },
  });

  const analyzeTrackMutation = useMutation({
    mutationFn: async (trackId: string) => {
      return analyzeTrack(trackId, userId);
    },
    onSuccess: () => {
      toast({
        title: "Track analyzed!",
        description: "The track has been analyzed and added to your music data.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/recommendations/${userId}`] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to analyze track. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const tracks = await searchSpotifyTracks(searchQuery, 5);
      setSearchResults(tracks);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to search tracks. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAnalyzeTrack = (trackId: string) => {
    analyzeTrackMutation.mutate(trackId);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-3 bg-gray-700/50 rounded-lg">
            <Skeleton className="w-12 h-12 rounded-lg bg-gray-600" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32 bg-gray-600" />
              <Skeleton className="h-3 w-24 bg-gray-600" />
              <Skeleton className="h-6 w-20 bg-gray-600" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Search for music..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-gray-700 border-gray-600 text-text-primary placeholder-text-muted"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button
            onClick={handleSearch}
            disabled={isSearching}
            className="bg-spotify-green hover:bg-green-600"
          >
            <Search className="w-4 h-4" />
          </Button>
        </div>
        
        <Select value={selectedMood} onValueChange={setSelectedMood}>
          <SelectTrigger className="bg-gray-700 border-gray-600 text-text-primary">
            <SelectValue placeholder="Filter by mood" />
          </SelectTrigger>
          <SelectContent className="bg-gray-700 border-gray-600">
            <SelectItem value="all">All moods</SelectItem>
            <SelectItem value="happy">Happy</SelectItem>
            <SelectItem value="sad">Sad</SelectItem>
            <SelectItem value="energetic">Energetic</SelectItem>
            <SelectItem value="calm">Calm</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-text-primary">Search Results</h3>
          {searchResults.map((track) => (
            <div key={track.id} className="flex items-center space-x-4 p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors group">
              <img 
                src={track.album.images[0]?.url || '/api/placeholder/48/48'} 
                alt="Album cover" 
                className="w-12 h-12 rounded-lg object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{track.name}</p>
                <p className="text-xs text-text-secondary truncate">{track.artists[0].name}</p>
              </div>
              <Button
                size="sm"
                onClick={() => handleAnalyzeTrack(track.id)}
                disabled={analyzeTrackMutation.isPending}
                className="bg-mood-energetic/20 text-mood-energetic hover:bg-mood-energetic/40"
              >
                Analyze
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      <div className="space-y-4">
        {recommendations && recommendations.length > 0 ? (
          <>
            {recommendations.map((rec: any) => {
              const moodColor = getMoodColor(rec.reason?.includes('energetic') ? 'energetic' : 
                                             rec.reason?.includes('calm') ? 'calm' : 
                                             rec.reason?.includes('happy') ? 'happy' : 'neutral');
              
              return (
                <div key={rec.id} className="flex items-center space-x-4 p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors group">
                  <img 
                    src={rec.albumImage || '/api/placeholder/48/48'} 
                    alt="Album cover" 
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{rec.trackName}</p>
                    <p className="text-xs text-text-secondary truncate">{rec.artistName}</p>
                    <div className="flex items-center mt-1">
                      <span className={`text-xs px-2 py-1 rounded ${moodColor.bg} ${moodColor.text}`}>
                        {rec.reason?.split(' ')[0] || 'Perfect'}
                      </span>
                      <span className="text-xs text-text-muted ml-2">
                        {Math.round(rec.matchScore * 100)}% match
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-text-secondary hover:text-spotify-green transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
            
            <Button 
              onClick={() => queryClient.invalidateQueries({ queryKey: [`/api/recommendations/${userId}`] })}
              className="w-full bg-mood-energetic/20 text-mood-energetic hover:bg-mood-energetic/30 transition-colors"
            >
              <RefreshCw className="mr-2 w-4 h-4" />
              Get More Recommendations
            </Button>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-text-secondary mb-4">No recommendations yet!</p>
            <p className="text-sm text-text-muted">Log some moods or search for music to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
