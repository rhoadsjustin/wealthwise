import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { AppText } from '@/components/AppText';

interface TransactionRowDenseProps {
  icon: string;
  title: string;
  subtitle: string;
  amount: string;
  tone?: 'income' | 'expense' | 'neutral';
  badge?: string | null;
  onPress?: () => void;
}

export function TransactionRowDense({
  icon,
  title,
  subtitle,
  amount,
  tone = 'neutral',
  badge,
  onPress,
}: TransactionRowDenseProps) {
  const amountColor =
    tone === 'income'
      ? 'text-accent-income'
      : tone === 'expense'
        ? 'text-accent-expense'
        : 'text-app-text-strong';

  const content = (
    <View className="flex-row items-center justify-between gap-3 rounded-3xl border border-app-border bg-app-surface-1 px-4 py-4">
      <View className="flex-1 flex-row items-center gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-app-canvas-elevated">
          <Text className="text-xl">{icon}</Text>
        </View>
        <View className="flex-1">
          <AppText variant="title" className="text-sm text-app-text-strong">{title}</AppText>
          <AppText variant="hint" className="mt-1 text-app-text-faint">{subtitle}</AppText>
        </View>
      </View>
      <View className="items-end">
        <AppText variant="metric" className={amountColor}>{amount}</AppText>
        {badge ? (
          <View className="mt-2 rounded-full bg-app-canvas-elevated px-2.5 py-1">
            <AppText variant="label-xs" className="text-app-text-faint">{badge}</AppText>
          </View>
        ) : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}
