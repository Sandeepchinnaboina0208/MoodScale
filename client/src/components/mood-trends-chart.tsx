import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect, useRef } from "react";
import { format, subDays } from "date-fns";

interface MoodTrendsChartProps {
  userId: number;
}

export default function MoodTrendsChart({ userId }: MoodTrendsChartProps) {
  const [period, setPeriod] = useState("7");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  const { data: trends, isLoading } = useQuery({
    queryKey: [`/api/mood-trends/${userId}`, period],
    queryFn: async () => {
      const response = await fetch(`/api/mood-trends/${userId}?days=${period}`);
      return response.json();
    },
  });

  const { data: stats } = useQuery({
    queryKey: [`/api/user-stats/${userId}`],
    queryFn: async () => {
      const response = await fetch(`/api/user-stats/${userId}`);
      return response.json();
    },
  });

  useEffect(() => {
    if (!trends || !canvasRef.current) return;

    const loadChart = async () => {
      // Dynamically import Chart.js
      const { Chart, registerables } = await import('chart.js');
      Chart.register(...registerables);

      const ctx = canvasRef.current!.getContext('2d')!;

      // Destroy existing chart
      if (chartRef.current) {
        chartRef.current.destroy();
      }

      // Process data for chart
      const days = parseInt(period);
      const labels: string[] = [];
      const data: number[] = [];

      // Create labels for the period
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        labels.push(format(date, days <= 7 ? 'EEE' : 'MM/dd'));
      }

      // Map trend data to chart data
      const trendMap = new Map();
      trends.forEach((trend: any) => {
        const date = new Date(trend.createdAt);
        const key = format(date, days <= 7 ? 'EEE' : 'MM/dd');
        if (!trendMap.has(key)) {
          trendMap.set(key, []);
        }
        trendMap.get(key).push(trend.moodScore);
      });

      // Calculate average mood for each day
      labels.forEach((label) => {
        const dayScores = trendMap.get(label) || [];
        const average = dayScores.length > 0 
          ? dayScores.reduce((sum: number, score: number) => sum + score, 0) / dayScores.length
          : 0;
        data.push(average);
      });

      chartRef.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Mood Score',
            data,
            borderColor: 'hsl(141, 73%, 42%)',
            backgroundColor: 'hsla(141, 73%, 42%, 0.1)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: 'hsl(141, 73%, 42%)',
            pointBorderColor: 'hsl(141, 73%, 42%)',
            pointRadius: 4,
            pointHoverRadius: 6,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 10,
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              },
              ticks: {
                color: 'hsl(0, 0%, 70%)'
              }
            },
            x: {
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              },
              ticks: {
                color: 'hsl(0, 0%, 70%)'
              }
            }
          }
        }
      });
    };

    loadChart();

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [trends, period]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-32 bg-gray-700" />
        <Skeleton className="h-64 w-full bg-gray-700" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-16 bg-gray-700" />
          <Skeleton className="h-16 bg-gray-700" />
          <Skeleton className="h-16 bg-gray-700" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40 bg-gray-700 border-gray-600 text-text-primary">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-700 border-gray-600">
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 3 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="h-64 relative">
        <canvas ref={canvasRef} />
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-700">
          <div className="text-center">
            <p className="text-2xl font-bold text-spotify-green">{stats.averageMood}</p>
            <p className="text-sm text-text-secondary">Avg Mood</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-mood-happy">{stats.bestDay}</p>
            <p className="text-sm text-text-secondary">Best Day</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-mood-energetic">{stats.improvement}</p>
            <p className="text-sm text-text-secondary">Improvement</p>
          </div>
        </div>
      )}
    </div>
  );
}
