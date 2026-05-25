import React from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { View } from 'react-native';
import { AppText } from '@/components/AppText';
import type { InsightsMessage } from '@/context/DataContext';

interface InsightsMessageBubbleProps {
  message: InsightsMessage;
  index: number;
}

export function InsightsMessageBubble({ message, index }: InsightsMessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index * 30, 120)).duration(170)}
      className={`mb-3 max-w-[88%] rounded-[28px] px-4 py-3 ${
        isUser
          ? 'self-end bg-app-surface-3'
          : 'self-start border border-app-border bg-app-surface-1'
      }`}>
      <View className="gap-2">
        {!isUser && message.source === 'apple' ? (
          <AppText variant="label-xs" className="text-app-text-faint">
            Budget signal
          </AppText>
        ) : null}
        <AppText
          variant="body"
          selectable
          className={isUser ? 'text-app-text-strong' : 'text-app-text-soft'}>
          {message.content}
        </AppText>
      </View>
    </Animated.View>
  );
}
