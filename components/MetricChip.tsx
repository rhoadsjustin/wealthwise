import React from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/AppText';

type MetricChipTone = 'neutral' | 'income' | 'expense' | 'debt' | 'savings' | 'insight';

const toneMap: Record<MetricChipTone, { bg: string; text: string }> = {
  neutral: { bg: 'bg-app-surface-3', text: 'text-app-text-soft' },
  income: { bg: 'bg-success-500/15', text: 'text-accent-income' },
  expense: { bg: 'bg-error-500/15', text: 'text-accent-expense' },
  debt: { bg: 'bg-warning-500/15', text: 'text-accent-debt' },
  savings: { bg: 'bg-info-500/15', text: 'text-accent-savings' },
  insight: { bg: 'bg-accent-insight/15', text: 'text-accent-insight' },
};

interface MetricChipProps {
  label: string;
  value: string;
  tone?: MetricChipTone;
}

export function MetricChip({ label, value, tone = 'neutral' }: MetricChipProps) {
  const palette = toneMap[tone];

  return (
    <View className={`rounded-2xl px-3 py-2 ${palette.bg}`}>
      <AppText variant="label-xs" className="text-app-text-faint">{label}</AppText>
      <AppText variant="metric" className={`mt-1 ${palette.text}`}>{value}</AppText>
    </View>
  );
}
