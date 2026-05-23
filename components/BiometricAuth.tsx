import React, { useEffect, useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Label } from '@/components/Label';
import { useToast } from '@/context/useToast';
import { useAuth } from '@/context/useAuth';

interface BiometricAuthProps {
  onAuthenticated: (username: string) => Promise<void> | void;
  onShowOnboarding: () => void;
}

export default function BiometricAuth({ onAuthenticated, onShowOnboarding }: BiometricAuthProps) {
  const {
    username: storedUsername,
    isBiometricSupported,
    isBiometricEnabled,
    authenticateWithBiometrics,
  } = useAuth();
  const { toast } = useToast();

  const [username, setUsername] = useState(storedUsername ?? '');
  const [isUsernameSubmitting, setIsUsernameSubmitting] = useState(false);
  const [isBiometricSubmitting, setIsBiometricSubmitting] = useState(false);

  useEffect(() => {
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, [storedUsername]);

  const trimmedUsername = username.trim();
  const hasExistingAccount = Boolean(storedUsername);
  const canAttemptBiometric = isBiometricSupported && isBiometricEnabled;

  const handleUsernameSubmit = async () => {
    if (!trimmedUsername) {
      toast({
        title: 'Username required',
        description: 'Enter your username to continue.',
        variant: 'destructive',
      });
      return;
    }

    setIsUsernameSubmitting(true);
    try {
      await onAuthenticated(trimmedUsername);
      toast({
        title: 'Signed in',
        description: `Welcome back, ${trimmedUsername}!`,
        variant: 'success',
      });
    } catch (error) {
      console.error('Username authentication failed', error);
      toast({
        title: 'Sign-in failed',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUsernameSubmitting(false);
    }
  };

  const handleBiometricAuth = async () => {
    if (!canAttemptBiometric) {
      toast({
        title: 'Biometrics unavailable',
        description: 'Enable biometric unlock in your profile settings.',
        variant: 'destructive',
      });
      return;
    }

    const targetUsername = storedUsername ?? trimmedUsername;

    if (!targetUsername) {
      toast({
        title: 'Username required',
        description: 'Add your username to continue after biometric authentication.',
        variant: 'destructive',
      });
      return;
    }

    setIsBiometricSubmitting(true);
    try {
      const success = await authenticateWithBiometrics();
      if (success) {
        await onAuthenticated(targetUsername);
        toast({
          title: 'Authenticated',
          description: `Welcome back, ${targetUsername}!`,
          variant: 'success',
        });
      } else {
        toast({
          title: 'Authentication cancelled',
          description: 'Try again or use your username.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Biometric authentication failed', error);
      toast({
        title: 'Authentication failed',
        description: 'Try again or use your username instead.',
        variant: 'destructive',
      });
    } finally {
      setIsBiometricSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-app-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-1 px-6 py-12"
        keyboardShouldPersistTaps="handled">
        <View className="flex-1 items-center justify-center">
          <View className="w-full max-w-md">
            <View className="mb-8 items-center gap-3">
              <View className="rounded-full bg-primary-500 p-4">
                <Ionicons name="finger-print-outline" size={28} color="#FFFFFF" />
              </View>
              <Text className="text-3xl font-semibold text-app-text">Welcome back</Text>
              <Text className="text-center text-sm text-app-text-muted">
                Sign in securely with biometrics or your username to manage your budget.
              </Text>
            </View>

            <Card>
              <CardHeader className="items-center">
                <CardTitle className="text-app-text">Sign in securely</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <View className="space-y-2">
                  <Label htmlFor="auth-username" className="text-sm font-medium">
                    Username
                  </Label>
                  <Input
                    id="auth-username"
                    placeholder="Enter your username"
                    value={username}
                    onChangeText={setUsername}
                    disabled={hasExistingAccount}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                  />
                </View>

                {canAttemptBiometric ? (
                  <Button
                    onPress={handleBiometricAuth}
                    loading={isBiometricSubmitting}
                    className="w-full justify-center">
                    <View className="flex-row items-center">
                      <Ionicons name="finger-print-outline" size={18} color="#FFFFFF" />
                      <Text className="ml-2 text-sm font-semibold text-white">
                        Use Face ID / Touch ID
                      </Text>
                    </View>
                  </Button>
                ) : (
                  <View className="rounded-2xl border border-dashed border-app-border bg-app-surface-alt px-4 py-3">
                    <Text className="text-sm font-semibold text-app-text">
                      Biometrics not enabled
                    </Text>
                    <Text className="mt-1 text-xs text-app-text-muted">
                      Turn on biometric unlock from your profile to sign in with Face ID or Touch
                      ID.
                    </Text>
                  </View>
                )}

                <Button
                  variant="outline"
                  className="w-full"
                  onPress={handleUsernameSubmit}
                  loading={isUsernameSubmitting}
                  title={hasExistingAccount ? 'Continue with username' : 'Sign in with username'}
                />

                <View className="rounded-2xl border border-app-border bg-app-surface-alt px-4 py-3">
                  <View className="mb-2 flex-row items-center gap-2">
                    <Ionicons name="shield-checkmark-outline" size={16} color="#0F172A" />
                    <Text className="text-xs font-semibold text-app-text">Privacy first</Text>
                  </View>
                  <Text className="text-xs text-app-text-muted">
                    Authentication details stay on this device. We never upload biometric data.
                  </Text>
                </View>
              </CardContent>
            </Card>

            {!hasExistingAccount && (
              <View className="mt-6 rounded-3xl border border-app-border bg-app-surface px-5 py-5">
                <Text className="text-center text-sm text-app-text-muted">
                  New to WealthWise? Start onboarding to set up your profile.
                </Text>
                <Button
                  variant="secondary"
                  className="mt-4 w-full justify-center"
                  onPress={onShowOnboarding}
                  title="Start onboarding"
                />
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
