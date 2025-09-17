import { Card, CardContent } from '../../components/Card';
import { Ionicons } from '@expo/vector-icons';
import { useAppData } from '../_layout';
import BankAccountsCard from '../../components/BankAccountsCard';
import CategoryStatsCard from '../../components/CategoryStatsCard';
import { Skeleton } from '../../components/Skeleton';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  LayoutAnimation,
  UIManager,
  RefreshControl,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import HeaderProfileButton from '@/components/HeaderProfileButton';
import FAB from '@/components/FAB';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Transaction } from '@/lib/schema/schema';
import {
  BudgetPerformanceCard,
  CategoryBreakdownCard,
  MonthlySummaryCard,
  SpendingTrendCard,
} from '@/components/reports';

export default function SpendingTab() {
  const { summary, transactions, summaryLoading, categories, refreshAppData } = useAppData();
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);
  const [showSeeAll, setShowSeeAll] = React.useState(false);
  const [period, setPeriod] = React.useState<'this' | 'last'>('this');
  const insets = useSafeAreaInsets();

  // Enable LayoutAnimation on Android
  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  React.useEffect(() => {
    // Soft animate whenever summary or transactions update
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [summary, transactions]);

  // Add a quick-access header action to open all transactions
  React.useEffect(() => {
    // Set per-screen header buttons (list icon + profile)
    // Keep this minimal to preserve space and native feel
    // Note: HeaderProfileButton is still available globally; we include it here too
  }, []);

  // Derive period-based summary from local transactions + categories
  const displaySummary = React.useMemo(() => {
    if (!Array.isArray(transactions) || !Array.isArray(categories)) {
      return summary;
    }
    const now = new Date();
    const target = new Date(now);
    if (period === 'last') {
      target.setMonth(target.getMonth() - 1);
    }
    const targetMonth = target.getMonth();
    const targetYear = target.getFullYear();

    const inPeriod = transactions.filter((t: any) => {
      const d = new Date(t.date);
      return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    });

    const periodIncome = inPeriod
      .filter((t: any) => t.type === 'income')
      .reduce((s: number, t: any) => s + parseFloat(t.amount), 0);
    const periodExpenses = inPeriod
      .filter((t: any) => t.type === 'expense')
      .reduce((s: number, t: any) => s + parseFloat(t.amount), 0);
    const totalBudget = categories.reduce((s: number, c: any) => s + parseFloat(c.budget), 0);
    const remainingBudget = totalBudget - periodExpenses;
    const totalSavingsPlanned = summary?.totalSavingsPlanned ?? 0;
    const totalSavingsProgress = summary?.totalSavingsProgress ?? 0;
    const netIncomeAfterSavings = (summary?.incomeBaseline ?? periodIncome) - totalSavingsPlanned;
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
    return {
      ...summary,
      periodIncome,
      periodExpenses,
      totalBudget,
      remainingBudget,
      totalSavingsPlanned,
      totalSavingsProgress,
      netIncomeAfterSavings,
      monthlyData,
    } as any;
  }, [transactions, categories, period, summary]);

  const budgetPercentage =
    displaySummary.totalBudget > 0
      ? ((displaySummary.totalBudget - displaySummary.remainingBudget) /
          displaySummary.totalBudget) *
        100
      : 0;

  const incomeBaseline = displaySummary?.incomeBaseline ?? displaySummary?.totalIncome ?? 0;
  const periodExpenses = displaySummary?.periodExpenses ?? displaySummary?.totalExpenses ?? 0;
  const incomeRemaining = displaySummary?.incomeRemaining ?? incomeBaseline - periodExpenses;
  const periodIncome = displaySummary?.periodIncome ?? displaySummary?.actualIncome ?? 0;
  const incomePressureCategories = React.useMemo(() => {
    const breakdown = displaySummary?.categoryBreakdown;
    if (!Array.isArray(breakdown)) return [] as any[];
    if (!incomeBaseline || incomeBaseline <= 0) return [] as any[];
    return breakdown
      .filter((cat: any) => Boolean(cat?.incomeWarning) && (cat?.incomeShare ?? 0) > 0)
      .sort((a: any, b: any) => (b?.incomeShare ?? 0) - (a?.incomeShare ?? 0))
      .slice(0, 3);
  }, [displaySummary, incomeBaseline]);

  // Show loading state while data is loading (must be after all hooks)
  if (summaryLoading || !summary) {
    return (
      <ScrollView className="content-padding">
        <View className="overview-grid">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </View>
        <View className="space-y-4">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </View>
      </ScrollView>
    );
  }

  // Ensure we have arrays to work with
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeCategories = Array.isArray(categories) ? categories : [];

  const getTransactionIcon = (type: string, categoryId: number | null) => {
    if (type === 'income') {
      return { icon: '💰', color: '#2ECC71' };
    }

    const category = safeCategories.find((c: any) => c.id === categoryId);
    return {
      icon: category?.icon || '🛒',
      color: category?.color || '#6B7280',
    };
  };

  const getCategoryName = (categoryId: number | null) => {
    if (!categoryId) return 'Uncategorized';
    const category = safeCategories.find((c: any) => c.id === categoryId);
    return category?.name || 'Unknown';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <View className="relative flex-1 bg-app-background">
      <Stack.Screen
        options={{
          headerRight: () => (
            <View className="flex-row items-center pr-2">
              <TouchableOpacity
                onPress={() => router.push('/transactions-modal')}
                accessibilityLabel="View all transactions"
                className="mr-2 h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: '#00000010' }}>
                <Ionicons name="receipt-outline" size={18} color="#374151" />
              </TouchableOpacity>
              <HeaderProfileButton />
            </View>
          ),
        }}
      />
      {/* Hero gradient-like header band */}
      <View className="px-4 pt-3" style={{ overflow: 'hidden' }}>
        <View
          className="rounded-2xl border border-info-100 bg-info-50 px-4 py-4"
          style={{ overflow: 'hidden' }}>
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-info-800">Overview</Text>
            <TouchableOpacity
              onPress={() => router.push('/transactions-modal')}
              className="h-8 items-center justify-center rounded-full border border-info-100 bg-white/70 px-3">
              <Text className="text-xs font-medium text-info-700">All Transactions</Text>
            </TouchableOpacity>
          </View>
          {/* Period selector */}
          <View className="mt-3 flex-row gap-2">
            {(
              [
                { key: 'this', label: 'This Month' },
                { key: 'last', label: 'Last Month' },
              ] as const
            ).map((opt) => (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setPeriod(opt.key)}
                className={`rounded-full border px-3 py-1 ${
                  period === opt.key ? 'border-blue-600 bg-blue-600' : 'border-info-100 bg-white/70'
                }`}>
                <Text
                  className={`text-xs font-medium ${
                    period === opt.key ? 'text-white' : 'text-info-700'
                  }`}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View className="mt-3 rounded-xl bg-white/40 px-3 py-3 dark:bg-white/5">
            <View className="flex-row justify-between">
              <View className="mr-2 flex-1 rounded-lg border border-info-100/60 bg-white/70 px-3 py-2">
                <Text className="text-[11px] text-info-700 dark:text-info-300">Income Baseline</Text>
                <Text className="text-base font-semibold text-success-700 dark:text-success-400">
                  ${incomeBaseline.toFixed(0)}
                </Text>
                <Text className="text-[11px] text-info-600 dark:text-info-300">
                  Actual this month: ${periodIncome.toFixed(0)}
                </Text>
              </View>
              <View className="mr-2 flex-1 rounded-lg border border-info-100/60 bg-white/70 px-3 py-2">
                <Text className="text-[11px] text-info-700 dark:text-info-300">Expenses</Text>
                <Text className="text-base font-semibold text-error-700 dark:text-error-400">
                  ${periodExpenses.toFixed(0)}
                </Text>
              </View>
              <View className="flex-1 rounded-lg border border-info-100/60 bg-white/70 px-3 py-2">
                <Text className="text-[11px] text-info-700 dark:text-info-300">Income Left</Text>
                <Text className="text-base font-semibold text-info-800 dark:text-info-300">
                  ${incomeRemaining.toFixed(0)}
                </Text>
              </View>
            </View>
            {/* Tiny progress bar showing budget used */}
            <View className="mt-3 h-1.5 w-full rounded-full bg-info-100">
              <View
                className="h-1.5 rounded-full"
                style={{
                  width: `${Math.min(
                    displaySummary.totalBudget > 0
                      ? (periodExpenses / displaySummary.totalBudget) * 100
                      : 0,
                    100
                  )}%`,
                  backgroundColor:
                    displaySummary.totalBudget > 0 &&
                    periodExpenses / displaySummary.totalBudget >= 0.9
                      ? '#EF4444'
                      : displaySummary.totalBudget > 0 && periodExpenses / displaySummary.totalBudget >= 0.7
                        ? '#F59E0B'
                        : '#0EA5E9',
                }}
              />
            </View>
            <View className="mt-3 flex-row gap-2">
              <View className="flex-1 rounded-lg border border-info-100/60 bg-white/70 px-3 py-2">
                <Text className="text-[11px] text-info-700 dark:text-info-300">Savings Plan</Text>
                <Text className="text-base font-semibold text-info-800 dark:text-info-300">
                  ${displaySummary.totalSavingsPlanned.toFixed(0)} / mo
                </Text>
              </View>
              <View className="flex-1 rounded-lg border border-info-100/60 bg-white/70 px-3 py-2">
                <Text className="text-[11px] text-info-700 dark:text-info-300">Net After Savings</Text>
                <Text className="text-base font-semibold text-success-700 dark:text-success-400">
                  ${displaySummary.netIncomeAfterSavings.toFixed(0)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        className="content-padding"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              try {
                setRefreshing(true);
                await refreshAppData();
              } finally {
                setRefreshing(false);
              }
            }}
          />
        }
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          if (y > 180 && !showSeeAll) setShowSeeAll(true);
          else if (y <= 180 && showSeeAll) setShowSeeAll(false);
        }}
        scrollEventThrottle={16}>
        {/* Overview Cards */}
        <View className="flex-row gap-3 py-4">
          <Card className="card-mobile flex-1 border-info-100 bg-info-50">
            <CardContent className="p-3">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-xs font-medium text-info-700">Monthly Budget</Text>
                <Ionicons name="wallet-outline" size={16} color="#0EA5E9" />
              </View>
              <View className="space-y-1">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-semibold text-info-800">
                    ${(displaySummary.totalBudget - displaySummary.remainingBudget).toFixed(0)}
                  </Text>
                  <Text className="text-[11px] text-info-600">
                    of ${displaySummary.totalBudget.toFixed(0)}
                  </Text>
                </View>
                <View className="h-1.5 w-full rounded-full bg-info-100">
                  <View
                    className="progress-bar h-1.5 rounded-full"
                    style={{
                      width: `${Math.min(budgetPercentage, 100)}%`,
                      backgroundColor:
                        budgetPercentage >= 90
                          ? '#EF4444'
                          : budgetPercentage >= 70
                            ? '#F59E0B'
                            : '#0EA5E9',
                    }}
                  />
                </View>
                <Text className="text-[11px] text-info-700">
                  ${displaySummary.remainingBudget.toFixed(0)} remaining
                </Text>
              </View>
            </CardContent>
          </Card>

          <Card className="card-mobile flex-1 border-error-100 bg-error-50">
            <CardContent className="p-3">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-xs font-medium text-error-700">Total Spending</Text>
                <Ionicons name="trending-down-outline" size={16} color="#EF4444" />
              </View>
              <View className="space-y-1">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-semibold text-error-700">
                    ${periodExpenses.toFixed(0)}
                  </Text>
                  <Text
                    className={`text-[11px] ${budgetPercentage < 90 ? 'text-success-700' : 'text-error-700'}`}>
                    {budgetPercentage < 90 ? '↓ On track' : '↑ Over budget'}
                  </Text>
                </View>
                <Text className="text-[11px] text-error-700">
                  {budgetPercentage.toFixed(0)}% of budget used
                </Text>
              </View>
            </CardContent>
          </Card>
        </View>

        <SpendingTrendCard monthlyData={displaySummary.monthlyData} />

        {incomePressureCategories.length > 0 && (
          <Card className="card-mobile mb-6 border-warning-200 bg-warning-50">
            <CardContent className="p-4">
              <Text className="mb-2 text-sm font-semibold text-warning-700">Spending Flags</Text>
              {incomePressureCategories.map((cat: any) => (
                <View key={cat.id} className="mb-2 flex-row items-center justify-between">
                  <View>
                    <Text className="text-sm font-medium text-warning-800">{cat.name}</Text>
                    <Text className="text-xs text-warning-700">
                      {((cat?.incomeShare ?? 0) * 100).toFixed(1)}% of income · ${cat.spent.toFixed(0)}
                    </Text>
                  </View>
                  <Ionicons name="warning-outline" size={18} color="#B45309" />
                </View>
              ))}
              <Text className="mt-2 text-xs text-warning-700">
                Aim to keep any single category under 25% of your monthly income.
              </Text>
            </CardContent>
          </Card>
        )}

        <CategoryBreakdownCard
          categoryBreakdown={displaySummary.categoryBreakdown}
          totalExpenses={periodExpenses}
          incomeBaseline={incomeBaseline}
        />

        {/* Budget Performance */}
        <BudgetPerformanceCard
          totalBudget={displaySummary.totalBudget}
          remainingBudget={displaySummary.remainingBudget}
        />

        {/* Report Summary */}
        <MonthlySummaryCard
          transactions={transactions}
          totalExpenses={periodExpenses}
          categoryBreakdown={displaySummary.categoryBreakdown}
          plannedSavings={displaySummary.totalSavingsPlanned}
        />
        {/* Bank Accounts */}
        <BankAccountsCard />
      </ScrollView>
      {/* Sticky "See All" chip */}
      {showSeeAll && safeTransactions.length > 0 && (
        <View
          pointerEvents="box-none"
          style={{ position: 'absolute', left: 16, bottom: Math.max(insets.bottom, 12) + 98 }}>
          <TouchableOpacity
            onPress={() => router.push('/transactions-modal')}
            activeOpacity={0.85}
            className="flex-row items-center rounded-full border border-app-border bg-app-surface px-3 py-2 shadow-xs">
            <Ionicons name="list-circle-outline" size={18} color="#374151" />
            <Text className="ml-2 text-sm font-medium text-app-text">
              See All ({safeTransactions.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}
      <FAB onPress={() => router.push('/add-transaction')} />
    </View>
  );
}
