import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Smile, Flame, Headphones, TrendingUp } from "lucide-react";

interface QuickStatsProps {
  userId: number;
}

export default function QuickStats({ userId }: QuickStatsProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: [`/api/user-stats/${userId}`],
    queryFn: async () => {
      const response = await fetch(`/api/user-stats/${userId}`);
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <section className="mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-dark-card border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-16 bg-gray-600" />
                    <Skeleton className="h-8 w-20 bg-gray-600" />
                  </div>
                  <Skeleton className="w-12 h-12 rounded-lg bg-gray-600" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  if (!stats) {
    return null;
  }

  const statCards = [
    {
      label: "Current Mood",
      value: stats.currentMood || "Unknown",
      icon: Smile,
      color: "text-mood-happy",
      bgColor: "bg-mood-happy/20",
    },
    {
      label: "Streak",
      value: stats.streak || "0 days",
      icon: Flame,
      color: "text-spotify-green",
      bgColor: "bg-spotify-green/20",
    },
    {
      label: "Songs Analyzed",
      value: stats.songsAnalyzed || "0",
      icon: Headphones,
      color: "text-mood-energetic",
      bgColor: "bg-mood-energetic/20",
    },
    {
      label: "Mood Score",
      value: `${stats.moodScore || "0"}/10`,
      icon: TrendingUp,
      color: "text-mood-calm",
      bgColor: "bg-mood-calm/20",
    },
  ];

  return (
    <section className="mb-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="bg-dark-card border-gray-700 hover:bg-dark-hover transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-sm">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
                <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                  <stat.icon className={`${stat.color} text-xl w-6 h-6`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
