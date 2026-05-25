import React from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Card, CardContent } from '@/components/Card';

type SignalTone = 'default' | 'success' | 'warning' | 'error';

export interface InsightsSignalItem {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone?: SignalTone;
}

const toneText: Record<SignalTone, string> = {
  default: 'text-app-text-strong',
  success: 'text-success-700',
  warning: 'text-warning-700',
  error: 'text-error-700',
};

interface InsightsSignalStripProps {
  items: InsightsSignalItem[];
}

export function InsightsSignalStrip({ items }: InsightsSignalStripProps) {
  return (
    <View className="flex-row flex-wrap gap-3">
      {items.map((item, index) => (
        <Animated.View
          key={item.id}
          entering={FadeInDown.delay(index * 40).duration(180)}
          className="min-w-[47%] flex-1">
          <Card variant="inset" className="rounded-[28px]">
            <CardContent className="gap-2">
              <AppText variant="label-xs" className="text-app-text-faint">
                {item.label}
              </AppText>
              <AppText variant="metric-lg" className={toneText[item.tone ?? 'default']}>
                {item.value}
              </AppText>
              <AppText variant="hint" className="text-app-text-soft">
                {item.detail}
              </AppText>
            </CardContent>
          </Card>
        </Animated.View>
      ))}
    </View>
  );
}
