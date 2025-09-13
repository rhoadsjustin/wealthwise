import React from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';

interface ProgressProps {
  value?: number; // 0-100
  style?: ViewStyle;
  color?: string;
  backgroundColor?: string;
  height?: number;
  animated?: boolean;
}

const Progress = React.forwardRef<View, ProgressProps>(
  (
    {
      value = 0,
      style,
      color = '#000000',
      backgroundColor = '#E5E7EB',
      height = 8,
      animated = true,
    },
    ref
  ) => {
    const animatedValue = React.useRef(new Animated.Value(0)).current;
    const [layoutWidth, setLayoutWidth] = React.useState(0);

    // Clamp value between 0 and 100
    const clampedValue = Math.min(Math.max(value, 0), 100);

    React.useEffect(() => {
      if (animated && layoutWidth > 0) {
        Animated.timing(animatedValue, {
          toValue: (clampedValue / 100) * layoutWidth,
          duration: 500,
          useNativeDriver: false,
        }).start();
      } else if (layoutWidth > 0) {
        animatedValue.setValue((clampedValue / 100) * layoutWidth);
      }
    }, [clampedValue, layoutWidth, animated, animatedValue]);

    const handleLayout = (event: { nativeEvent: { layout: { width: number } } }) => {
      const { width } = event.nativeEvent.layout;
      setLayoutWidth(width);

      // Set initial value without animation on first layout
      if (width > 0 && !animated) {
        animatedValue.setValue((clampedValue / 100) * width);
      }
    };

    return (
      <View
        ref={ref}
        style={[
          styles.container,
          {
            height,
            backgroundColor,
          },
          style,
        ]}
        onLayout={handleLayout}>
        <Animated.View
          style={[
            styles.indicator,
            {
              height,
              backgroundColor: color,
              width: animated ? animatedValue : (clampedValue / 100) * layoutWidth,
            },
          ]}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 9999, // rounded-full
    overflow: 'hidden',
    position: 'relative',
  },
  indicator: {
    borderRadius: 9999, // rounded-full
  },
});

Progress.displayName = 'Progress';

export { Progress };
export type { ProgressProps };
