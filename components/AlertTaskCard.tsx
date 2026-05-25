import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Ionicons } from '@expo/vector-icons';

import { Card, CardContent } from '@/components/Card';

type AlertTaskTone = 'income' | 'expense' | 'debt' | 'savings' | 'insight';

const toneConfig: Record<AlertTaskTone, { chip: string; text: string; icon: string }> = {
  income: { chip: 'bg-success-500/15', text: 'text-accent-income', icon: 'arrow-up' },
  expense: { chip: 'bg-error-500/15', text: 'text-accent-expense', icon: 'arrow-down' },
  debt: { chip: 'bg-warning-500/15', text: 'text-accent-debt', icon: 'warning' },
  savings: { chip: 'bg-info-500/15', text: 'text-accent-savings', icon: 'wallet' },
  insight: { chip: 'bg-accent-insight/15', text: 'text-accent-insight', icon: 'sparkles' },
};

interface AlertTaskCardProps {
  label: string;
  message: string;
  tone?: AlertTaskTone;
  progressLabel?: string;
  onPress?: () => void;
}

export function AlertTaskCard({
  label,
  message,
  tone = 'insight',
  progressLabel,
  onPress,
}: AlertTaskCardProps) {
  const palette = toneConfig[tone];
  const content = (
    <Card variant="glass-dark" className="px-0 py-0">
      <CardContent className="flex-row items-start gap-3 px-4 py-4">
        <View className={`h-10 w-10 items-center justify-center rounded-2xl ${palette.chip}`}>
          <Ionicons name={palette.icon as never} size={18} color="#F8FAFC" />
        </View>
        <View className="flex-1">
          <AppText variant="label-sm" className={palette.text}>{label}</AppText>
          <AppText variant="body" className="mt-2 text-app-text-soft">{message}</AppText>
          {progressLabel ? (
            <View className="mt-3 self-start rounded-full bg-app-canvas-elevated px-3 py-1.5">
              <AppText variant="caption" className="text-app-text-faint">{progressLabel}</AppText>
            </View>
          ) : null}
        </View>
      </CardContent>
    </Card>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.88}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}
