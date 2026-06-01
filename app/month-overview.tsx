import React, { useState, useEffect, useMemo } from 'react';
import { ScrollView, View, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';

import { useActivityData, useSummaryData } from './_layout';
import type { Transaction, Category, Bill } from '@/context/DataContext';
import { getTransactionCategoryLabel } from '@/lib/transactionPresentation';
import { buildMonthlyCoachSuggestions, categoryBudgetLookup } from '@/lib/monthlyCoach';

const formatCurrency = (value: number) => {
  if (!Number.isFinite(value)) return '$0.00';
  const absolute = Math.abs(value);
  const formatted = absolute.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${value < 0 ? '-' : ''}$${formatted}`;
};

const formatCompactCurrency = (value: number) => {
  if (!Number.isFinite(value)) return '$0';
  const formatted = Math.round(value).toLocaleString('en-US');
  return `$${formatted}`;
};

const formatRelativeDate = (dateString: string) => {
  const input = new Date(dateString);
  if (Number.isNaN(input.getTime())) return dateString;
  return input.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getMonthYearFromDate = (dateString?: string) => {
  const date = dateString ? new Date(dateString) : new Date();
  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    monthName: date.toLocaleDateString('en-US', { month: 'long' }),
    yearStr: date.getFullYear().toString(),
  };
};

const getMonthDateRange = (year: number, month: number) => {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0, 23, 59, 59);
  return { startDate, endDate };
};

const filterTransactionsByMonth = (transactions: Transaction[], year: number, month: number) => {
  const { startDate, endDate } = getMonthDateRange(year, month);
  return transactions.filter((transaction) => {
    const transactionDate = new Date(transaction.date);
    return transactionDate >= startDate && transactionDate <= endDate;
  });
};

const filterBillsByMonth = (bills: Bill[], year: number, month: number) => {
  // Bills have dueDay (1-31) indicating which day of the month they're due
  // We'll show all bills that have a due date in the selected month
  return bills.filter((bill) => {
    if (!bill.dueDay) return false;
    const dueDate = new Date(year, month, bill.dueDay);
    return dueDate.getMonth() === month && dueDate.getFullYear() === year;
  });
};

export default function MonthOverviewModal() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Get initial month from params or use current month
  const initialMonth = getMonthYearFromDate(params.month as string);
  const [selectedYear, setSelectedYear] = useState(initialMonth.year);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth.month);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Only update month on first load if we have params
  useEffect(() => {
    if (!hasInitialized && params.month) {
      const newMonth = getMonthYearFromDate(params.month as string);
      setSelectedYear(newMonth.year);
      setSelectedMonth(newMonth.month);
    }
    setHasInitialized(true);
  }, [params.month, hasInitialized]);

  const { transactions, categories } = useActivityData();
  const {
    summary,
    bills,
    debts,
    savingsGoals,
    savingsAccounts,
    monthlyIncome,
    refreshSummaryData,
  } = useSummaryData();

  const [refreshing, setRefreshing] = useState(false);

  const safeTransactions = useMemo(
    () => (Array.isArray(transactions) ? transactions : []),
    [transactions]
  );

  const safeCategories = useMemo(() => (Array.isArray(categories) ? categories : []), [categories]);

  const safeBills = useMemo(() => (Array.isArray(bills) ? bills : []), [bills]);
  const categoryMap = useMemo(
    () => new Map<number, Category>(safeCategories.map((category) => [category.id, category])),
    [safeCategories]
  );
  const categoryBudgetMap = useMemo(() => categoryBudgetLookup(safeCategories), [safeCategories]);

  const monthData = useMemo(() => {
    const monthTransactions = filterTransactionsByMonth(
      safeTransactions,
      selectedYear,
      selectedMonth
    );
    const monthBills = filterBillsByMonth(safeBills, selectedYear, selectedMonth);
    const breakdown = new Map<
      number | 'uncategorized',
      {
        id: number | null;
        name: string;
        icon: string;
        color: string;
        spent: number;
        transactionCount: number;
      }
    >();
    let actualIncomeFromTransactions = 0;
    let expenses = 0;
    let savingsContributions = 0;

    for (const transaction of monthTransactions) {
      const amount = parseFloat(transaction.amount || '0');
      if (!Number.isFinite(amount)) continue;

      if (transaction.type === 'income') {
        actualIncomeFromTransactions += amount;
      } else {
        expenses += amount;
        const category =
          transaction.categoryId != null ? categoryMap.get(transaction.categoryId) : null;
        const key = transaction.categoryId ?? 'uncategorized';
        const existing = breakdown.get(key) ?? {
          id: transaction.categoryId ?? null,
          name: getTransactionCategoryLabel(transaction, category),
          icon: category?.icon || '💡',
          color: category?.color || '#6B7280',
          spent: 0,
          transactionCount: 0,
        };

        existing.spent += amount;
        existing.transactionCount += 1;
        breakdown.set(key, existing);
      }

      if (transaction.description.toLowerCase().includes('savings')) {
        savingsContributions += amount;
      }
    }

    const billsTotal = monthBills.reduce((sum: number, bill: Bill) => {
      const amount = parseFloat(bill.amount || '0');
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);
    const recurringIncome = summary?.recurringNetIncome ?? monthlyIncome ?? 0;
    const oneOffIncome = Math.max(actualIncomeFromTransactions - recurringIncome, 0);
    const income =
      recurringIncome > 0 ? recurringIncome + oneOffIncome : actualIncomeFromTransactions;
    const savingsBalance = (savingsAccounts ?? []).reduce((sum, account) => {
      const balance = parseFloat(account.balance || '0');
      return sum + (Number.isFinite(balance) ? balance : 0);
    }, 0);
    const categoryBreakdown = Array.from(breakdown.values())
      .map((entry) => ({
        ...entry,
        budget: entry.id == null ? 0 : (categoryBudgetMap.get(entry.id) ?? 0),
      }))
      .sort((a, b) => b.spent - a.spent);
    const coachSuggestions = buildMonthlyCoachSuggestions({
      income,
      oneOffIncome,
      expenses,
      savingsBalance,
      categories: categoryBreakdown,
    });

    return {
      monthTransactions,
      monthBills,
      monthlyStats: {
        income,
        recurringIncome,
        oneOffIncome,
        recurringGrossIncome: summary?.recurringGrossIncome ?? 0,
        recurringTaxWithheld: summary?.recurringTaxWithheld ?? 0,
        recurringDeductions: summary?.recurringDeductions ?? 0,
        expenses,
        billsTotal,
        savingsContributions,
        savingsBalance,
        netBalance: income - expenses,
        transactionCount: monthTransactions.length,
      },
      categoryBreakdown,
      coachSuggestions,
    };
  }, [
    categoryBudgetMap,
    categoryMap,
    monthlyIncome,
    safeBills,
    safeTransactions,
    savingsAccounts,
    selectedMonth,
    selectedYear,
    summary?.recurringDeductions,
    summary?.recurringGrossIncome,
    summary?.recurringNetIncome,
    summary?.recurringTaxWithheld,
  ]);

  const { monthTransactions, monthBills, monthlyStats, categoryBreakdown, coachSuggestions } =
    monthData;

  const currentMonthName = useMemo(() => {
    const date = new Date(selectedYear, selectedMonth);
    const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return monthName;
  }, [selectedYear, selectedMonth]);

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handleRefresh = React.useCallback(async () => {
    try {
      setRefreshing(true);
      await refreshSummaryData();
    } finally {
      setRefreshing(false);
    }
  }, [refreshSummaryData]);

  return (
    <View className="flex-1 bg-app-canvas">
      <Stack.Screen options={{ headerShown: false }} />
      {/* Month Navigation */}
      <View className="mx-5 mb-6 mt-4 flex-row items-center justify-between rounded-3xl border border-app-border-strong bg-app-surface-1 px-6 py-4 shadow-sm">
        <TouchableOpacity onPress={handlePrevMonth} className="rounded-full bg-app-surface-2 p-3">
          <Ionicons name="chevron-back" size={20} color="#0EA5E9" />
        </TouchableOpacity>

        <View className="flex-1 items-center">
          <AppText variant="page-title" className="text-app-text-strong">
            {currentMonthName}
          </AppText>
          <AppText variant="hint" className="text-app-text-faint">
            {monthlyStats.transactionCount} transactions
          </AppText>
        </View>

        <TouchableOpacity onPress={handleNextMonth} className="rounded-full bg-app-surface-2 p-3">
          <Ionicons name="chevron-forward" size={20} color="#0EA5E9" />
        </TouchableOpacity>
      </View>
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-8"
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        <View className="space-y-6 px-5">
          {/* Monthly Summary Card */}
          <View className="rounded-3xl border border-app-border-strong bg-app-surface-1 px-6 py-6 shadow-sm">
            <AppText variant="section" className="mb-4 text-app-text-strong">
              Monthly Summary
            </AppText>

            <View className="space-y-4">
              <View className="flex-row items-center justify-between rounded-2xl bg-app-surface-2 px-4 py-3">
                <View className="flex-row items-center">
                  <View className="mr-3 rounded-full bg-success-900 p-2">
                    <Ionicons name="trending-up" size={16} color="#22c55e" />
                  </View>
                  <AppText variant="form-label" className="text-accent-income">
                    Income
                  </AppText>
                </View>
                <AppText variant="metric-lg" className="text-accent-income">
                  {formatCompactCurrency(monthlyStats.income)}
                </AppText>
              </View>

              <View className="rounded-2xl bg-app-surface-2 px-4 py-3">
                <View className="mb-3 flex-row items-center justify-between">
                  <AppText variant="form-label" className="text-app-text-soft">
                    Paycheck breakdown
                  </AppText>
                  <AppText variant="metric" className="text-app-text-strong">
                    {formatCompactCurrency(monthlyStats.recurringIncome)}
                  </AppText>
                </View>
                <View className="flex-row justify-between">
                  <View>
                    <AppText variant="label-xs" className="text-app-text-faint">
                      Gross
                    </AppText>
                    <AppText variant="metric" className="mt-1 text-app-text-strong">
                      {formatCompactCurrency(monthlyStats.recurringGrossIncome)}
                    </AppText>
                  </View>
                  <View>
                    <AppText variant="label-xs" className="text-app-text-faint">
                      Taxes
                    </AppText>
                    <AppText variant="metric" className="mt-1 text-accent-expense">
                      {formatCompactCurrency(monthlyStats.recurringTaxWithheld)}
                    </AppText>
                  </View>
                  <View>
                    <AppText variant="label-xs" className="text-app-text-faint">
                      Deductions
                    </AppText>
                    <AppText variant="metric" className="mt-1 text-accent-debt">
                      {formatCompactCurrency(monthlyStats.recurringDeductions)}
                    </AppText>
                  </View>
                  <View>
                    <AppText variant="label-xs" className="text-app-text-faint">
                      One-off
                    </AppText>
                    <AppText variant="metric" className="mt-1 text-accent-income">
                      {formatCompactCurrency(monthlyStats.oneOffIncome)}
                    </AppText>
                  </View>
                </View>
              </View>

              <View className="flex-row items-center justify-between rounded-2xl bg-app-surface-2 px-4 py-3">
                <View className="flex-row items-center">
                  <View className="mr-3 rounded-full bg-error-900 p-2">
                    <Ionicons name="trending-down" size={16} color="#ef4444" />
                  </View>
                  <AppText variant="form-label" className="text-accent-expense">
                    Expenses
                  </AppText>
                </View>
                <AppText variant="metric-lg" className="text-accent-expense">
                  {formatCompactCurrency(monthlyStats.expenses)}
                </AppText>
              </View>

              <View className="flex-row items-center justify-between rounded-2xl bg-app-surface-2 px-4 py-3">
                <View className="flex-row items-center">
                  <View className="mr-3 rounded-full bg-info-900 p-2">
                    <Ionicons name="wallet" size={16} color="#0EA5E9" />
                  </View>
                  <AppText variant="form-label" className="text-accent-savings">
                    Net Balance
                  </AppText>
                </View>
                <AppText
                  variant="metric-lg"
                  className={
                    monthlyStats.netBalance >= 0 ? 'text-accent-income' : 'text-accent-expense'
                  }>
                  {formatCompactCurrency(monthlyStats.netBalance)}
                </AppText>
              </View>

              <View className="flex-row items-center justify-between rounded-2xl bg-app-surface-2 px-4 py-3">
                <View className="flex-row items-center">
                  <View className="mr-3 rounded-full bg-info-900 p-2">
                    <Ionicons name="shield-checkmark" size={16} color="#58B6FF" />
                  </View>
                  <AppText variant="form-label" className="text-accent-savings">
                    Savings total
                  </AppText>
                </View>
                <AppText variant="metric-lg" className="text-accent-savings">
                  {formatCompactCurrency(monthlyStats.savingsBalance)}
                </AppText>
              </View>
            </View>
          </View>

          <View className="rounded-3xl border border-app-border-strong bg-app-surface-1 px-5 py-6 shadow-sm">
            <View className="mb-4 flex-row items-center justify-between">
              <View>
                <AppText variant="section" className="text-app-text-strong">
                  Monthly Coach
                </AppText>
                <AppText variant="hint" className="mt-1 text-app-text-faint">
                  Grounded in {currentMonthName} activity
                </AppText>
              </View>
              <View className="h-10 w-10 items-center justify-center rounded-full bg-accent-insight/15">
                <Ionicons name="sparkles" size={18} color="#A78BFA" />
              </View>
            </View>

            {coachSuggestions.length === 0 ? (
              <View className="rounded-2xl bg-app-surface-2 px-4 py-4">
                <AppText variant="body" className="text-app-text-soft">
                  Add income, budgets, and transactions to unlock monthly improvement suggestions.
                </AppText>
              </View>
            ) : (
              <View className="space-y-3">
                {coachSuggestions.map((suggestion) => {
                  const toneClass =
                    suggestion.tone === 'warning'
                      ? 'text-accent-debt'
                      : suggestion.tone === 'success'
                        ? 'text-accent-income'
                        : 'text-accent-insight';
                  return (
                    <View key={suggestion.id} className="rounded-2xl bg-app-surface-2 px-4 py-4">
                      <AppText variant="title" className={toneClass}>
                        {suggestion.title}
                      </AppText>
                      <AppText variant="body" className="mt-2 text-app-text-soft">
                        {suggestion.detail}
                      </AppText>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Transactions Section */}
          <View className="rounded-3xl border border-app-border-strong bg-app-surface-1 px-5 py-6 shadow-sm">
            <View className="mb-4 flex-row items-center justify-between">
              <AppText variant="section" className="text-app-text-strong">
                Transactions ({monthTransactions.length})
              </AppText>
              <TouchableOpacity
                onPress={() => router.push('/activity' as any)}
                className="rounded-full bg-app-surface-2 px-3 py-1">
                <AppText variant="caption" className="text-primary-600">
                  View all
                </AppText>
              </TouchableOpacity>
            </View>

            {monthTransactions.length === 0 ? (
              <View className="items-center justify-center rounded-2xl border border-dashed border-app-border-strong bg-app-surface-2 px-4 py-12">
                <Ionicons name="calendar-outline" size={32} color="#9CA3AF" />
                <AppText variant="body-md" className="mt-3 text-app-text-faint">
                  No transactions this month
                </AppText>
                <AppText variant="body" className="mt-1 text-app-text-faint">
                  Transactions for {currentMonthName} will appear here
                </AppText>
              </View>
            ) : (
              <View className="space-y-3">
                {monthTransactions.slice(0, 5).map((transaction: Transaction) => {
                  const categoryMeta =
                    transaction.categoryId != null ? categoryMap.get(transaction.categoryId) : null;
                  const isExpense = transaction.type === 'expense';
                  return (
                    <TouchableOpacity
                      key={transaction.id}
                      activeOpacity={0.88}
                      onPress={() =>
                        router.push({
                          pathname: '/activity',
                          params: { highlightId: String(transaction.id) },
                        })
                      }
                      className="flex-row items-center justify-between rounded-2xl bg-app-surface-2 px-4 py-3">
                      <View className="flex-1 flex-row items-center">
                        <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-app-surface-1">
                          <Text className="text-lg">
                            {categoryMeta?.icon ?? (isExpense ? '🧾' : '💰')}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <AppText
                            variant="title"
                            className="text-app-text-strong"
                            numberOfLines={1}>
                            {transaction.description}
                          </AppText>
                          <AppText variant="hint" className="text-app-text-faint">
                            {getTransactionCategoryLabel(transaction, categoryMeta)} ·{' '}
                            {formatRelativeDate(transaction.date)}
                          </AppText>
                        </View>
                      </View>
                      <AppText
                        variant="metric"
                        className={isExpense ? 'text-error-600' : 'text-success-600'}>
                        {isExpense ? '-' : '+'}
                        {formatCurrency(parseFloat(transaction.amount))}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}

                {monthTransactions.length > 5 && (
                  <TouchableOpacity
                    onPress={() => router.push('/activity' as any)}
                    className="mt-2 items-center rounded-xl bg-app-surface-2 py-3">
                    <AppText variant="body" className="text-sm font-medium text-primary-600">
                      View {monthTransactions.length - 5} more transactions
                    </AppText>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Category Breakdown */}
          <View className="rounded-3xl border border-app-border-strong bg-app-surface-1 px-5 py-6 shadow-sm">
            <AppText variant="section" className="mb-4 text-app-text-strong">
              Category Breakdown
            </AppText>

            {categoryBreakdown.length === 0 ? (
              <View className="items-center justify-center rounded-2xl border border-dashed border-app-border-strong bg-app-surface-2 px-4 py-12">
                <Ionicons name="pie-chart-outline" size={32} color="#9CA3AF" />
                <AppText variant="body-md" className="mt-3 text-app-text-faint">
                  No expenses this month
                </AppText>
                <AppText variant="body" className="mt-1 text-app-text-faint">
                  Expense categories will be shown here
                </AppText>
              </View>
            ) : (
              <View className="space-y-3">
                {categoryBreakdown.slice(0, 6).map((category) => {
                  const percentage =
                    monthlyStats.expenses > 0 ? (category.spent / monthlyStats.expenses) * 100 : 0;

                  return (
                    <View
                      key={category.id || 'uncategorized'}
                      className="flex-row items-center justify-between rounded-2xl bg-app-surface-2 px-4 py-3">
                      <View className="flex-1 flex-row items-center">
                        <Text className="mr-3 text-xl">{category.icon}</Text>
                        <View className="flex-1">
                          <AppText variant="title" className="text-app-text-strong">
                            {category.name}
                          </AppText>
                          <AppText variant="hint" className="text-app-text-faint">
                            {category.transactionCount} transaction
                            {category.transactionCount !== 1 ? 's' : ''} • Budget{' '}
                            {formatCompactCurrency(category.budget)}
                          </AppText>
                        </View>
                      </View>
                      <View className="items-end">
                        <AppText variant="metric" className="text-app-text-strong">
                          {formatCompactCurrency(category.spent)}
                        </AppText>
                        <AppText variant="hint" className="text-app-text-faint">
                          {percentage.toFixed(1)}%
                        </AppText>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Bills Section */}
          <View className="rounded-3xl border border-app-border-strong bg-app-surface-1 px-5 py-6 shadow-sm">
            <View className="mb-4 flex-row items-center justify-between">
              <AppText variant="section" className="text-app-text-strong">
                Bills ({monthBills.length})
              </AppText>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/bills')}
                className="rounded-full bg-app-surface-2 px-3 py-1">
                <AppText variant="caption" className="text-primary-600">
                  Manage
                </AppText>
              </TouchableOpacity>
            </View>

            {monthBills.length === 0 ? (
              <View className="items-center justify-center rounded-2xl border border-dashed border-app-border-strong bg-app-surface-2 px-4 py-12">
                <Ionicons name="receipt-outline" size={32} color="#9CA3AF" />
                <AppText variant="body-md" className="mt-3 text-app-text-faint">
                  No bills this month
                </AppText>
                <AppText variant="body" className="mt-1 text-app-text-faint">
                  Bills for {currentMonthName} will appear here
                </AppText>
              </View>
            ) : (
              <View className="space-y-3">
                {monthBills.map((bill: Bill) => {
                  return (
                    <View
                      key={bill.id}
                      className="flex-row items-center justify-between rounded-2xl bg-app-surface-2 px-4 py-3">
                      <View className="flex-1 flex-row items-center">
                        <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-app-surface-1">
                          <Ionicons name="receipt" size={16} color="#0EA5E9" />
                        </View>
                        <View className="flex-1">
                          <AppText
                            variant="title"
                            className="text-app-text-strong"
                            numberOfLines={1}>
                            {bill.name}
                          </AppText>
                          <AppText variant="hint" className="text-app-text-faint">
                            Due day {bill.dueDay}
                          </AppText>
                        </View>
                      </View>
                      <AppText variant="metric" className="text-app-text-strong">
                        {formatCurrency(parseFloat(bill.amount))}
                      </AppText>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Savings Goals Progress */}
          <View className="rounded-3xl border border-app-border-strong bg-app-surface-1 px-5 py-6 shadow-sm">
            <View className="mb-4 flex-row items-center justify-between">
              <AppText variant="section" className="text-app-text-strong">
                Savings Goals
              </AppText>
              <TouchableOpacity
                onPress={() => router.push('/savings-goal-modal')}
                className="rounded-full bg-app-surface-2 px-3 py-1">
                <AppText variant="caption" className="text-primary-600">
                  Manage
                </AppText>
              </TouchableOpacity>
            </View>

            {(savingsGoals ?? []).length === 0 ? (
              <View className="items-center justify-center rounded-2xl border border-dashed border-app-border-strong bg-app-surface-2 px-4 py-12">
                <Ionicons name="trending-up-outline" size={32} color="#9CA3AF" />
                <AppText variant="body-md" className="mt-3 text-app-text-faint">
                  No savings goals set
                </AppText>
                <AppText variant="body" className="mt-1 text-app-text-faint">
                  Create savings goals to track your progress
                </AppText>
              </View>
            ) : (
              <View className="space-y-3">
                {(savingsGoals ?? []).slice(0, 3).map((goal) => {
                  const currentAmount = parseFloat(goal.currentAmount ?? '0');
                  const targetAmount = parseFloat(goal.targetAmount ?? '0');
                  const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
                  const monthlyTarget = parseFloat(goal.monthlyContribution ?? '0');

                  return (
                    <View key={goal.id} className="rounded-2xl bg-app-surface-2 px-4 py-4">
                      <View className="mb-3 flex-row items-center justify-between">
                        <AppText variant="title" className="text-app-text-strong">
                          {goal.name}
                        </AppText>
                        <AppText variant="hint" className="text-app-text-faint">
                          {progress.toFixed(1)}%
                        </AppText>
                      </View>

                      <View className="mb-3 h-2 w-full rounded-full bg-app-surface-1">
                        <View
                          className="h-2 rounded-full bg-success-500"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </View>

                      <View className="flex-row items-center justify-between">
                        <AppText variant="hint" className="text-app-text-faint">
                          {formatCompactCurrency(currentAmount)} of{' '}
                          {formatCompactCurrency(targetAmount)}
                        </AppText>
                        {monthlyTarget > 0 && (
                          <AppText variant="hint" className="text-success-600">
                            +{formatCompactCurrency(monthlyTarget)}/month
                          </AppText>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Debts Section */}
          {(debts ?? []).length > 0 && (
            <View className="rounded-3xl border border-app-border-strong bg-app-surface-1 px-5 py-6 shadow-sm">
              <View className="mb-4 flex-row items-center justify-between">
                <AppText variant="section" className="text-app-text-strong">
                  Debts
                </AppText>
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/debts')}
                  className="rounded-full bg-app-surface-2 px-3 py-1">
                  <AppText variant="caption" className="text-primary-600">
                    Manage
                  </AppText>
                </TouchableOpacity>
              </View>

              <View className="space-y-3">
                {(debts ?? []).slice(0, 3).map((debt) => {
                  const totalAmount = parseFloat(debt.totalAmount || '0');
                  const currentBalance = parseFloat(debt.currentBalance || '0');
                  const remaining = totalAmount - currentBalance;
                  const progress = totalAmount > 0 ? (currentBalance / totalAmount) * 100 : 0;

                  return (
                    <View key={debt.id} className="rounded-2xl bg-app-surface-2 px-4 py-4">
                      <View className="mb-2 flex-row items-center justify-between">
                        <AppText variant="title" className="text-app-text-strong">
                          {debt.name}
                        </AppText>
                        <AppText variant="hint" className="text-app-text-faint">
                          {progress.toFixed(1)}% paid
                        </AppText>
                      </View>

                      <AppText variant="metric-lg" className="mb-3 text-error-600">
                        {formatCompactCurrency(remaining)} remaining
                      </AppText>

                      <View className="h-2 w-full rounded-full bg-app-surface-1">
                        <View
                          className="h-2 rounded-full bg-warning-500"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
