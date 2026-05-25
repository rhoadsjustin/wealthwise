import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const TriggerIcon = () => (
  <View className="shadow-card" style={styles.trigger}>
    <Ionicons name="person-outline" size={18} color="#F8FAFC" />
  </View>
);

export default function HeaderProfileButton() {
  const router = useRouter();
  const handlePress = () => router.push('/profile');

  if (Platform.OS === 'web') {
    return (
      <Pressable onPress={handlePress} accessibilityLabel="Open profile">
        <TriggerIcon />
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityLabel="Open profile"
      hitSlop={8}
      onPress={handlePress}
      style={({ pressed }) => [
        {
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
      ]}>
      <TriggerIcon />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trigger: {
    alignItems: 'center',
    backgroundColor: '#10182B',
    borderColor: '#2E4268',
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
});
