import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HeaderProfileButton from '@/components/HeaderProfileButton';

type TopUtilityBarProps = {
  badge?: string;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onPressAction?: () => void;
  hideProfileButton?: boolean;
};

const ACTION_SIZE = 44;

export function TopUtilityBar({
  badge = 'WealthWise',
  actionIcon,
  actionLabel,
  onPressAction,
  hideProfileButton = false,
}: TopUtilityBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View className="bg-app-canvas px-5" style={{ paddingTop: insets.top + 10, paddingBottom: 6 }}>
      <View className="flex-row items-center justify-between">
        {!hideProfileButton ? <HeaderProfileButton /> : <View style={styles.actionSpacer} />}

        <View className="rounded-full border border-app-border-contrast bg-app-surface-1 px-4 py-2 shadow-card">
          <Text className="text-xs font-semibold uppercase tracking-[0.12em] text-app-text-soft">
            {badge}
          </Text>
        </View>

        {actionIcon && onPressAction ? (
          <UtilityActionButton
            icon={actionIcon}
            label={actionLabel ?? 'Open action'}
            onPress={onPressAction}
          />
        ) : (
          <View style={styles.actionSpacer} />
        )}
      </View>
    </View>
  );
}

function UtilityActionButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        {
          transform: [{ scale: pressed ? 0.96 : 1 }],
          opacity: pressed ? 0.92 : 1,
        },
      ]}>
      <Ionicons name={icon} size={18} color="#F8FAFC" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionSpacer: {
    height: ACTION_SIZE,
    width: ACTION_SIZE,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: '#10182B',
    borderColor: '#2E4268',
    borderRadius: ACTION_SIZE / 2,
    borderWidth: 1,
    height: ACTION_SIZE,
    justifyContent: 'center',
    width: ACTION_SIZE,
  },
});
