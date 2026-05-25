import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastContext } from '@/context/ToastContext';
import { ToastItem } from './Toast';

export function Toaster() {
  const { toasts, removeToast } = useToastContext();
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  return (
    <View style={[styles.overlay]} pointerEvents="box-none">
      <View
        style={[styles.container, { bottom: Math.max(insets.bottom, 16) + 8 }]}
        pointerEvents="box-none"
      >
        {toasts.slice(-3).map((t) => (
          <ToastItem key={t.id} {...t} removeToast={removeToast} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    gap: 8,
  },
});
