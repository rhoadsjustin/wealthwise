import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Switch, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useAuth } from '@/context/useAuth';
import { useData } from '@/context/DataContext';
import { localStorage } from '@/lib/local-storage';
import { useRouter } from 'expo-router';

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
    } catch (e) {
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

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: '#F7F9FC', padding: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 16 }}>Profile</Text>

        <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <Text style={{ fontWeight: '600', color: '#374151', marginBottom: 8 }}>Username</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Your username"
            style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, backgroundColor: 'white' }}
          />
        </View>

        <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontWeight: '600', color: '#374151' }}>Require App Lock on Open</Text>
              <Text style={{ color: '#6B7280', marginTop: 4 }}>Face ID / Touch ID or passcode</Text>
            </View>
            <Switch value={requireLock} onValueChange={setRequireLock} />
          </View>
        </View>

        <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 16 }}>
          <Text style={{ fontWeight: '600', color: '#374151', marginBottom: 8 }}>Passcode (optional)</Text>
          <TextInput
            value={passcode}
            onChangeText={setPasscode}
            placeholder="Set 4+ digit passcode"
            keyboardType="number-pad"
            secureTextEntry
            style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, backgroundColor: 'white' }}
          />
          <TouchableOpacity
            onPress={updatePasscode}
            style={{ marginTop: 12, backgroundColor: '#0EA5E9', paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}>
            <Text style={{ color: 'white', fontWeight: '600' }}>Save Passcode</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 24, flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ flex: 1, backgroundColor: 'white', borderColor: '#E5E7EB', borderWidth: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}>
            <Text style={{ color: '#374151', fontWeight: '600' }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={saveProfile}
            style={{ flex: 1, backgroundColor: '#10B981', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}>
            <Text style={{ color: 'white', fontWeight: '600' }}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

