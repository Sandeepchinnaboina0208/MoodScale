import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || ""
});

export interface MoodAnalysis {
  predictedMood: string;
  confidence: number;
  emotions: string[];
  energyLevel: number;
  positivityLevel: number;
  recommendation: string;
}

export interface PersonalityProfile {
  musicDNA: string;
  energyLevel: number;
  positivityLevel: number;
  aiSuggestion: string;
  traits: string[];
}

export interface MusicRecommendation {
  reason: string;
  matchScore: number;
  mood: string;
  explanation: string;
}

export async function analyzeMoodFromMusic(
  trackFeatures: any,
  trackName: string,
  artistName: string
): Promise<MoodAnalysis> {
  try {
    const prompt = `
Analyze the mood and emotional characteristics of this music track based on its audio features:

Track: "${trackName}" by ${artistName}
Audio Features:
- Energy: ${trackFeatures.energy}
- Valence (positivity): ${trackFeatures.valence}
- Danceability: ${trackFeatures.danceability}
- Acousticness: ${trackFeatures.acousticness}
- Tempo: ${trackFeatures.tempo}
- Speechiness: ${trackFeatures.speechiness}
- Instrumentalness: ${trackFeatures.instrumentalness}
- Liveness: ${trackFeatures.liveness}

Please provide a mood analysis in JSON format with:
- predictedMood: primary mood (happy, sad, energetic, calm, peaceful, angry, etc.)
- confidence: confidence score (0-1)
- emotions: array of 2-3 specific emotions this track evokes
- energyLevel: normalized energy level (0-1)
- positivityLevel: normalized positivity level (0-1)
- recommendation: brief recommendation on when to listen to this track
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert music psychologist who analyzes the emotional impact of music. Provide detailed mood analysis based on audio features."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      predictedMood: result.predictedMood || "neutral",
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
      emotions: result.emotions || [],
      energyLevel: Math.max(0, Math.min(1, result.energyLevel || 0.5)),
      positivityLevel: Math.max(0, Math.min(1, result.positivityLevel || 0.5)),
      recommendation: result.recommendation || "Great for general listening"
    };
  } catch (error) {
    console.error("Error analyzing mood from music:", error);
    return {
      predictedMood: "neutral",
      confidence: 0.5,
      emotions: ["neutral"],
      energyLevel: 0.5,
      positivityLevel: 0.5,
      recommendation: "Perfect for any time"
    };
  }
}

export async function generatePersonalityProfile(
  musicData: any[],
  moodHistory: any[]
): Promise<PersonalityProfile> {
  try {
    const prompt = `
Based on the user's music listening history and mood patterns, generate a personality profile:

Music Listening Patterns:
${musicData.map(track => `- ${track.trackName} by ${track.artistName} (Energy: ${track.audioFeatures?.energy || 'N/A'}, Valence: ${track.audioFeatures?.valence || 'N/A'})`).join('\n')}

Recent Mood History:
${moodHistory.map(mood => `- ${mood.createdAt}: Mood score ${mood.moodScore}/10, Emotions: ${mood.emotions?.join(', ') || 'None'}`).join('\n')}

Please provide a personality analysis in JSON format with:
- musicDNA: 2-3 sentence description of their music personality
- energyLevel: overall energy preference (0-1)
- positivityLevel: overall positivity level (0-1)
- aiSuggestion: personalized suggestion for improving mood through music
- traits: array of 3-5 personality traits based on music taste
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a music psychology expert who creates personality profiles based on music preferences and mood patterns."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      musicDNA: result.musicDNA || "You have an eclectic taste in music that reflects a curious and open-minded personality.",
      energyLevel: Math.max(0, Math.min(1, result.energyLevel || 0.5)),
      positivityLevel: Math.max(0, Math.min(1, result.positivityLevel || 0.5)),
      aiSuggestion: result.aiSuggestion || "Try exploring new genres during different times of day to match your energy levels.",
      traits: result.traits || ["curious", "open-minded", "emotionally aware"]
    };
  } catch (error) {
    console.error("Error generating personality profile:", error);
    return {
      musicDNA: "You have a unique relationship with music that reflects your individual personality.",
      energyLevel: 0.5,
      positivityLevel: 0.5,
      aiSuggestion: "Continue exploring music that resonates with your emotions.",
      traits: ["music-loving", "emotionally aware"]
    };
  }
}

export async function generateMusicRecommendation(
  currentMood: string,
  moodScore: number,
  userPreferences: any
): Promise<MusicRecommendation> {
  try {
    const prompt = `
Generate a music recommendation explanation for a user with:
- Current mood: ${currentMood}
- Mood score: ${moodScore}/10
- Music preferences: ${JSON.stringify(userPreferences)}

Please provide a recommendation analysis in JSON format with:
- reason: why this type of music would be good for their current state
- matchScore: how well this matches their mood (0-1)
- mood: the target mood this music should help achieve
- explanation: detailed explanation of the recommendation
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a music therapist who provides personalized music recommendations based on current mood and preferences."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      reason: result.reason || "This music matches your current emotional state",
      matchScore: Math.max(0, Math.min(1, result.matchScore || 0.8)),
      mood: result.mood || currentMood,
      explanation: result.explanation || "This recommendation is tailored to your current mood and preferences"
    };
  } catch (error) {
    console.error("Error generating music recommendation:", error);
    return {
      reason: "Perfect for your current mood",
      matchScore: 0.8,
      mood: currentMood,
      explanation: "This music should complement your current emotional state"
    };
  }
}
