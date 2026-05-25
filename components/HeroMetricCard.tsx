import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Ionicons } from '@expo/vector-icons';

import { Card, CardContent } from '@/components/Card';
import { MetricChip } from '@/components/MetricChip';

interface HeroMetricCardProps {
  eyebrow: string;
  title: string;
  value: string;
  status: string;
  updatedLabel?: string;
  metrics: {
    label: string;
    value: string;
    tone?: 'neutral' | 'income' | 'expense' | 'debt' | 'savings' | 'insight';
  }[];
  onPressDetails?: () => void;
  children?: React.ReactNode;
}

export function HeroMetricCard({
  eyebrow,
  title,
  value,
  status,
  updatedLabel,
  metrics,
  onPressDetails,
  children,
}: HeroMetricCardProps) {
  return (
    <Card variant="hero">
      <CardContent>
        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <AppText variant="label-xs" className="text-app-text-faint">{eyebrow}</AppText>
            <AppText variant="hero" className="mt-3 text-4xl text-app-text-strong">{value}</AppText>
            <AppText variant="body" className="mt-2 text-app-text-soft">{title}</AppText>
          </View>
          <View className="items-end">
            <View className="rounded-full border border-app-border-contrast bg-app-surface-1 px-3 py-1.5">
              <AppText variant="caption" className="text-accent-income">{status}</AppText>
            </View>
            {onPressDetails ? (
              <TouchableOpacity
                onPress={onPressDetails}
                className="mt-3 flex-row items-center rounded-full bg-app-canvas-elevated px-3 py-2">
                <AppText variant="caption" className="text-app-text-soft">Details</AppText>
                <Ionicons
                  name="chevron-forward"
                  size={12}
                  color="#C8D3EA"
                  style={{ marginLeft: 4 }}
                />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {updatedLabel ? (
          <AppText variant="hint" className="mt-4 text-app-text-faint">{updatedLabel}</AppText>
        ) : null}

        {children ? <View className="mt-5">{children}</View> : null}

        <View className="mt-5 flex-row flex-wrap gap-2">
          {metrics.map((metric) => (
            <MetricChip
              key={metric.label}
              label={metric.label}
              value={metric.value}
              tone={metric.tone}
            />
          ))}
        </View>
      </CardContent>
    </Card>
  );
}
