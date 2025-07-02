import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { emotionOptions, getMoodColor } from "@/lib/mood-colors";
import { Save } from "lucide-react";

const formSchema = z.object({
  userId: z.number(),
  moodScore: z.number().min(1).max(10),
  emotions: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

interface MoodEntryFormProps {
  userId: number;
  onSuccess?: () => void;
}

export default function MoodEntryForm({ userId, onSuccess }: MoodEntryFormProps) {
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId,
      moodScore: 5,
      emotions: [],
      notes: "",
    },
  });

  const createMoodEntry = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      return apiRequest("POST", "/api/mood-entries", { ...data, emotions: selectedEmotions });
    },
    onSuccess: () => {
      toast({
        title: "Mood logged successfully!",
        description: "Your mood entry has been saved.",
      });
      form.reset();
      setSelectedEmotions([]);
      queryClient.invalidateQueries({ queryKey: ["/api/mood-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mood-trends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-stats"] });
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save mood entry. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleEmotion = (emotion: string) => {
    setSelectedEmotions(prev => 
      prev.includes(emotion) 
        ? prev.filter(e => e !== emotion)
        : [...prev, emotion]
    );
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createMoodEntry.mutate(data);
  };

  const moodScore = form.watch("moodScore");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Mood Scale Slider */}
        <FormField
          control={form.control}
          name="moodScore"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-text-primary">Overall Mood (1-10)</FormLabel>
              <FormControl>
                <div className="px-3">
                  <Slider
                    value={[field.value]}
                    onValueChange={(value) => field.onChange(value[0])}
                    max={10}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-text-secondary mt-2">
                    <span>😢 Very Sad</span>
                    <span className="text-lg font-semibold text-text-primary">{moodScore}</span>
                    <span>😊 Very Happy</span>
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Emotion Categories */}
        <div>
          <FormLabel className="text-text-primary mb-3 block">Select Emotions</FormLabel>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {emotionOptions.map((emotion) => {
              const isSelected = selectedEmotions.includes(emotion.value);
              const colors = getMoodColor(emotion.value);
              
              return (
                <Button
                  key={emotion.value}
                  type="button"
                  variant="outline"
                  onClick={() => toggleEmotion(emotion.value)}
                  className={`
                    px-4 py-2 rounded-lg transition-colors border
                    ${isSelected 
                      ? `${colors.bg} ${colors.text} ${colors.border} ${colors.hover}` 
                      : `bg-gray-600/20 text-text-secondary border-gray-600/30 hover:bg-gray-600/40`
                    }
                  `}
                >
                  <span className="mr-2">{emotion.icon}</span>
                  {emotion.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-text-primary">Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  className="bg-gray-700 border-gray-600 text-text-primary placeholder-text-muted focus:border-spotify-green resize-none"
                  placeholder="What's influencing your mood today?"
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={createMoodEntry.isPending}
          className="w-full bg-spotify-green text-white hover:bg-green-600 transition-colors"
        >
          {createMoodEntry.isPending ? (
            "Saving..."
          ) : (
            <>
              <Save className="mr-2 w-4 h-4" />
              Save Mood Entry
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
