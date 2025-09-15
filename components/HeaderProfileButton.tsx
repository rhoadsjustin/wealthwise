import React from 'react';
import { Platform, TouchableOpacity, View, StyleSheet, ActionSheetIOS, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, LinkMenu, useRouter } from 'expo-router';

export default function HeaderProfileButton() {
  const router = useRouter();

  return (
    <Link href="/(tabs)">
      <Link.Trigger>
        <Ionicons name="person-circle-outline" size={24} color="black" />
      </Link.Trigger>
      <Link.Menu>
        <Link.MenuAction
          onPress={() => router.push('/categories')}
          title="Budget"
          icon="gear.circle"
        />
        <Link.MenuAction
          onPress={() => router.push('/profile')}
          title="Profile"
          icon="person.crop.circle"
        />
        <Link.MenuAction
          onPress={() => router.push('/gamify')}
          title="Goals"
          icon="trophy.circle"
        />
      </Link.Menu>
    </Link>
  );
}

const styles = StyleSheet.create({
  button: {
    marginRight: 8,
    padding: 4,
    borderRadius: 8,
  },
});
