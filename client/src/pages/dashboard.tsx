import { useState } from "react";
import { Music, Plus, User, Brain, Clock, ChartLine } from "lucide-react";
import { FaSpotify } from "react-icons/fa";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import MoodEntryForm from "@/components/mood-entry-form";
import MoodTrendsChart from "@/components/mood-trends-chart";
import MusicRecommendations from "@/components/music-recommendations";
import PersonalityInsights from "@/components/personality-insights";
import QuickStats from "@/components/quick-stats";
import RecentActivity from "@/components/recent-activity";
import SpotifyIntegration from "@/components/spotify-integration";

export default function Dashboard() {
  const [showMoodModal, setShowMoodModal] = useState(false);
  const userId = 1; // In a real app, this would come from auth

  return (
    <div className="min-h-screen bg-dark-bg text-text-primary">
      {/* Header */}
      <header className="bg-dark-card border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-bold">
                <span className="text-spotify-green">Mood</span>
                <span className="text-text-primary">Scale</span>
              </div>
              <nav className="hidden md:flex space-x-8 ml-8">
                <a href="#dashboard" className="text-text-primary hover:text-spotify-green transition-colors">
                  Dashboard
                </a>
                <a href="#journal" className="text-text-secondary hover:text-spotify-green transition-colors">
                  Journal
                </a>
                <a href="#music" className="text-text-secondary hover:text-spotify-green transition-colors">
                  Music
                </a>
                <a href="#insights" className="text-text-secondary hover:text-spotify-green transition-colors">
                  Insights
                </a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <Button className="bg-spotify-green text-white hover:bg-green-600">
                <FaSpotify className="mr-2" />
                Connect Spotify
              </Button>
              <div className="w-8 h-8 bg-gradient-to-r from-mood-happy to-mood-calm rounded-full flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-dark-card to-dark-hover rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-spotify-green/10 to-mood-calm/10"></div>
            <div className="relative z-10">
              <h1 className="text-4xl font-bold mb-4">How are you feeling today?</h1>
              <p className="text-text-secondary text-lg mb-6">
                Track your mood, discover music that matches your emotions, and gain insights into your emotional patterns.
              </p>
              <div className="flex flex-wrap gap-4">
                <Dialog open={showMoodModal} onOpenChange={setShowMoodModal}>
                  <DialogTrigger asChild>
                    <Button className="bg-spotify-green text-white hover:bg-green-600 transform hover:scale-105 transition-all">
                      <Plus className="mr-2" />
                      Log Mood
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-dark-card border-gray-700">
                    <DialogHeader>
                      <DialogTitle className="text-text-primary">Log Your Mood</DialogTitle>
                    </DialogHeader>
                    <MoodEntryForm 
                      userId={userId} 
                      onSuccess={() => setShowMoodModal(false)} 
                    />
                  </DialogContent>
                </Dialog>
                <Button className="bg-mood-happy text-white hover:bg-red-500 transform hover:scale-105 transition-all">
                  <Music className="mr-2" />
                  Get Recommendations
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Stats */}
        <QuickStats userId={userId} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Mood Tracking */}
          <div className="lg:col-span-2 space-y-8">
            {/* Mood Entry Form */}
            <Card className="bg-dark-card border-gray-700">
              <CardContent className="p-6">
                <h2 className="text-2xl font-semibold mb-6 flex items-center text-text-primary">
                  <div className="w-8 h-8 bg-mood-happy/20 rounded-lg flex items-center justify-center mr-3">
                    <Plus className="w-5 h-5 text-mood-happy" />
                  </div>
                  Log Your Mood
                </h2>
                <MoodEntryForm userId={userId} />
              </CardContent>
            </Card>

            {/* Mood Trends Chart */}
            <Card className="bg-dark-card border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold flex items-center text-text-primary">
                    <div className="w-8 h-8 bg-spotify-green/20 rounded-lg flex items-center justify-center mr-3">
                      <ChartLine className="w-5 h-5 text-spotify-green" />
                    </div>
                    Mood Trends
                  </h2>
                </div>
                <MoodTrendsChart userId={userId} />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Music & Insights */}
          <div className="space-y-8">
            {/* Music Recommendations */}
            <Card className="bg-dark-card border-gray-700">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-6 flex items-center text-text-primary">
                  <div className="w-8 h-8 bg-mood-energetic/20 rounded-lg flex items-center justify-center mr-3">
                    <Music className="w-5 h-5 text-mood-energetic" />
                  </div>
                  Recommended for You
                </h2>
                <MusicRecommendations userId={userId} />
              </CardContent>
            </Card>

            {/* Personality Insights */}
            <Card className="bg-dark-card border-gray-700">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-6 flex items-center text-text-primary">
                  <div className="w-8 h-8 bg-mood-calm/20 rounded-lg flex items-center justify-center mr-3">
                    <Brain className="w-5 h-5 text-mood-calm" />
                  </div>
                  Personality Insights
                </h2>
                <PersonalityInsights userId={userId} />
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-dark-card border-gray-700">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-6 flex items-center text-text-primary">
                  <div className="w-8 h-8 bg-text-secondary/20 rounded-lg flex items-center justify-center mr-3">
                    <Clock className="w-5 h-5 text-text-secondary" />
                  </div>
                  Recent Activity
                </h2>
                <RecentActivity userId={userId} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Spotify Integration Section */}
        <SpotifyIntegration />
      </main>

      {/* Floating Action Button */}
      <Dialog open={showMoodModal} onOpenChange={setShowMoodModal}>
        <DialogTrigger asChild>
          <Button 
            className="fixed bottom-6 right-6 bg-spotify-green text-white w-14 h-14 rounded-full shadow-lg hover:bg-green-600 transform hover:scale-110 transition-all z-40"
            size="icon"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </DialogTrigger>
      </Dialog>
    </div>
  );
}
