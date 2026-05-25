import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

import {
  addToastImperative,
  type ToastItem as ToastItemType,
  type ToastVariant,
} from '@/context/ToastContext';

// ─── Theme color maps (values from tailwind.config.js) ───────────────────────

type ColorSet = { bg: string; accent: string; title: string; desc: string; icon: string };

const VARIANT_COLORS: Record<'light' | 'dark', Record<ToastVariant, ColorSet>> = {
  light: {
    success: { bg: '#f0fdf4', accent: '#22c55e', title: '#166534', desc: '#15803d', icon: '#22c55e' },
    error:   { bg: '#fef2f2', accent: '#ef4444', title: '#991b1b', desc: '#b91c1c', icon: '#ef4444' },
    warning: { bg: '#fffbeb', accent: '#f59e0b', title: '#92400e', desc: '#b45309', icon: '#f59e0b' },
    info:    { bg: '#eff6ff', accent: '#3b82f6', title: '#1e3a8a', desc: '#1d4ed8', icon: '#3b82f6' },
  },
  dark: {
    success: { bg: '#12192E', accent: '#59F7A5', title: '#86efac', desc: '#4ade80', icon: '#59F7A5' },
    error:   { bg: '#12192E', accent: '#FF5D8F', title: '#fca5a5', desc: '#f87171', icon: '#FF5D8F' },
    warning: { bg: '#12192E', accent: '#FFB347', title: '#fcd34d', desc: '#fbbf24', icon: '#FFB347' },
    info:    { bg: '#12192E', accent: '#58B6FF', title: '#93c5fd', desc: '#60a5fa', icon: '#58B6FF' },
  },
};

const BASE_COLORS = {
  light: { border: '#e5e7eb', closeIcon: '#6b7280', shadowColor: '#000000' },
  dark:  { border: '#1F2A3A', closeIcon: '#94A3B8', shadowColor: '#000000' },
};

const ICONS: Record<ToastVariant, React.ComponentProps<typeof Ionicons>['name']> = {
  success: 'checkmark-circle',
  error:   'alert-circle',
  warning: 'warning',
  info:    'information-circle',
};

// ─── ToastItem component ──────────────────────────────────────────────────────

export interface ToastItemProps extends ToastItemType {
  removeToast: (id: string) => void;
}

export function ToastItem({
  id,
  variant,
  title,
  description,
  duration = 4000,
  removeToast,
}: ToastItemProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = VARIANT_COLORS[scheme][variant];
  const base = BASE_COLORS[scheme];

  const translateY = useSharedValue(60);
  const opacity = useSharedValue(0);
  const isDismissing = useRef(false);

  // Enter animation on mount
  useEffect(() => {
    translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
    opacity.value = withTiming(1, { duration: 200 });
  }, []);

  const handleDismiss = useCallback(() => {
    if (isDismissing.current) return;
    isDismissing.current = true;
    translateY.value = withTiming(60, { duration: 180 });
    opacity.value = withTiming(0, { duration: 160 });
    // Wait for exit animation before removing from state
    setTimeout(() => removeToast(id), 200);
  }, [id, removeToast, translateY, opacity]);

  // Auto-dismiss timer
  useEffect(() => {
    const timer = setTimeout(handleDismiss, duration);
    return () => clearTimeout(timer);
  }, [duration, handleDismiss]);

  const panGesture = Gesture.Pan()
    .onChange((event) => {
      // Only follow downward drag
      if (event.translationY > 0) {
        translateY.value = event.translationY;
        opacity.value = Math.max(0, 1 - event.translationY / 120);
      }
    })
    .onEnd((event) => {
      if (!isDismissing.current && (event.translationY > 40 || event.velocityY > 500)) {
        handleDismiss();
      } else if (!isDismissing.current) {
        // Snap back
        translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
        opacity.value = withTiming(1, { duration: 150 });
      }
    })
    .runOnJS(true);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={handleDismiss}
          style={[
            styles.container,
            {
              backgroundColor: colors.bg,
              borderColor: base.border,
              borderLeftColor: colors.accent,
              shadowColor: base.shadowColor,
            },
          ]}
          accessibilityRole="alert"
          accessibilityLabel={`${variant}: ${title}${description ? `, ${description}` : ''}`}
        >
          <View style={styles.content}>
            <Ionicons
              name={ICONS[variant]}
              size={20}
              color={colors.icon}
              style={styles.icon}
            />
            <View style={styles.textCol}>
              <Text style={[styles.title, { color: colors.title }]} numberOfLines={2}>
                {title}
              </Text>
              {description ? (
                <Text style={[styles.desc, { color: colors.desc }]} numberOfLines={3}>
                  {description}
                </Text>
              ) : null}
            </View>
          </View>
          <TouchableOpacity
            onPress={handleDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Dismiss notification"
          >
            <Ionicons name="close" size={16} color={base.closeIcon} />
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    </GestureDetector>
  );
}

// ─── Backward-compatible imperative API ──────────────────────────────────────

export interface ToastProps {
  variant?: 'default' | 'destructive' | 'success' | 'info' | 'warning';
  title: string;
  description?: string;
}

export const showToast = {
  success: (title: string, description?: string) =>
    addToastImperative({ variant: 'success', title, description }),
  error: (title: string, description?: string) =>
    addToastImperative({ variant: 'error', title, description, duration: 5000 }),
  info: (title: string, description?: string) =>
    addToastImperative({ variant: 'info', title, description }),
  warning: (title: string, description?: string) =>
    addToastImperative({ variant: 'warning', title, description }),
};

export const toast = ({ variant = 'default', title, description }: ToastProps): void => {
  switch (variant) {
    case 'destructive':
      showToast.error(title, description);
      break;
    case 'warning':
      showToast.warning(title, description);
      break;
    case 'info':
      showToast.info(title, description);
      break;
    default:
      showToast.success(title, description);
      break;
  }
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginRight: 10,
  },
  icon: {
    marginRight: 10,
    marginTop: 1,
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  desc: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
});
