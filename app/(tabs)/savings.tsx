import React from 'react';
import { ScrollView, View, Text, RefreshControl, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppData } from '../_layout';
import { SavingsSummaryCard } from '@/components/SavingsSummaryCard';
import { SavingsGoalCard } from '@/components/SavingsGoalCard';
import { useSavings } from '@/context/DataContext';
import { Button } from '@/components/Button';

export default function SavingsTab() {
  const router = useRouter();
  const { summary, savingsGoals, summaryLoading, refreshAppData } = useAppData();
  const { getSavingsGoals } = useSavings();
  const [refreshing, setRefreshing] = React.useState(false);
  const [goals, setGoals] = React.useState(savingsGoals || []);
  const hasGoals = goals.length > 0;

  React.useEffect(() => {
    setGoals(savingsGoals || []);
  }, [savingsGoals]);

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshAppData();
      const latest = await getSavingsGoals();
      setGoals(latest);
    } finally {
      setRefreshing(false);
    }
  }, [refreshAppData, getSavingsGoals]);

  const handleAddGoal = () => {
    router.push('/savings-goal-modal');
  };

  const handleEditGoal = (goal: any) => {
    router.push({ pathname: '/savings-goal-modal', params: { goalId: goal.id } });
  };

  const handleFundGoal = (goal: any) => {
    router.push({ pathname: '/savings-fund-modal', params: { goalId: goal.id } });
  };

  return (
    <View className="flex-1 bg-app-background">
      <Stack.Screen
        options={{
          title: 'Savings',
          headerRight: () => (
            <TouchableOpacity
              onPress={handleAddGoal}
              className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-primary-100"
              accessibilityLabel="Add savings goal">
              <Ionicons name="add" size={20} color="#0284C7" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        className="flex-1 px-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        <View className="py-4">
          <SavingsSummaryCard summary={summary} />

          {summaryLoading && goals.length === 0 ? (
            <View className="mt-10 items-center">
              <Text className="text-sm text-foreground-muted">Loading your savings goals…</Text>
            </View>
          ) : null}

          {!summaryLoading && !hasGoals ? (
            <View className="mt-10 items-center rounded-2xl border border-dashed border-border-default bg-app-surface p-6">
              <Text className="text-base font-semibold text-foreground-primary">
                Set up your first savings goal
              </Text>
              <Text className="mt-2 text-center text-sm text-foreground-muted">
                Set aside part of your income for upcoming purchases, emergencies, or long-term plans.
              </Text>
              <TouchableOpacity
                className="mt-4 rounded-full bg-primary-500 px-5 py-3"
                onPress={handleAddGoal}
                accessibilityLabel="Create savings goal">
                <Text className="text-sm font-semibold text-foreground-inverse">Create a goal</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {hasGoals ? (
            <View className="mt-4">
              <Button
                variant="secondary"
                className="w-full justify-center"
                onPress={handleAddGoal}
                title="Create savings goal"
              />
            </View>
          ) : null}

          <View className="mt-4">
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
