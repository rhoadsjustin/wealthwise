import React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText } from '@/components/AppText';

interface InsightsPromptChipsProps {
  prompts: string[];
  onSelectPrompt: (prompt: string) => void;
}

export function InsightsPromptChips({ prompts, onSelectPrompt }: InsightsPromptChipsProps) {
  if (!prompts.length) return null;

  return (
    <View className="gap-3">
      <AppText variant="section" className="text-app-text-strong">
        Start with
      </AppText>
      <View className="flex-row flex-wrap gap-2">
        {prompts.map((prompt, index) => (
          <Animated.View key={prompt} entering={FadeInDown.delay(index * 35).duration(180)}>
            <Pressable
              accessibilityLabel={prompt}
              onPress={() => onSelectPrompt(prompt)}
              className="rounded-full border border-app-border bg-app-surface-1 px-4 py-3"
              style={({ pressed }) => ({
                transform: [{ scale: pressed ? 0.96 : 1 }],
                opacity: pressed ? 0.92 : 1,
              })}>
              <AppText variant="caption" className="text-app-text-soft">
                {prompt}
              </AppText>
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}
