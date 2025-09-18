import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/context/useAuth';
import { useData } from '@/context/DataContext';
import { localStorage } from '@/lib/local-storage';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';

export default function ProfileModal() {
  const router = useRouter();
  const { username, login } = useAuth();
  const { updateUserProfile, getUserProfile } = useData();
  const [name, setName] = useState(username || '');
  const [requireLock, setRequireLock] = useState(false);
  const [passcode, setPasscode] = useState('');

  useEffect(() => {
    const load = async () => {
      await localStorage.init();
      const lock = await localStorage.getSetting('requireAppLock');
      const savedPass = await localStorage.getSetting('appPasscode');
      setRequireLock(Boolean(lock));
      setPasscode(savedPass || '');
    };
    load();
  }, []);

  const saveProfile = async () => {
    try {
      const user = await getUserProfile();
      if (name && name !== user.username) {
        await updateUserProfile({ username: name });
        await login(name);
      }
      await localStorage.setSetting('requireAppLock', requireLock);
      Alert.alert('Saved', 'Profile updated');
      router.back();
    } catch (error) {
      console.error('Failed to save profile', error);
      Alert.alert('Error', 'Failed to save profile');
    }
  };

  const updatePasscode = async () => {
    if (!passcode) {
      await localStorage.setSetting('appPasscode', '');
      Alert.alert('Removed', 'Passcode removed');
      return;
    }
    if (passcode.length < 4) {
      Alert.alert('Invalid', 'Passcode must be at least 4 digits');
      return;
    }
    await localStorage.setSetting('appPasscode', passcode);
    Alert.alert('Saved', 'Passcode updated');
  };

  const insets = useSafeAreaInsets();

  const screenOptions = React.useMemo(() => ({ headerShown: false }), []);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View className="flex-1 bg-app-background">
        <Stack.Screen options={screenOptions} />
        <View
          className="flex-1 px-5"
          style={{ paddingTop: Math.max(insets.top + 8, 24), paddingBottom: Math.max(insets.bottom, 16) }}>
          <View className="mb-4 flex-row items-center justify-between">
            <View>
              <Text className="text-xl font-semibold text-app-text">Profile</Text>
              <Text className="mt-1 text-xs text-app-text-muted">Update your name and security preferences.</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.back()}
              accessibilityLabel="Close profile"
              className="h-10 w-10 items-center justify-center rounded-full border border-app-border bg-app-surface shadow-xs">
              <Ionicons name="close" size={18} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <View className="space-y-5">
            <View className="rounded-3xl border border-app-border bg-app-surface px-5 py-5 shadow-sm">
              <Text className="text-sm font-medium text-app-text-muted">Display name</Text>
              <Input
                label="Username"
                placeholder="Your username"
                value={name}
                onChangeText={setName}
                className="mt-3"
              />
            </View>

            <View className="rounded-3xl border border-app-border bg-app-surface px-5 py-5 shadow-sm">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-4">
                  <Text className="text-base font-semibold text-app-text">Require app lock on open</Text>
                  <Text className="mt-2 text-xs text-app-text-muted">Use Face ID / Touch ID or your passcode.</Text>
                </View>
                <Switch
                  value={requireLock}
                  onValueChange={setRequireLock}
                  thumbColor={requireLock ? '#0EA5E9' : '#E5E7EB'}
                  trackColor={{ true: '#BAE6FD', false: '#CBD5F5' }}
                />
              </View>
            </View>

            <View className="rounded-3xl border border-app-border bg-app-surface px-5 py-5 shadow-sm">
              <Text className="text-base font-semibold text-app-text">Passcode (optional)</Text>
              <Text className="mt-1 text-xs text-app-text-muted">Set a 4+ digit fallback if biometrics fail.</Text>
              <Input
                className="mt-4"
                placeholder="Enter passcode"
                value={passcode}
                onChangeText={setPasscode}
                keyboardType="number-pad"
                secureTextEntry
              />
              <Button
                className="mt-4"
                size="md"
                title="Save passcode"
                onPress={updatePasscode}
              />
            </View>
          </View>

          <View className="mt-8">
            <Button
              className="w-full"
              size="lg"
              title="Save changes"
              onPress={saveProfile}
            />
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
