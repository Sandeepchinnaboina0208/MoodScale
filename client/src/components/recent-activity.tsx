import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { getMoodColor } from "@/lib/mood-colors";

interface RecentActivityProps {
  userId: number;
}

export default function RecentActivity({ userId }: RecentActivityProps) {
  const { data: moodEntries, isLoading: moodLoading } = useQuery({
    queryKey: [`/api/mood-entries/${userId}`],
    queryFn: async () => {
      const response = await fetch(`/api/mood-entries/${userId}?limit=5`);
      return response.json();
    },
  });

  const { data: musicAnalysis, isLoading: musicLoading } = useQuery({
    queryKey: [`/api/music-analysis/${userId}`],
    queryFn: async () => {
      const response = await fetch(`/api/music-analysis/${userId}?limit=5`);
      return response.json();
    },
  });

  if (moodLoading || musicLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3">
            <Skeleton className="w-2 h-2 rounded-full bg-gray-600" />
            <Skeleton className="h-4 w-20 bg-gray-600" />
            <Skeleton className="h-4 w-40 bg-gray-600" />
          </div>
        ))}
      </div>
    );
  }

  // Combine and sort activities
  const activities = [
    ...(moodEntries || []).map((entry: any) => ({
      type: 'mood',
      timestamp: new Date(entry.createdAt),
      description: `Logged mood: ${entry.emotions?.[0] || 'Unknown'} (${entry.moodScore}/10)`,
      color: getMoodColor(entry.emotions?.[0] || 'neutral'),
    })),
    ...(musicAnalysis || []).map((analysis: any) => ({
      type: 'music',
      timestamp: new Date(analysis.createdAt),
      description: `Analyzed "${analysis.trackName}" by ${analysis.artistName}`,
      color: { bg: 'bg-spotify-green', text: 'text-spotify-green' },
    })),
  ]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 5);

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-text-secondary">No recent activity</p>
        <p className="text-sm text-text-muted mt-2">Start logging your mood or analyzing music!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity, index) => (
        <div key={index} className="flex items-center space-x-3 text-sm">
          <div className={`w-2 h-2 rounded-full ${activity.color.bg || 'bg-gray-500'}`}></div>
          <span className="text-text-secondary">
            {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
          </span>
          <span className="text-text-primary">{activity.description}</span>
        </div>
      ))}
    </div>
  );
}
