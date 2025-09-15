import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

interface SwipeableRowProps {
  children: React.ReactNode;
  leftActions?: (controls: { close: () => void }) => React.ReactNode;
  rightActions?: (controls: { close: () => void }) => React.ReactNode;
  leftWidth?: number; // width revealed when swiping right
  rightWidth?: number; // width revealed when swiping left
  onClose?: () => void;
}

export default function SwipeableRow({
  children,
  leftActions,
  rightActions,
  leftWidth = 96,
  rightWidth = 160,
  onClose,
}: SwipeableRowProps) {
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

  const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

  const snapTo = (to: number) => {
    translateX.value = withTiming(to, { duration: 160 });
    if (to === 0 && onClose) runOnJS(onClose)();
  };

  const close = () => snapTo(0);

  const pan = Gesture.Pan()
    .onBegin(() => {
      startX.value = translateX.value;
    })
    .onUpdate((e) => {
      const next = startX.value + e.translationX;
      translateX.value = clamp(next, -rightWidth, leftWidth);
    })
    .onEnd(() => {
      const x = translateX.value;
      if (x > leftWidth * 0.6) {
        snapTo(leftWidth);
      } else if (x < -rightWidth * 0.4) {
        snapTo(-rightWidth);
      } else {
        snapTo(0);
      }
    })
    .runOnJS(true);

  const leftProgress = useSharedValue(0);
  const rightProgress = useSharedValue(0);

  const rowStyle = useAnimatedStyle(() => {
    // progress values 0..1 for rounding and dimming
    const lp = interpolate(translateX.value, [0, leftWidth], [0, 1], Extrapolation.CLAMP);
    const rp = interpolate(translateX.value, [0, -rightWidth], [0, 1], Extrapolation.CLAMP);
    leftProgress.value = lp;
    rightProgress.value = rp;
    const radiusLeft = lp * 12;
    const radiusRight = rp * 12;
    return {
      transform: [{ translateX: translateX.value }],
      borderTopLeftRadius: radiusLeft,
      borderBottomLeftRadius: radiusLeft,
      borderTopRightRadius: radiusRight,
      borderBottomRightRadius: radiusRight,
      overflow: radiusLeft > 0 || radiusRight > 0 ? ('hidden' as const) : ('visible' as const),
    };
  });

  const contentStyle = useAnimatedStyle(() => {
    const lp = leftProgress.value;
    const rp = rightProgress.value;
    const open = Math.max(lp, rp);
    // Dim slightly when open
    const opacity = 1 - open * 0.08;
    return { opacity };
  });

  const leftFxStyle = useAnimatedStyle(() => {
    const scale = 0.9 + leftProgress.value * 0.1;
    const opacity = 0.2 + leftProgress.value * 0.8;
    return { transform: [{ scale }], opacity };
  });

  const rightFxStyle = useAnimatedStyle(() => {
    const scale = 0.9 + rightProgress.value * 0.1;
    const opacity = 0.2 + rightProgress.value * 0.8;
    return { transform: [{ scale }], opacity };
  });

  return (
    <View style={styles.container}>
      {/* Actions layer */}
      <View style={styles.actionsLayer} pointerEvents="box-none">
        {/* Left actions */}
        <Animated.View style={[styles.left, { width: leftWidth }, leftFxStyle]}>
          {leftActions?.({ close })}
        </Animated.View>
        {/* Right actions */}
        <Animated.View style={[styles.right, { width: rightWidth }, rightFxStyle]}>
          {rightActions?.({ close })}
        </Animated.View>
      </View>

      {/* Draggable row */}
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.row, rowStyle]}>
          <Animated.View style={contentStyle}>{children}</Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  actionsLayer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderRadius: 12,
  },
  row: {
    // Keep shadows/clipping inside row
  },
});
