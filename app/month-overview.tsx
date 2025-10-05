import React, { useState, useEffect, useMemo } from 'react';
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
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppData } from './_layout';
import type { Transaction, Category, Bill, Debt } from '@/context/DataContext';
import { Skeleton } from '@/components/Skeleton';

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

const filterTransactionsByMonth = (
  transactions: Transaction[],
  year: number,
  month: number
) => {
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
  const insets = useSafeAreaInsets();
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
  
  const {
    transactions,
    categories,
    bills,
    debts,
    savingsGoals,
    refreshAppData,
    monthlyIncome,
  } = useAppData();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  const safeTransactions = useMemo(
    () => (Array.isArray(transactions) ? transactions : []),
    [transactions]
  );

  const safeCategories = useMemo(
    () => (Array.isArray(categories) ? categories : []),
    [categories]
  );

  const safeBills = useMemo(() => (Array.isArray(bills) ? bills : []), [bills]);
  const safeDebts = useMemo(() => (Array.isArray(debts) ? debts : []), [debts]);
  const safeSavingsGoals = useMemo(
    () => (Array.isArray(savingsGoals) ? savingsGoals : []),
    [savingsGoals]
  );

  // Filter data for selected month
  const monthTransactions = useMemo(() => {
    const filtered = filterTransactionsByMonth(safeTransactions, selectedYear, selectedMonth);
    return filtered;
  }, [safeTransactions, selectedYear, selectedMonth]);

  const monthBills = useMemo(() => {
    const filtered = filterBillsByMonth(safeBills, selectedYear, selectedMonth);
    return filtered;
  }, [safeBills, selectedYear, selectedMonth]);

  // Calculate monthly totals
  const monthlyStats = useMemo(() => {
    // Use baseline monthly income (user's set income) instead of transaction income
    const actualIncomeFromTransactions = monthTransactions
      .filter((t: Transaction) => t.type === 'income')
      .reduce((sum: number, t: Transaction) => sum + parseFloat(t.amount), 0);
    
    const income = monthlyIncome ?? actualIncomeFromTransactions;

    const expenses = monthTransactions
      .filter((t: Transaction) => t.type === 'expense')
      .reduce((sum: number, t: Transaction) => sum + parseFloat(t.amount), 0);

    const billsTotal = monthBills.reduce((sum: number, b: Bill) => sum + parseFloat(b.amount), 0);

    const savingsContributions = monthTransactions
      .filter((t: Transaction) => t.description.toLowerCase().includes('savings'))
      .reduce((sum: number, t: Transaction) => sum + parseFloat(t.amount), 0);

    const netBalance = income - expenses;

    return {
      income,
      expenses,
      billsTotal,
      savingsContributions,
      netBalance,
      transactionCount: monthTransactions.length,
    };
  }, [monthTransactions, monthBills, monthlyIncome]);

  // Category breakdown for the month
  const categoryBreakdown = useMemo(() => {
    const breakdown = new Map();
    
    monthTransactions
      .filter((t: Transaction) => t.type === 'expense')
      .forEach((transaction: Transaction) => {
        const categoryId = transaction.categoryId;
        const amount = parseFloat(transaction.amount);
        const category = safeCategories.find((c) => c.id === categoryId);
        
        const key = categoryId || 'uncategorized';
        const existing = breakdown.get(key) || {
          id: categoryId,
          name: category?.name || 'Uncategorized',
          icon: category?.icon || '💡',
          color: category?.color || '#6B7280',
          spent: 0,
          transactionCount: 0,
        };
        
        existing.spent += amount;
        existing.transactionCount += 1;
        breakdown.set(key, existing);
      });

    return Array.from(breakdown.values()).sort((a, b) => b.spent - a.spent);
  }, [monthTransactions, safeCategories]);

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
      await refreshAppData();
    } finally {
      setRefreshing(false);
    }
  }, [refreshAppData]);

  if (loading) {
    return (
      <View className="flex-1 bg-app-background">
        <Stack.Screen
          options={{
            title: 'Month Overview',
            headerShown: true,
          }}
        />
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pt-6 pb-20 space-y-4">
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-48 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-40 rounded-3xl" />
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-app-background">     
        {/* Month Navigation */}
        <View className="mx-5 mt-4 mb-6 flex-row items-center justify-between rounded-3xl border border-app-border bg-app-surface px-6 py-4 shadow-sm">
          <TouchableOpacity onPress={handlePrevMonth} className="rounded-full bg-app-surface-alt p-3">
            <Ionicons name="chevron-back" size={20} color="#0EA5E9" />
          </TouchableOpacity>
          
          <View className="flex-1 items-center">
            <Text className="text-xl font-bold text-app-text">{currentMonthName}</Text>
            <Text className="text-sm text-app-text-muted">
              {monthlyStats.transactionCount} transactions
            </Text>
          </View>
          
          <TouchableOpacity onPress={handleNextMonth} className="rounded-full bg-app-surface-alt p-3">
            <Ionicons name="chevron-forward" size={20} color="#0EA5E9" />
          </TouchableOpacity>
        </View>
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-8"
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        

        <View className="px-5 space-y-6">
          {/* Monthly Summary Card */}
          <View className="rounded-3xl border border-app-border bg-app-surface px-6 py-6 shadow-sm">
            <Text className="mb-4 text-lg font-bold text-app-text">Monthly Summary</Text>
            
            <View className="space-y-4">
              <View className="flex-row items-center justify-between rounded-2xl bg-success-50 px-4 py-3">
                <View className="flex-row items-center">
                  <View className="mr-3 rounded-full bg-success-100 p-2">
                    <Ionicons name="trending-up" size={16} color="#10B981" />
                  </View>
                  <Text className="text-sm font-medium text-success-700">Income</Text>
                </View>
                <Text className="text-lg font-bold text-success-700">
                  {formatCompactCurrency(monthlyStats.income)}
                </Text>
              </View>

              <View className="flex-row items-center justify-between rounded-2xl bg-error-50 px-4 py-3">
                <View className="flex-row items-center">
                  <View className="mr-3 rounded-full bg-error-100 p-2">
                    <Ionicons name="trending-down" size={16} color="#EF4444" />
                  </View>
                  <Text className="text-sm font-medium text-error-700">Expenses</Text>
                </View>
                <Text className="text-lg font-bold text-error-700">
                  {formatCompactCurrency(monthlyStats.expenses)}
                </Text>
              </View>

              <View className="flex-row items-center justify-between rounded-2xl bg-primary-50 px-4 py-3">
                <View className="flex-row items-center">
                  <View className="mr-3 rounded-full bg-primary-100 p-2">
                    <Ionicons name="wallet" size={16} color="#0EA5E9" />
                  </View>
                  <Text className="text-sm font-medium text-primary-700">Net Balance</Text>
                </View>
                <Text
                  className={`text-lg font-bold ${
                    monthlyStats.netBalance >= 0 ? 'text-success-700' : 'text-error-700'
                  }`}>
                  {formatCompactCurrency(monthlyStats.netBalance)}
                </Text>
              </View>
            </View>
          </View>

          {/* Transactions Section */}
          <View className="rounded-3xl border border-app-border bg-app-surface px-5 py-6 shadow-sm">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-app-text">
                Transactions ({monthTransactions.length})
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/transactions-modal')}
                className="rounded-full bg-app-surface-alt px-3 py-1">
                <Text className="text-xs font-semibold text-primary-600">View all</Text>
              </TouchableOpacity>
            </View>

            {monthTransactions.length === 0 ? (
              <View className="items-center justify-center rounded-2xl border border-dashed border-app-border bg-app-surface-alt px-4 py-12">
                <Ionicons name="calendar-outline" size={32} color="#9CA3AF" />
                <Text className="mt-3 text-base font-medium text-app-text-muted">
                  No transactions this month
                </Text>
                <Text className="mt-1 text-sm text-app-text-muted">
                  Transactions for {currentMonthName} will appear here
                </Text>
              </View>
            ) : (
              <View className="space-y-3">
                {monthTransactions.slice(0, 5).map((transaction: Transaction) => {
                  const categoryMeta = safeCategories.find(
                    (cat) => cat.id === transaction.categoryId
                  );
                  const isExpense = transaction.type === 'expense';
                  return (
                    <View
                      key={transaction.id}
                      className="flex-row items-center justify-between rounded-2xl bg-app-surface-alt px-4 py-3">
                      <View className="flex-row items-center flex-1">
                        <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-app-surface">
                          <Text className="text-lg">
                            {categoryMeta?.icon ?? (isExpense ? '🧾' : '💰')}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-app-text" numberOfLines={1}>
                            {transaction.description}
                          </Text>
                          <Text className="text-xs text-app-text-muted">
                            {categoryMeta?.name ?? 'Uncategorized'} • {formatRelativeDate(transaction.date)}
                          </Text>
                        </View>
                      </View>
                      <Text
                        className={`text-sm font-bold ${
                          isExpense ? 'text-error-600' : 'text-success-600'
                        }`}>
                        {isExpense ? '-' : '+'}
                        {formatCurrency(parseFloat(transaction.amount))}
                      </Text>
                    </View>
                  );
                })}
                
                {monthTransactions.length > 5 && (
                  <TouchableOpacity
                    onPress={() => router.push('/transactions-modal')}
                    className="mt-2 items-center rounded-xl bg-app-surface-alt py-3">
                    <Text className="text-sm font-medium text-primary-600">
                      View {monthTransactions.length - 5} more transactions
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Category Breakdown */}
          <View className="rounded-3xl border border-app-border bg-app-surface px-5 py-6 shadow-sm">
            <Text className="mb-4 text-lg font-bold text-app-text">Category Breakdown</Text>
            
            {categoryBreakdown.length === 0 ? (
              <View className="items-center justify-center rounded-2xl border border-dashed border-app-border bg-app-surface-alt px-4 py-12">
                <Ionicons name="pie-chart-outline" size={32} color="#9CA3AF" />
                <Text className="mt-3 text-base font-medium text-app-text-muted">
                  No expenses this month
                </Text>
                <Text className="mt-1 text-sm text-app-text-muted">
                  Expense categories will be shown here
                </Text>
              </View>
            ) : (
              <View className="space-y-3">
                {categoryBreakdown.slice(0, 6).map((category) => {
                  const percentage = monthlyStats.expenses > 0 
                    ? (category.spent / monthlyStats.expenses) * 100 
                    : 0;
                  
                  return (
                    <View
                      key={category.id || 'uncategorized'}
                      className="flex-row items-center justify-between rounded-2xl bg-app-surface-alt px-4 py-3">
                      <View className="flex-row items-center flex-1">
                        <Text className="mr-3 text-xl">{category.icon}</Text>
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-app-text">
                            {category.name}
                          </Text>
                          <Text className="text-xs text-app-text-muted">
                            {category.transactionCount} transaction{category.transactionCount !== 1 ? 's' : ''}
                          </Text>
                        </View>
                      </View>
                      <View className="items-end">
                        <Text className="text-sm font-bold text-app-text">
                          {formatCompactCurrency(category.spent)}
                        </Text>
                        <Text className="text-xs text-app-text-muted">
                          {percentage.toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Bills Section */}
          <View className="rounded-3xl border border-app-border bg-app-surface px-5 py-6 shadow-sm">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-app-text">
                Bills ({monthBills.length})
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/bills')}
                className="rounded-full bg-app-surface-alt px-3 py-1">
                <Text className="text-xs font-semibold text-primary-600">Manage</Text>
              </TouchableOpacity>
            </View>

            {monthBills.length === 0 ? (
              <View className="items-center justify-center rounded-2xl border border-dashed border-app-border bg-app-surface-alt px-4 py-12">
                <Ionicons name="receipt-outline" size={32} color="#9CA3AF" />
                <Text className="mt-3 text-base font-medium text-app-text-muted">
                  No bills this month
                </Text>
                <Text className="mt-1 text-sm text-app-text-muted">
                  Bills for {currentMonthName} will appear here
                </Text>
              </View>
            ) : (
              <View className="space-y-3">
                {monthBills.map((bill: Bill) => {
                  const dueDate = new Date(selectedYear, selectedMonth, bill.dueDay || 1);
                  return (
                    <View
                      key={bill.id}
                      className="flex-row items-center justify-between rounded-2xl bg-app-surface-alt px-4 py-3">
                      <View className="flex-row items-center flex-1">
                        <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-app-surface">
                          <Ionicons name="receipt" size={16} color="#0EA5E9" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-app-text" numberOfLines={1}>
                            {bill.name}
                          </Text>
                          <Text className="text-xs text-app-text-muted">
                            Due day {bill.dueDay}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-sm font-bold text-app-text">
                        {formatCurrency(parseFloat(bill.amount))}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Savings Goals Progress */}
          <View className="rounded-3xl border border-app-border bg-app-surface px-5 py-6 shadow-sm">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-app-text">Savings Goals</Text>
              <TouchableOpacity
                onPress={() => router.push('/savings-goal-modal')}
                className="rounded-full bg-app-surface-alt px-3 py-1">
                <Text className="text-xs font-semibold text-primary-600">Manage</Text>
              </TouchableOpacity>
            </View>

            {safeSavingsGoals.length === 0 ? (
              <View className="items-center justify-center rounded-2xl border border-dashed border-app-border bg-app-surface-alt px-4 py-12">
                <Ionicons name="trending-up-outline" size={32} color="#9CA3AF" />
                <Text className="mt-3 text-base font-medium text-app-text-muted">
                  No savings goals set
                </Text>
                <Text className="mt-1 text-sm text-app-text-muted">
                  Create savings goals to track your progress
                </Text>
              </View>
            ) : (
              <View className="space-y-3">
                {safeSavingsGoals.slice(0, 3).map((goal) => {
                  const progress = (goal.currentAmount / goal.targetAmount) * 100;
                  const monthlyTarget = goal.monthlyContribution || 0;
                  
                  return (
                    <View
                      key={goal.id}
                      className="rounded-2xl bg-app-surface-alt px-4 py-4">
                      <View className="mb-3 flex-row items-center justify-between">
                        <Text className="text-sm font-semibold text-app-text">
                          {goal.name}
                        </Text>
                        <Text className="text-xs text-app-text-muted">
                          {progress.toFixed(1)}%
                        </Text>
                      </View>
                      
                      <View className="mb-3 h-2 w-full rounded-full bg-app-surface">
                        <View
                          className="h-2 rounded-full bg-success-500"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </View>
                      
                      <View className="flex-row items-center justify-between">
                        <Text className="text-xs text-app-text-muted">
                          {formatCompactCurrency(goal.currentAmount)} of {formatCompactCurrency(goal.targetAmount)}
                        </Text>
                        {monthlyTarget > 0 && (
                          <Text className="text-xs text-success-600">
                            +{formatCompactCurrency(monthlyTarget)}/month
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Debts Section */}
          {safeDebts.length > 0 && (
            <View className="rounded-3xl border border-app-border bg-app-surface px-5 py-6 shadow-sm">
              <View className="mb-4 flex-row items-center justify-between">
                <Text className="text-lg font-bold text-app-text">Debts</Text>
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/debts')}
                  className="rounded-full bg-app-surface-alt px-3 py-1">
                  <Text className="text-xs font-semibold text-primary-600">Manage</Text>
                </TouchableOpacity>
              </View>

              <View className="space-y-3">
                {safeDebts.slice(0, 3).map((debt: Debt) => {
                  const remaining = parseFloat(debt.totalAmount) - parseFloat(debt.currentBalance);
                  const progress = (parseFloat(debt.currentBalance) / parseFloat(debt.totalAmount)) * 100;
                  
                  return (
                    <View
                      key={debt.id}
                      className="rounded-2xl bg-app-surface-alt px-4 py-4">
                      <View className="mb-2 flex-row items-center justify-between">
                        <Text className="text-sm font-semibold text-app-text">
                          {debt.name}
                        </Text>
                        <Text className="text-xs text-app-text-muted">
                          {progress.toFixed(1)}% paid
                        </Text>
                      </View>
                      
                      <Text className="mb-3 text-lg font-bold text-error-600">
                        {formatCompactCurrency(remaining)} remaining
                      </Text>
                      
                      <View className="h-2 w-full rounded-full bg-app-surface">
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