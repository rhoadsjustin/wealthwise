import { Stack } from 'expo-router';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GamifyComingSoon() {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-app-background px-6"
      style={{ paddingTop: Math.max(insets.top + 16, 48), paddingBottom: Math.max(insets.bottom + 24, 48) }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 items-center justify-center">
        <View className="w-full max-w-sm items-center rounded-3xl border border-dashed border-app-border bg-app-surface px-6 py-10">
          <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-500">Gamify</Text>
          <Text className="mt-4 text-center text-2xl font-semibold text-app-text">Coming soon</Text>
          <Text className="mt-3 text-center text-sm text-app-text-muted">
            We’re putting the finishing touches on rewards, streaks, and challenges.
          </Text>
          <Text className="mt-6 text-center text-xs text-app-text-muted">
            Keep WealthWise up to date and you’ll be one of the first to earn bonuses when this feature drops.
          </Text>
        </View>
      </View>
    </View>
  );
}
