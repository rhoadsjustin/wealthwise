import React from 'react';
import {
  ScrollView,
  View,
  Text,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HeaderProfileButton from '@/components/HeaderProfileButton';
import { SavingsSummaryCard } from '@/components/SavingsSummaryCard';
import { SavingsGoalCard } from '@/components/SavingsGoalCard';
import { Button } from '@/components/Button';
import { Skeleton } from '@/components/Skeleton';
import { useAppData } from '../_layout';
import { useSavings } from '@/context/DataContext';

const formatAccentCurrency = (value: number) => {
  if (!Number.isFinite(value)) return '$0';
  return `$${Math.round(value).toLocaleString('en-US')}`;
};

export default function SavingsTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { summary, savingsGoals, summaryLoading, refreshAppData } = useAppData();
  const { getSavingsGoals } = useSavings();
  const [refreshing, setRefreshing] = React.useState(false);
  const [goals, setGoals] = React.useState(savingsGoals || []);

  React.useEffect(() => {
    setGoals(savingsGoals || []);
  }, [savingsGoals]);

  const handleRefresh = React.useCallback(async () => {
    try {
      setRefreshing(true);
      await refreshAppData();
      const latest = await getSavingsGoals();
      setGoals(latest);
    } finally {
      setRefreshing(false);
    }
  }, [refreshAppData, getSavingsGoals]);

  const handleAddGoal = React.useCallback(() => {
    router.push('/savings-goal-modal');
  }, [router]);

  const handleEditGoal = React.useCallback(
    (goal: any) => {
      router.push({ pathname: '/savings-goal-modal', params: { goalId: goal.id } });
    },
    [router]
  );

  const handleFundGoal = React.useCallback(
    (goal: any) => {
      router.push({ pathname: '/savings-fund-modal', params: { goalId: goal.id } });
    },
    [router]
  );

  const totalGoals = goals.length;
  const totalPlanned = summary?.totalSavingsPlanned ?? 0;
  const totalProgress = summary?.totalSavingsProgress ?? 0;

  if (summaryLoading && !summary) {
    return (
      <ScrollView
        className="flex-1 bg-app-background"
        contentContainerClassName="px-5 pt-6 pb-24 space-y-5">
        <Skeleton className="h-48 rounded-3xl" />
        <Skeleton className="h-40 rounded-3xl" />
        <Skeleton className="h-56 rounded-3xl" />
      </ScrollView>
    );
  }

  return (
    <View className="flex-1 bg-app-background">
      <Stack.Screen
        options={{
          title: '',
          headerTransparent: true,
          headerShadowVisible: false,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.push('/profile')}
              accessibilityLabel="Open profile"
              className="ml-2 h-10 w-10 items-center justify-center rounded-full bg-app-surface shadow-xs">
              <Ionicons name="menu-outline" size={20} color="#0F172A" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View className="flex-row items-center gap-3 pr-3">
              <TouchableOpacity
                onPress={handleAddGoal}
                accessibilityLabel="Add savings goal"
                className="h-10 w-10 items-center justify-center rounded-full bg-primary-100">
                <Ionicons name="add" size={20} color="#0284C7" />
              </TouchableOpacity>
              <HeaderProfileButton />
            </View>
          ),
        }}
      />

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        contentContainerClassName="pb-28">
        <View className="px-5" style={{ paddingTop: Math.max(insets.top + 8, 32) }}>
          <View className="mb-6 rounded-3xl border border-app-border bg-app-surface px-6 py-7 shadow-md">
            <Text className="text-sm font-medium text-app-text-muted">Savings overview</Text>
            <Text className="mt-1 text-3xl font-semibold text-app-text">
              {formatAccentCurrency(totalProgress)}
            </Text>
            <Text className="mt-1 text-xs text-app-text-muted">
              {totalGoals > 0 ? `${totalGoals} active goal${totalGoals > 1 ? 's' : ''}` : 'No goals yet'}
            </Text>
            <View className="mt-6 flex-row items-center justify-between rounded-2xl bg-app-surface-alt px-4 py-3">
              <View>
                <Text className="text-xs font-medium text-app-text-secondary">Monthly plan</Text>
                <Text className="mt-1 text-lg font-semibold text-primary-700">
                  {formatAccentCurrency(totalPlanned)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleAddGoal}
                className="rounded-full bg-primary-500 px-4 py-2"
                accessibilityLabel="Create savings goal">
                <Text className="text-xs font-semibold text-white">Create goal</Text>
              </TouchableOpacity>
            </View>
          </View>

          <SavingsSummaryCard summary={summary ?? null} />

          {summaryLoading && goals.length === 0 ? (
            <View className="mt-10 items-center">
              <Text className="text-sm text-app-text-muted">Loading your savings goals…</Text>
            </View>
          ) : null}

          {!summaryLoading && goals.length === 0 ? (
            <View className="mt-10 items-center rounded-3xl border border-dashed border-app-border bg-app-surface px-6 py-8">
              <Text className="text-base font-semibold text-app-text">
                Set up your first savings goal
              </Text>
              <Text className="mt-2 text-center text-sm text-app-text-muted">
                Save toward upcoming purchases, emergencies, or long-term plans with monthly auto-funding.
              </Text>
              <TouchableOpacity
                className="mt-5 rounded-full bg-primary-500 px-6 py-3"
                onPress={handleAddGoal}
                accessibilityLabel="Create savings goal">
                <Text className="text-sm font-semibold text-white">Start a goal</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {goals.length > 0 ? (
            <View className="mt-5">
              <Button
                variant="secondary"
                className="w-full justify-center"
                onPress={handleAddGoal}
                title="New savings goal"
              />
            </View>
          ) : null}

          <View className="mt-5 space-y-4">
            {goals.map((goal) => (
              <SavingsGoalCard
                key={goal.id}
                goal={goal}
                onPressEdit={handleEditGoal}
                onPressFund={handleFundGoal}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
