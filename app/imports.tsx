import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card, CardContent } from '@/components/Card';

export default function ImportsLauncherModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-app-surface-overlay px-5"
      style={{ paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom + 20, 32) }}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="mb-6 flex-row items-center justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-3xl font-semibold text-app-text-strong">Import</Text>
          <Text className="mt-1 text-sm text-app-text-faint">
            Bring new transactions into Activity from statements or Apple Wallet.
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-full border border-app-border bg-app-surface-1">
          <Ionicons name="close" size={18} color="#F8FAFC" />
        </TouchableOpacity>
      </View>

      <View className="gap-4">
        <ImportOption
          icon="document-text-outline"
          title="Statement import"
          description="Paste text, open a CSV or PDF, or scan a statement image for review before import."
          onPress={() => router.replace('/transaction-import' as any)}
        />
        <ImportOption
          icon="logo-apple"
          title="Apple Card import"
          description="Connect FinanceKit and review recent Apple Card transactions from Wallet."
          onPress={() => router.replace('/apple-card-import')}
        />
      </View>
    </View>
  );
}

function ImportOption({
  icon,
  title,
  description,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <Card variant="hero">
        <CardContent>
          <View className="flex-row items-start gap-4">
            <View className="h-14 w-14 items-center justify-center rounded-3xl bg-app-canvas-elevated">
              <Ionicons name={icon} size={22} color="#59F7A5" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-app-text-strong">{title}</Text>
              <Text className="mt-2 text-sm leading-6 text-app-text-faint">{description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#C8D3EA" />
          </View>
        </CardContent>
      </Card>
    </TouchableOpacity>
  );
}
