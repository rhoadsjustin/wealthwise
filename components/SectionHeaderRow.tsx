import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { AppText } from '@/components/AppText';

interface SectionHeaderRowProps {
  title: string;
  actionLabel?: string;
  onPressAction?: () => void;
  subtitle?: string;
}

export function SectionHeaderRow({
  title,
  actionLabel,
  onPressAction,
  subtitle,
}: SectionHeaderRowProps) {
  return (
    <View className="mb-4 flex-row items-end justify-between gap-3">
      <View className="flex-1">
        <AppText variant="section" className="text-app-text-strong">{title}</AppText>
        {subtitle ? <AppText variant="hint" className="mt-1 text-app-text-faint">{subtitle}</AppText> : null}
      </View>
      {actionLabel && onPressAction ? (
        <TouchableOpacity
          onPress={onPressAction}
          className="rounded-full border border-app-border bg-app-surface-1 px-3 py-2">
          <AppText variant="caption" className="text-app-text-soft">{actionLabel}</AppText>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
