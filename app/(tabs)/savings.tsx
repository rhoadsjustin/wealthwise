import React from 'react';
import { ScrollView, View, Text, RefreshControl, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import HeaderProfileButton from '@/components/HeaderProfileButton';
import { SavingsSummaryCard } from '@/components/SavingsSummaryCard';
import { SavingsGoalCard } from '@/components/SavingsGoalCard';
import { Button } from '@/components/Button';
import { Skeleton } from '@/components/Skeleton';
import { useSummaryData } from '../_layout';
import type { SavingsGoal } from '@/context/DataContext';

const formatAccentCurrency = (value: number) => {
  if (!Number.isFinite(value)) return '$0';
  return `$${Math.round(value).toLocaleString('en-US')}`;
};

export default function SavingsTab() {
  const router = useRouter();
  const { summary, savingsGoals, savingsAccounts, summaryLoading, refreshSummaryData } =
    useSummaryData();
  const [refreshing, setRefreshing] = React.useState(false);
  const goals = savingsGoals ?? [];

  const handleRefresh = React.useCallback(async () => {
    try {
      setRefreshing(true);
      await refreshSummaryData();
    } finally {
      setRefreshing(false);
    }
  }, [refreshSummaryData]);

  const handleAddGoal = React.useCallback(() => {
    router.push('/savings-goal-modal');
  }, [router]);

  const handleEditGoal = React.useCallback(
    (goal: SavingsGoal) => {
      router.push({ pathname: '/savings-goal-modal', params: { goalId: goal.id } });
    },
    [router]
  );

  const handleFundGoal = React.useCallback(
    (goal: SavingsGoal) => {
      router.push({ pathname: '/savings-fund-modal', params: { goalId: goal.id } });
    },
    [router]
  );

  const totalGoals = goals.length;
  const totalPlanned = summary?.totalSavingsPlanned ?? 0;
  const totalProgress = summary?.totalSavingsProgress ?? 0;
  const totalSavingsBalance = summary?.totalSavingsBalance ?? 0;

  if (summaryLoading && !summary) {
    return (
      <ScrollView
        className="flex-1 bg-app-canvas"
        contentContainerClassName="px-5 pt-6 pb-24 space-y-5">
        <Skeleton className="h-48 rounded-3xl" />
        <Skeleton className="h-40 rounded-3xl" />
        <Skeleton className="h-56 rounded-3xl" />
      </ScrollView>
    );
  }

  return (
    <View className="flex-1 bg-app-canvas">
      <Stack.Screen
        options={{
          title: '',
          headerTransparent: true,
          headerShadowVisible: false,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.push('/profile')}
              accessibilityLabel="Open profile"
              className="ml-2 h-10 w-10 items-center justify-center rounded-full bg-app-surface-2 shadow-xs">
              <Ionicons name="menu-outline" size={20} color="#C8D3EA" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View className="flex-row items-center gap-3 pr-3">
              <TouchableOpacity
                onPress={handleAddGoal}
                accessibilityLabel="Add savings goal"
                className="h-10 w-10 items-center justify-center rounded-full bg-info-500/15">
                <Ionicons name="add" size={20} color="#58B6FF" />
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
        <View className="px-5" style={{ paddingTop: 12 }}>
          <View className="mb-6 rounded-3xl border border-app-border-strong bg-app-surface-1 px-6 py-7 shadow-md">
            <Text className="text-sm font-medium text-app-text-faint">Savings overview</Text>
            <Text className="mt-1 text-3xl font-semibold text-app-text-strong">
              {formatAccentCurrency(totalSavingsBalance || totalProgress)}
            </Text>
            <Text className="mt-1 text-xs text-app-text-faint">
              {(savingsAccounts ?? []).length > 0
                ? `${(savingsAccounts ?? []).length} manual account${
                    (savingsAccounts ?? []).length > 1 ? 's' : ''
                  }`
                : totalGoals > 0
                  ? `${totalGoals} active goal${totalGoals > 1 ? 's' : ''}`
                  : 'No goals yet'}
            </Text>
            <View className="mt-6 flex-row items-center justify-between rounded-2xl bg-app-surface-2 px-4 py-3">
              <View>
                <Text className="text-xs font-medium text-app-text-faint">Monthly plan</Text>
                <Text className="mt-1 text-lg font-semibold text-accent-savings">
                  {formatAccentCurrency(totalPlanned)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleAddGoal}
                className="rounded-full bg-info-500/20 px-4 py-2"
                accessibilityLabel="Create savings goal">
                <Text className="text-xs font-semibold text-accent-savings">Create goal</Text>
              </TouchableOpacity>
            </View>
          </View>

          <SavingsSummaryCard summary={summary ?? null} />

          {summaryLoading && goals.length === 0 ? (
            <View className="mt-10 items-center">
              <Text className="text-sm text-app-text-faint">Loading your savings goals...</Text>
            </View>
          ) : null}

          {!summaryLoading && goals.length === 0 ? (
            <View className="mt-10 items-center rounded-3xl border border-dashed border-app-border-strong bg-app-surface-1 px-6 py-8">
              <Text className="text-base font-semibold text-app-text-strong">
                Set up your first savings goal
              </Text>
              <Text className="mt-2 text-center text-sm text-app-text-faint">
                Save toward upcoming purchases, emergencies, or long-term plans with monthly
                auto-funding.
              </Text>
              <TouchableOpacity
                className="mt-5 rounded-full bg-info-500/20 px-6 py-3"
                onPress={handleAddGoal}
                accessibilityLabel="Create savings goal">
                <Text className="text-sm font-semibold text-accent-savings">Start a goal</Text>
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
