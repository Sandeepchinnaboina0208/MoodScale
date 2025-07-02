import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";

interface PersonalityInsightsProps {
  userId: number;
}

export default function PersonalityInsights({ userId }: PersonalityInsightsProps) {
  const { data: insights, isLoading } = useQuery({
    queryKey: [`/api/personality-insights/${userId}`],
    queryFn: async () => {
      const response = await fetch(`/api/personality-insights/${userId}`);
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 bg-gray-700" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-16 bg-gray-700" />
          <Skeleton className="h-16 bg-gray-700" />
        </div>
        <Skeleton className="h-20 bg-gray-700" />
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="text-center py-8">
        <p className="text-text-secondary">Loading insights...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Music DNA */}
      <Card className="bg-gradient-to-r from-mood-calm/20 to-mood-peaceful/20 border-mood-calm/30">
        <CardContent className="p-4">
          <h3 className="font-medium text-mood-calm mb-2">Your Music DNA</h3>
          <p className="text-sm text-text-secondary">
            {insights.musicDNA || "Analyze more music to discover your unique musical personality."}
          </p>
        </CardContent>
      </Card>

      {/* Personality Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gray-700/50">
          <CardContent className="p-3 text-center">
            <div className="mb-2">
              <Progress 
                value={(insights.energyLevel || 0.5) * 100} 
                className="h-2"
              />
            </div>
            <p className="text-lg font-bold text-mood-energetic">
              {Math.round((insights.energyLevel || 0.5) * 100)}%
            </p>
            <p className="text-xs text-text-secondary">Energy</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-700/50">
          <CardContent className="p-3 text-center">
            <div className="mb-2">
              <Progress 
                value={(insights.positivityLevel || 0.5) * 100} 
                className="h-2"
              />
            </div>
            <p className="text-lg font-bold text-mood-calm">
              {Math.round((insights.positivityLevel || 0.5) * 100)}%
            </p>
            <p className="text-xs text-text-secondary">Positivity</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Suggestion */}
      <Card className="bg-spotify-green/10 border-spotify-green/30">
        <CardContent className="p-4">
          <h3 className="font-medium text-spotify-green mb-2">AI Suggestion</h3>
          <p className="text-sm text-text-secondary">
            {insights.aiSuggestion || "Keep tracking your mood and music to get personalized suggestions."}
          </p>
        </CardContent>
      </Card>

      {/* Personality Traits */}
      {insights.traits && insights.traits.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium text-text-primary">Your Traits</h3>
          <div className="flex flex-wrap gap-2">
            {insights.traits.map((trait: string, index: number) => (
              <span 
                key={index}
                className="px-3 py-1 bg-mood-happy/20 text-mood-happy rounded-full text-xs"
              >
                {trait}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
