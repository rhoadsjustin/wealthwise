import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  heightRatio?: number; // 0..1 of screen height
  overlayOpacity?: number; // 0..1
  children: React.ReactNode;
}

export default function BottomSheet({
  isOpen,
  onClose,
  heightRatio = 0.85,
  overlayOpacity = 0.4,
  children,
}: BottomSheetProps) {
  const screenHeight = Dimensions.get('window').height;
  const sheetHeight = Math.round(screenHeight * Math.max(0.4, Math.min(1, heightRatio)));

  const translateY = useRef(new Animated.Value(sheetHeight)).current;
  const overlay = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlay, {
          toValue: overlayOpacity,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: sheetHeight,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(overlay, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [isOpen, mounted, overlay, overlayOpacity, sheetHeight, translateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => {
          return gesture.dy > 4; // start on downward drag
        },
        onPanResponderMove: (_, gesture) => {
          const dy = Math.max(0, gesture.dy);
          translateY.setValue(dy);
          const progress = Math.min(1, dy / sheetHeight);
          overlay.setValue(overlayOpacity * (1 - progress));
        },
        onPanResponderRelease: (_, gesture) => {
          const shouldClose = gesture.dy > sheetHeight * 0.25 || gesture.vy > 0.8;
          if (shouldClose) {
            Animated.parallel([
              Animated.timing(translateY, {
                toValue: sheetHeight,
                duration: 180,
                useNativeDriver: true,
              }),
              Animated.timing(overlay, {
                toValue: 0,
                duration: 180,
                useNativeDriver: true,
              }),
            ]).start(({ finished }) => {
              if (finished) onClose();
            });
          } else {
            Animated.parallel([
              Animated.timing(translateY, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
              }),
              Animated.timing(overlay, {
                toValue: overlayOpacity,
                duration: 200,
                useNativeDriver: true,
              }),
            ]).start();
          }
        },
      }),
    [onClose, overlay, overlayOpacity, sheetHeight, translateY]
  );

  if (!mounted) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        style={[styles.overlay, { opacity: overlay }]}
        pointerEvents={isOpen ? 'auto' : 'none'}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          {
            height: sheetHeight,
            transform: [{ translateY }],
          },
        ]}
        {...panResponder.panHandlers}>
        <SafeAreaView style={styles.handleArea}>
          <View style={styles.handleBar} />
        </SafeAreaView>
        <View style={styles.content}>{children}</View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 16,
  },
  handleArea: {
    paddingTop: Platform.OS === 'android' ? 8 : 4,
    paddingBottom: 8,
    alignItems: 'center',
  },
  handleBar: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
  content: {
    flex: 1,
  },
});
