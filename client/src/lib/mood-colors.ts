export const moodColors = {
  happy: {
    bg: "bg-mood-happy/20",
    text: "text-mood-happy",
    border: "border-mood-happy/30",
    hover: "hover:bg-mood-happy/40",
    icon: "😊"
  },
  calm: {
    bg: "bg-mood-calm/20",
    text: "text-mood-calm",
    border: "border-mood-calm/30",
    hover: "hover:bg-mood-calm/40",
    icon: "😌"
  },
  energetic: {
    bg: "bg-mood-energetic/20",
    text: "text-mood-energetic",
    border: "border-mood-energetic/30",
    hover: "hover:bg-mood-energetic/40",
    icon: "⚡"
  },
  peaceful: {
    bg: "bg-mood-peaceful/20",
    text: "text-mood-peaceful",
    border: "border-mood-peaceful/30",
    hover: "hover:bg-mood-peaceful/40",
    icon: "🌸"
  },
  sad: {
    bg: "bg-mood-sad/20",
    text: "text-mood-sad",
    border: "border-mood-sad/30",
    hover: "hover:bg-mood-sad/40",
    icon: "😢"
  },
  neutral: {
    bg: "bg-gray-600/20",
    text: "text-text-secondary",
    border: "border-gray-600/30",
    hover: "hover:bg-gray-600/40",
    icon: "😐"
  }
};

export function getMoodColor(mood: string) {
  const normalizedMood = mood.toLowerCase();
  return moodColors[normalizedMood as keyof typeof moodColors] || moodColors.neutral;
}

export const emotionOptions = [
  { value: "happy", label: "Happy", icon: "😊" },
  { value: "calm", label: "Calm", icon: "😌" },
  { value: "energetic", label: "Energetic", icon: "⚡" },
  { value: "peaceful", label: "Peaceful", icon: "🌸" },
  { value: "sad", label: "Sad", icon: "😢" },
  { value: "anxious", label: "Anxious", icon: "😰" },
  { value: "angry", label: "Angry", icon: "😠" },
  { value: "excited", label: "Excited", icon: "🤩" }
];
