import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import { localStorage } from '@/lib/local-storage';
import { setAppUnlocked } from '@/context/appLock';

export default function LockScreen() {
  const router = useRouter();
  const [passcode, setPasscode] = useState('');
  const [hasPasscode, setHasPasscode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      await localStorage.init();
      const stored = await localStorage.getSetting('appPasscode');
      setHasPasscode(!!stored);
      try {
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        const hardware = await LocalAuthentication.hasHardwareAsync();
        if (hardware && enrolled) {
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Unlock Budget App',
            fallbackLabel: 'Use Passcode',
            cancelLabel: 'Cancel',
          });
          if (result.success) {
            setAppUnlocked(true);
            router.replace('/');
            return;
          }
        }
      } catch {}
    };
    init();
  }, [router]);

  const tryPasscode = async () => {
    setError(null);
    const stored = await localStorage.getSetting('appPasscode');
    if (stored && passcode === String(stored)) {
      setAppUnlocked(true);
      router.replace('/');
    } else {
      setError('Incorrect passcode');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F7F9FC' }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 12 }}>Locked</Text>
        <Text style={{ color: '#374151', marginBottom: 24, textAlign: 'center' }}>
          {hasPasscode ? 'Use Face ID/Touch ID or enter your passcode to continue.' : 'Use Face ID/Touch ID to continue.'}
        </Text>

        {hasPasscode && (
          <View style={{ width: '100%', maxWidth: 320 }}>
            <TextInput
              placeholder="Enter passcode"
              keyboardType="number-pad"
              secureTextEntry
              value={passcode}
              onChangeText={setPasscode}
              style={{
                backgroundColor: 'white',
                borderColor: '#E5E7EB',
                borderWidth: 1,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 18,
              }}
            />
            {error && (
              <Text style={{ color: '#EF4444', marginTop: 8 }}>{error}</Text>
            )}
            <TouchableOpacity
              onPress={tryPasscode}
              style={{
                marginTop: 16,
                backgroundColor: '#0EA5E9',
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: 'center',
              }}>
              <Text style={{ color: 'white', fontWeight: '600' }}>Unlock</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

