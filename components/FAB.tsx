import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { selection } from '@/lib/haptics';

interface FABProps {
  onPress: () => void;
  label?: string;
}

export default function FAB({ onPress, label = '' }: FABProps) {
  const { bottom } = useSafeAreaInsets();
  const scale = useSharedValue(0.9);

  React.useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 160 });
  }, [scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', right: 20, bottom: Math.max(bottom, 12) + 45, zIndex: 50 }}>
      <Animated.View style={style}>
        <TouchableOpacity
          onPress={async () => {
            // Small tap bounce + haptic selection
            scale.value = withTiming(0.94, { duration: 80 }, () => {
              scale.value = withSpring(1, { damping: 12, stiffness: 200 });
            });
            try {
              await selection();
            } catch {}
            onPress();
          }}
          activeOpacity={0.8}
          className="h-14 w-14 items-center justify-center rounded-full border border-app-border-contrast bg-app-surface-2 shadow-glow">
          <Ionicons name="add" size={28} color="#59F7A5" />
        </TouchableOpacity>
      </Animated.View>
      {label ? (
        <Text className="mt-2 text-center text-xs text-app-text-faint" accessibilityElementsHidden>
          {label}
        </Text>
      ) : null}
    </View>
  );
}
