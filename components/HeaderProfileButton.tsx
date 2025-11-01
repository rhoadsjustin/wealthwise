import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

type MenuItem = {
  label: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const MENU_ITEMS: MenuItem[] = [
  { label: 'Profile', route: '/profile', icon: 'person-circle-outline' },
  { label: 'Budget', route: '/categories', icon: 'pie-chart-outline' },
  { label: 'Goals', route: '/gamify', icon: 'trophy-outline' },
];

const TriggerIcon = () => (
  <View className="h-9 w-9 items-center justify-center rounded-full bg-app-surface shadow-xs">
    <Ionicons name="settings-outline" size={20} color="#0F172A" />
  </View>
);

export default function HeaderProfileButton() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSelect = (route: string) => {
    setIsMenuOpen(false);
    router.push(route as any);
  };

  if (Platform.OS === 'web') {
    return (
      <TouchableOpacity onPress={() => router.push('/profile')} accessibilityLabel="Open profile">
        <TriggerIcon />
      </TouchableOpacity>
    );
  }

  return (
    <>
      <TouchableOpacity
        onPress={() => setIsMenuOpen(true)}
        accessibilityLabel="Open profile menu"
        activeOpacity={0.7}>
        <TriggerIcon />
      </TouchableOpacity>

      <Modal
        transparent
        animationType="fade"
        visible={isMenuOpen}
        onRequestClose={() => setIsMenuOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setIsMenuOpen(false)}>
          <View className="w-48 rounded-2xl border border-app-border bg-app-surface shadow-lg">
            {MENU_ITEMS.map((item) => (
              <Pressable
                key={item.route}
                style={styles.menuItem}
                onPress={() => handleSelect(item.route)}
                accessibilityRole="menuitem">
                <Ionicons name={item.icon} size={18} color="#0F172A" />
                <Text className="ml-3 text-sm font-medium text-app-text">{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 64,
    paddingRight: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
