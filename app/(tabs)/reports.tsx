import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import FAB from '@/components/FAB';
import HeaderProfileButton from '@/components/HeaderProfileButton';
import { Skeleton } from '@/components/Skeleton';
import { useAppData } from '../_layout';
import type { Transaction } from '@/context/DataContext';
import {
  IncomeCard,
  NetIncomeCard,
  SpendingTrendCard,
  CategoryBreakdownCard,
  BudgetPerformanceCard,
  MonthlySummaryCard,
} from '@/components/reports';

const formatAccentCurrency = (value: number) => {
  if (!Number.isFinite(value)) return '$0';
  return `$${Math.round(value).toLocaleString('en-US')}`;
};

export default function ReportsTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { summary, transactions, summaryLoading, refreshAppData } = useAppData();
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = React.useCallback(async () => {
    try {
      setRefreshing(true);
      await refreshAppData();
    } finally {
      setRefreshing(false);
    }
  }, [refreshAppData]);

  if (summaryLoading || !summary) {
    return (
      <ScrollView
        className="flex-1 bg-app-background"
        contentContainerClassName="px-5 pt-6 pb-24 space-y-5">
        <Skeleton className="h-48 rounded-3xl" />
        <Skeleton className="h-44 rounded-3xl" />
        <Skeleton className="h-60 rounded-3xl" />
      </ScrollView>
    );
  }

  const currentMonth = new Date().toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const totalIncome = summary.incomeBaseline || summary.totalIncome || 0;
  const totalExpenses = summary.totalExpenses || 0;
  const plannedSavings = summary.totalSavingsPlanned || 0;
  const actualIncome = summary.actualIncome || totalIncome;
  const netIncome = actualIncome - totalExpenses;
  const netIncomeAfterSavings = summary.netIncomeAfterSavings ?? netIncome - plannedSavings;
  const burnRate = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;

  const expensesByMonth =
    transactions
      ?.filter((t: Transaction) => t.type === 'expense')
      .reduce((acc: Record<string, number>, transaction: Transaction) => {
        const month = new Date(transaction.date).toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        });
        acc[month] = (acc[month] || 0) + parseFloat(transaction.amount);
        return acc;
      }, {}) || {};

  const monthlyData = Object.entries(expensesByMonth)
    .slice(-6)
    .map(([month, amount]) => ({ month, amount: amount as number }));

  return (
    <View className="flex-1 bg-app-background">
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        contentContainerClassName="pb-32">
        <View className="px-5" style={{ paddingTop: 12 }}>
          <View className="mb-6 rounded-3xl border border-app-border bg-app-surface px-6 py-7 shadow-md">
            <View className="flex-row items-start justify-between">
              <View className="max-w-[65%]">
                <Text className="text-sm font-medium text-app-text-muted">Spend analysis</Text>
                <Text className="mt-1 text-3xl font-semibold text-app-text">
                  {formatAccentCurrency(totalExpenses)}
                </Text>
                <Text className="mt-2 text-xs text-app-text-muted">{currentMonth}</Text>
              </View>
              <View className="items-end">
                <View className="rounded-full bg-error-100 px-3 py-1">
                  <Text className="text-xs font-semibold text-error-600">
                    {burnRate.toFixed(0)}% of income
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleRefresh}
                  className="mt-3 flex-row items-center rounded-full bg-app-surface-alt px-3 py-1"
                  accessibilityLabel="Refresh reports">
                  <Ionicons name="refresh-outline" size={14} color="#0EA5E9" />
                  <Text className="ml-1 text-xs font-semibold text-primary-600">Sync data</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View className="mt-6 flex-row justify-between">
              <View className="flex-1 rounded-2xl bg-primary-50 px-4 py-3">
                <Text className="text-xs font-medium text-primary-600">Income</Text>
                <Text className="mt-1 text-lg font-semibold text-primary-700">
                  {formatAccentCurrency(totalIncome)}
                </Text>
              </View>
              <View className="mx-3 flex-1 rounded-2xl bg-error-50 px-4 py-3">
                <Text className="text-xs font-medium text-error-600">Expenses</Text>
                <Text className="mt-1 text-lg font-semibold text-error-600">
                  {formatAccentCurrency(totalExpenses)}
                </Text>
              </View>
              <View className="flex-1 rounded-2xl bg-success-50 px-4 py-3">
                <Text className="text-xs font-medium text-success-600">Net</Text>
                <Text className="mt-1 text-lg font-semibold text-success-600">
                  {formatAccentCurrency(netIncomeAfterSavings)}
                </Text>
              </View>
            </View>
          </View>

          <View className="space-y-5">
            <IncomeCard totalIncome={totalIncome} currentMonth={currentMonth} />
            <NetIncomeCard
              netIncome={netIncome}
              netIncomeAfterSavings={netIncomeAfterSavings}
              plannedSavings={plannedSavings}
              currentMonth={currentMonth}
            />
            <SpendingTrendCard monthlyData={monthlyData} />
            <CategoryBreakdownCard
              categoryBreakdown={summary.categoryBreakdown}
              totalExpenses={summary.totalExpenses}
              incomeBaseline={summary.incomeBaseline}
            />
            <BudgetPerformanceCard
              totalBudget={summary.totalBudget}
              remainingBudget={summary.remainingBudget}
            />
            <MonthlySummaryCard
              transactions={transactions}
              totalExpenses={totalExpenses}
              categoryBreakdown={summary.categoryBreakdown}
              plannedSavings={plannedSavings}
            />
          </View>
        </View>
      </ScrollView>
      <FAB onPress={() => router.push('/add-transaction')} />
    </View>
  );
}
