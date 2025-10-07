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
import { PieChart } from 'react-native-gifted-charts';

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
    if (!safeTransactions.length || !safeSummary) return null;
    
    // Use the baseline income from summary (which uses monthlyIncome if set, or actual income as fallback)
    const baselineIncome = safeSummary.incomeBaseline || 0;
    
    if (baselineIncome <= 0) return null;
    
    // Calculate current month totals
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    let totalExpenses = 0;
    let totalSavings = 0;
    let totalBills = 0;
    let totalDebt = 0;
    
    safeTransactions.forEach((tx) => {
      const date = new Date(tx.date);
      if (Number.isNaN(date.getTime())) return;
      
      // Only include current month transactions
      if (date.getFullYear() === currentYear && date.getMonth() === currentMonth) {
        if (tx.type === 'expense') {
          const amount = parseFloat(tx.amount);
          const description = tx.description.toLowerCase();
          
          // Categorize expenses
          if (description.includes('savings') || 
              description.includes('investment') ||
              description.includes('emergency fund') ||
              description.includes('401k') ||
              description.includes('ira')) {
            totalSavings += amount;
          } else if (description.includes('rent') || 
                     description.includes('mortgage') ||
                     description.includes('utility') ||
                     description.includes('electric') ||
                     description.includes('gas bill') ||
                     description.includes('water') ||
                     description.includes('internet') ||
                     description.includes('phone bill')) {
            totalBills += amount;
          } else if (description.includes('loan') || 
                     description.includes('credit card') ||
                     description.includes('debt') ||
                     description.includes('payment')) {
            totalDebt += amount;
          } else {
            totalExpenses += amount;
          }
        }
      }
    });
    
    // Calculate remaining income after all allocations
    const totalAllocated = totalExpenses + totalSavings + totalBills + totalDebt;
    const remainingIncome = Math.max(0, baselineIncome - totalAllocated);
    
    return {
      totalIncome: baselineIncome, // Use baseline income (monthly income setting)
      categories: [
        { name: 'Available', value: remainingIncome, color: '#10B981', icon: '💰' },
        { name: 'Expenses', value: totalExpenses, color: '#EF4444', icon: '🛒' },
        { name: 'Savings', value: totalSavings, color: '#0EA5E9', icon: '🏦' },
        { name: 'Bills', value: totalBills, color: '#F59E0B', icon: '🧾' },
        { name: 'Debt', value: totalDebt, color: '#8B5CF6', icon: '💳' },
      ].filter(cat => cat.value > 0), // Only show categories with values
    };
  }, [safeTransactions, safeSummary]);

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
    if (!monthlyTrend?.totalIncome) return 0;
    return monthlyTrend.totalIncome;
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
            {!monthlyTrend || monthlyTrend.categories.length === 0 ? (
              <View className="mt-8 h-32 items-center justify-center rounded-2xl border border-dashed border-app-border bg-app-surface-alt">
                <Ionicons name="analytics-outline" size={32} color="#9CA3AF" />
                <Text className="mt-3 text-sm font-medium text-app-text-muted">No data yet</Text>
                <Text className="mt-1 text-xs text-app-text-muted">
                  Add transactions to see your financial breakdown
                </Text>
              </View>
            ) : (
              <View className="mt-8">
                {/* Pie Chart */}
                <View className="items-center">
                  <PieChart
                    data={monthlyTrend.categories.map((category) => {
                      const percentage = monthlyTrend.totalIncome > 0 ? (category.value / monthlyTrend.totalIncome) * 100 : 0;
                      
                      // Calculate dynamic thickness based on percentage
                      const minThickness = 8;
                      const maxThickness = 24;
                      const thicknessRange = maxThickness - minThickness;
                      const normalizedPercentage = Math.min(percentage / 50, 1);
                      const segmentThickness = Math.round(minThickness + (thicknessRange * normalizedPercentage));
                      
                      return {
                        value: category.value,
                        color: category.color,
                        // text: `${percentage.toFixed(1)}%`,
                        textColor: '#FFFFFF',
                        textSize: 12,
                        // strokeWidth: segmentThickness,
                        strokeColor: category.color,
                        // shiftX: percentage > 25 ? 5 : 0, // Slightly separate large segments
                        // shiftY: percentage > 25 ? 5 : 0,
                        onPress: () => openCurrentMonth(),
                        // tooltipText: `${category.name}: ${formatAccentCurrency(category.value)} (${percentage.toFixed(1)}%)`,
                      };
                    })}
                    radius={96}
                    donut
                    innerRadius={50}
                    innerCircleColor="#FFFFFF"
                    innerCircleBorderWidth={2}
                    innerCircleBorderColor="#E5E7EB"
                    centerLabelComponent={() => (
                      <TouchableOpacity onPress={openCurrentMonth} className="items-center">
                        <Text className="text-xs font-medium text-app-text-muted">Total Income</Text>
                        <Text className="text-sm font-bold text-app-text">
                          {formatAccentCurrency(monthlyTrend.totalIncome)}
                        </Text>
                      </TouchableOpacity>
                    )}
                    showText={true}
                    textSize={10}
                    showTooltip={true}
                    focusOnPress={true}
                    toggleFocusOnPress={true}
                    extraRadius={8}
                    labelsPosition="mid"
                    strokeWidth={1}
                    strokeColor="#FFFFFF"
                  />
                </View>
                
                {/* Legend */}
                <View className="mt-8 space-y-3">
                  {monthlyTrend.categories.map((category) => {
                    const percentage = monthlyTrend.totalIncome > 0 ? (category.value / monthlyTrend.totalIncome) * 100 : 0;
                    
                    // Calculate same thickness as pie chart segment
                    const minThickness = 8;
                    const maxThickness = 24;
                    const thicknessRange = maxThickness - minThickness;
                    const normalizedPercentage = Math.min(percentage / 50, 1);
                    const segmentThickness = Math.round(minThickness + (thicknessRange * normalizedPercentage));
                    
                    // Scale for legend display (make smaller)
                    const legendSize = 10 + Math.round(segmentThickness / 3);
                    
                    return (
                      <TouchableOpacity
                        key={category.name}
                        onPress={openCurrentMonth}
                        className="flex-row items-center justify-between rounded-2xl bg-app-surface-alt px-4 py-3">
                        <View className="flex-row items-center flex-1">
                          <View className="mr-3 flex-row items-center">
                            <View
                              className="mr-2 rounded-full"
                              style={{ 
                                backgroundColor: category.color,
                                width: legendSize,
                                height: legendSize,
                              }}
                            />
                            <Text className="text-xl">{category.icon}</Text>
                          </View>
                          <View className="flex-1">
                            <Text className="text-sm font-semibold text-app-text">
                              {category.name}
                            </Text>
                            <Text className="text-xs text-app-text-muted">
                              {percentage.toFixed(1)}% of income
                            </Text>
                          </View>
                        </View>
                        <View className="items-end">
                          <Text className="text-sm font-bold text-app-text">
                            {formatAccentCurrency(category.value)}
                          </Text>
                          <View className="mt-1 h-1 w-16 rounded-full bg-app-surface">
                            <View
                              className="h-1 rounded-full"
                              style={{
                                backgroundColor: category.color,
                                width: `${Math.min(percentage, 100)}%`,
                              }}
                            />
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                
                {/* Summary Stats */}
                <View className="mt-6 rounded-2xl bg-app-surface-alt px-4 py-4">
                  <View className="flex-row justify-between">
                    <View className="items-center">
                      <Text className="text-xs text-app-text-muted">Total Allocated</Text>
                      <Text className="text-sm font-semibold text-app-text">
                        {formatAccentCurrency(monthlyTrend.categories.reduce((sum, cat) => sum + cat.value, 0))}
                      </Text>
                    </View>
                    <View className="items-center">
                      <Text className="text-xs text-app-text-muted">Allocation Rate</Text>
                      <Text className="text-sm font-semibold text-primary-600">
                        {monthlyTrend.totalIncome > 0 
                          ? ((monthlyTrend.categories.reduce((sum, cat) => sum + cat.value, 0) / monthlyTrend.totalIncome) * 100).toFixed(1)
                          : 0}%
                      </Text>
                    </View>
                    <View className="items-center">
                      <Text className="text-xs text-app-text-muted">This Month</Text>
                      <Text className="text-sm font-semibold text-app-text">
                        {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                  </View>
                </View>
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
