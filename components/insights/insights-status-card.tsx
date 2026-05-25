import React from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Card, CardContent } from '@/components/Card';

type StatusTone = 'default' | 'warning' | 'error' | 'success';

const toneClasses: Record<StatusTone, { badge: string; text: string }> = {
  default: { badge: 'bg-app-surface-2', text: 'text-app-text-soft' },
  warning: { badge: 'bg-warning-500/15', text: 'text-warning-700' },
  error: { badge: 'bg-error-500/15', text: 'text-error-700' },
  success: { badge: 'bg-success-500/15', text: 'text-success-700' },
};

interface InsightsStatusCardProps {
  eyebrow: string;
  title: string;
  detail: string;
  statusLabel: string;
  tone?: StatusTone;
  progressLines?: string[];
}

export function InsightsStatusCard({
  eyebrow,
  title,
  detail,
  statusLabel,
  tone = 'default',
  progressLines = [],
}: InsightsStatusCardProps) {
  const palette = toneClasses[tone];

  return (
    <Animated.View entering={FadeInDown.duration(180)}>
      <Card variant="glass-dark">
        <CardContent className="gap-4">
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <AppText variant="label-xs" className="text-app-text-faint">
                {eyebrow}
              </AppText>
              <AppText variant="section" className="mt-2 text-app-text-strong">
                {title}
              </AppText>
              <AppText variant="body" className="mt-2 text-app-text-soft">
                {detail}
              </AppText>
            </View>
            <View className={`rounded-full px-3 py-1.5 ${palette.badge}`}>
              <AppText variant="caption" className={palette.text}>
                {statusLabel}
              </AppText>
            </View>
          </View>

          {progressLines.length ? (
            <View className="gap-2 rounded-2xl bg-app-canvas-elevated px-4 py-3">
              {progressLines.map((line) => (
                <AppText key={line} variant="hint" className="text-app-text-faint">
                  {line}
                </AppText>
              ))}
            </View>
          ) : null}
        </CardContent>
      </Card>
    </Animated.View>
  );
}
