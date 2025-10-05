import React from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HeaderProfileButton from '@/components/HeaderProfileButton';
import FAB from '@/components/FAB';
import { Skeleton } from '@/components/Skeleton';
import { useAppData } from '../_layout';
import { useMonthOverview } from '@/lib/useMonthOverview';
import type { Category, Transaction } from '@/context/DataContext';

const formatCurrency = (value: number) => {
  if (!Number.isFinite(value)) return '$0.00';
  const absolute = Math.abs(value);
  const formatted = absolute.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${value < 0 ? '-' : ''}$${formatted}`;
};

const formatAccentCurrency = (value: number) => {
  if (!Number.isFinite(value)) return '$0';
  const formatted = Math.round(value).toLocaleString('en-US');
  return `$${formatted}`;
};

const formatRelativeDate = (dateString: string) => {
  const input = new Date(dateString);
  if (Number.isNaN(input.getTime())) return dateString;
  const today = new Date();
  const diff = today.getTime() - input.getTime();
  const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return input.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function DashboardTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { summary, transactions, categories, summaryLoading, refreshAppData } = useAppData();
  const { openCurrentMonth } = useMonthOverview();
  const [refreshing, setRefreshing] = React.useState(false);

  React.useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  React.useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [summary, transactions]);

  const safeSummary = summary ?? null;
  const safeTransactions = React.useMemo(
    () => (Array.isArray(transactions) ? (transactions as Transaction[]) : []),
    [transactions]
  );
  const safeCategories = React.useMemo(
    () => (Array.isArray(categories) ? (categories as Category[]) : []),
    [categories]
  );

  const monthlyTrend = React.useMemo(() => {
    if (!safeTransactions.length) return [] as { label: string; value: number }[];
    const bucket = new Map<string, number>();
    safeTransactions
      .filter((tx) => tx.type === 'expense')
      .forEach((tx) => {
        const date = new Date(tx.date);
        if (Number.isNaN(date.getTime())) return;
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        const current = bucket.get(key) ?? 0;
        bucket.set(key, current + parseFloat(tx.amount));
      });
    return Array.from(bucket.entries())
      .sort((a, b) => {
        const [aYear, aMonth] = a[0].split('-').map(Number);
        const [bYear, bMonth] = b[0].split('-').map(Number);
        return aYear === bYear ? aMonth - bMonth : aYear - bYear;
      })
      .slice(-6)
      .map(([key, value]) => {
        const [year, month] = key.split('-').map(Number);
        const labelDate = new Date(year, month, 1);
        return {
          label: labelDate.toLocaleDateString('en-US', { month: 'short' }),
          value,
        };
      });
  }, [safeTransactions]);

  const topCategories = React.useMemo(() => {
    const breakdown = safeSummary?.categoryBreakdown ?? [];
    if (!Array.isArray(breakdown)) return [] as CategoryBreakdownCardItem[];
    return [...breakdown]
      .sort((a: any, b: any) => (b.spent ?? 0) - (a.spent ?? 0))
      .slice(0, 4)
      .map((item: any) => ({
        id: item.id,
        name: item.name,
        spent: item.spent ?? 0,
        budget: item.budget ?? 0,
        icon: item.icon ?? '💡',
        color: item.color ?? '#0EA5E9',
      }));
  }, [safeSummary]);

  const recentTransactions = React.useMemo(() => {
    if (Array.isArray(safeSummary?.recentTransactions) && safeSummary?.recentTransactions.length) {
      return safeSummary.recentTransactions as Transaction[];
    }
    return safeTransactions.slice(0, 8);
  }, [safeSummary, safeTransactions]);

  const maxTrendValue = React.useMemo(() => {
    if (!monthlyTrend.length) return 0;
    return Math.max(...monthlyTrend.map((point) => point.value));
  }, [monthlyTrend]);

  const handleRefresh = React.useCallback(async () => {
    try {
      setRefreshing(true);
      await refreshAppData();
    } finally {
      setRefreshing(false);
    }
  }, [refreshAppData]);

  if (summaryLoading || !safeSummary) {
    return (
      <ScrollView
        className="flex-1 bg-app-background"
        contentContainerClassName="px-5 pt-6 pb-20 space-y-4">
        <Skeleton className="h-52 rounded-3xl" />
        <Skeleton className="h-32 rounded-3xl" />
        <Skeleton className="h-44 rounded-3xl" />
        <Skeleton className="h-60 rounded-3xl" />
      </ScrollView>
    );
  }

  const mainBalance = safeSummary.incomeRemaining ?? safeSummary.totalIncome ?? 0;
  const monthlyIncome = safeSummary.incomeBaseline ?? 0;
  const totalSpent = safeSummary.totalExpenses ?? 0;
  const plannedSavings = safeSummary.totalSavingsPlanned ?? 0;
  const progressSavings = safeSummary.totalSavingsProgress ?? 0;

  return (
    <View className="flex-1 bg-app-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-32"
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        <View className="px-5" style={{ paddingTop: Math.max(insets.top + 8, 32) }}>
          <TouchableOpacity
            onPress={openCurrentMonth}
            className="mb-6 rounded-3xl border border-app-border bg-app-surface px-6 py-7 shadow-md">
            <View className="flex-row items-start justify-between">
              <View>
                <Text className="text-sm font-medium text-app-text-muted">Available balance</Text>
                <Text className="mt-1 text-4xl font-semibold text-app-text">
                  {formatAccentCurrency(mainBalance)}
                </Text>
              </View>
              <View className="items-end">
                <View className="rounded-full bg-primary-100 px-3 py-1">
                  <Text className="text-xs font-medium text-primary-700">
                    {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </Text>
                </View>
                <View className="mt-2 flex-row items-center rounded-full bg-app-surface-alt px-2 py-1">
                  <Text className="mr-1 text-xs font-medium text-primary-600">View details</Text>
                  <Ionicons name="chevron-forward" size={12} color="#0EA5E9" />
                </View>
              </View>
            </View>
            <View className="mt-6 flex-row justify-between">
              <View className="flex-1 rounded-2xl bg-primary-50 px-4 py-3">
                <Text className="text-xs font-medium text-primary-600">Monthly income</Text>
                <Text className="mt-1 text-lg font-semibold text-primary-700">
                  {formatAccentCurrency(monthlyIncome)}
                </Text>
              </View>
              <View className="mx-3 h-14 w-px bg-border-muted" />
              <View className="flex-1 rounded-2xl bg-error-50 px-4 py-3">
                <Text className="text-xs font-medium text-error-600">Spent so far</Text>
                <Text className="mt-1 text-lg font-semibold text-error-600">
                  {formatAccentCurrency(totalSpent)}
                </Text>
              </View>
            </View>
            <View className="mt-6 flex-row items-center justify-between rounded-2xl bg-app-surface-alt px-4 py-3">
              <View>
                <Text className="text-xs font-medium text-app-text-secondary">
                  Savings progress
                </Text>
                <Text className="mt-1 text-lg font-semibold text-success-600">
                  {formatAccentCurrency(progressSavings)}
                  <Text className="text-xs font-medium text-app-text-muted">
                    {' '}
                    / {formatAccentCurrency(plannedSavings)}
                  </Text>
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/savings-goal-modal')}
                className="rounded-full bg-success-100 px-4 py-2">
                <Text className="text-xs font-semibold text-success-700">Boost savings</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>

          <View className="mb-6 rounded-3xl border border-app-border bg-app-surface px-5 py-6 shadow-sm">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-app-text">Spending trend</Text>
              <TouchableOpacity
                onPress={openCurrentMonth}
                className="flex-row items-center rounded-full bg-app-surface-alt px-3 py-1">
                <Ionicons name="trending-up-outline" size={16} color="#0EA5E9" />
                <Text className="ml-2 text-xs font-semibold text-primary-600">See details</Text>
              </TouchableOpacity>
            </View>
            {monthlyTrend.length === 0 ? (
              <View className="mt-8 h-32 items-center justify-center rounded-2xl border border-dashed border-app-border bg-app-surface-alt">
                <Text className="text-sm font-medium text-app-text-muted">Chart coming soon</Text>
                <Text className="mt-1 text-xs text-app-text-muted">
                  Bring insights online to unlock dynamic visuals.
                </Text>
              </View>
            ) : (
              <View className="mt-8 h-40 flex-row items-end justify-between">
                {monthlyTrend.map((point) => {
                  const height =
                    maxTrendValue > 0 ? Math.max(12, (point.value / maxTrendValue) * 120) : 12;
                  return (
                    <View key={point.label} className="flex-1 items-center">
                      <View
                        className="w-9 rounded-2xl"
                        style={{ height, backgroundColor: 'rgba(14,165,233,0.9)' }}
                      />
                      <Text className="mt-3 text-xs font-medium text-app-text-muted">
                        {point.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          <View className="mb-6">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-base font-semibold text-app-text">Focus categories</Text>
              <TouchableOpacity
                onPress={() => router.push('/categories')}
                className="rounded-full bg-app-surface-alt px-3 py-1">
                <Text className="text-xs font-semibold text-primary-600">Manage</Text>
              </TouchableOpacity>
            </View>
            <View className="flex-row flex-wrap gap-3">
              {topCategories.length === 0 ? (
                <View className="w-full rounded-3xl border border-dashed border-app-border bg-app-surface px-6 py-8">
                  <Text className="text-sm font-medium text-app-text-muted">
                    Assign categories to see where your money is going.
                  </Text>
                </View>
              ) : (
                topCategories.map((category) => {
                  const budget = Number.isFinite(category.budget) ? category.budget : 0;
                  const spent = Number.isFinite(category.spent) ? category.spent : 0;
                  const progress = budget > 0 ? Math.min(spent / budget, 1) : 0;
                  return (
                    <TouchableOpacity
                      key={category.id}
                      onPress={() => router.push('/categories')}
                      style={{
                        flexBasis: '48%',
                        minHeight: 140,
                        backgroundColor: `${category.color}1A`,
                      }}
                      className="rounded-3xl border border-transparent px-5 py-5 shadow-sm">
                      <Text className="text-2xl">{category.icon}</Text>
                      <Text className="mt-3 text-sm font-semibold text-app-text">
                        {category.name}
                      </Text>
                      <Text className="text-xs font-medium text-app-text-muted">
                        {formatAccentCurrency(spent)} spent
                      </Text>
                      <View className="mt-3 h-2 w-full rounded-full bg-app-surface-alt">
                        <View
                          className="h-2 rounded-full bg-app-text"
                          style={{ width: `${progress * 100}%` }}
                        />
                      </View>
                      <Text className="mt-1 text-[11px] text-app-text-muted">
                        {budget > 0
                          ? `${Math.round(progress * 100)}% of $${budget.toLocaleString()}`
                          : 'No budget set'}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </View>

          <View className="mb-10 rounded-3xl border border-app-border bg-app-surface px-5 py-6 shadow-sm">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-app-text">Latest transactions</Text>
              <TouchableOpacity
                onPress={() => router.push('/transactions-modal')}
                className="flex-row items-center rounded-full bg-app-surface-alt px-3 py-1">
                <Text className="mr-1 text-xs font-semibold text-primary-600">See all</Text>
                <Ionicons name="chevron-forward" size={14} color="#0EA5E9" />
              </TouchableOpacity>
            </View>
            {recentTransactions.length === 0 ? (
              <View className="mt-8 items-center justify-center rounded-2xl border border-dashed border-app-border bg-app-surface-alt px-4 py-8">
                <Ionicons name="trail-sign-outline" size={24} color="#9CA3AF" />
                <Text className="mt-3 text-sm font-medium text-app-text-muted">
                  No transactions yet
                </Text>
                <Text className="mt-1 text-xs text-app-text-muted">
                  Start tracking by adding your first transaction.
                </Text>
              </View>
            ) : (
              <View className="mt-6 space-y-3">
                {recentTransactions.map((transaction) => {
                  const categoryMeta = safeCategories.find(
                    (cat) => cat.id === transaction.categoryId
                  );
                  const isExpense = transaction.type === 'expense';
                  return (
                    <TouchableOpacity
                      key={transaction.id}
                      onPress={() =>
                        router.push({
                          pathname: '/transactions-modal',
                          params: { highlightId: transaction.id },
                        })
                      }
                      className="flex-row items-center justify-between rounded-2xl bg-app-surface-alt px-4 py-4">
                      <View className="flex-row items-center">
                        <View className="mr-4 h-12 w-12 items-center justify-center rounded-2xl bg-app-surface shadow-xs">
                          <Text className="text-xl">
                            {categoryMeta?.icon ?? (isExpense ? '🧾' : '💰')}
                          </Text>
                        </View>
                        <View>
                          <Text className="text-sm font-semibold text-app-text">
                            {transaction.description}
                          </Text>
                          <Text className="mt-1 text-xs text-app-text-muted">
                            {categoryMeta?.name ?? 'Uncategorized'} ·{' '}
                            {formatRelativeDate(transaction.date)}
                          </Text>
                        </View>
                      </View>
                      <Text
                        className={`text-sm font-semibold ${isExpense ? 'text-error-600' : 'text-success-600'}`}>
                        {formatCurrency(parseFloat(transaction.amount))}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
      <FAB onPress={() => router.push('/add-transaction')} />
    </View>
  );
}

type CategoryBreakdownCardItem = {
  id: number;
  name: string;
  icon: string;
  color: string;
  budget: number;
  spent: number;
};
