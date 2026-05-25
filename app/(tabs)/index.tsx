import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlertTaskCard } from '@/components/AlertTaskCard';
import FAB from '@/components/FAB';
import { HeroMetricCard } from '@/components/HeroMetricCard';
import { SectionHeaderRow } from '@/components/SectionHeaderRow';
import { Skeleton } from '@/components/Skeleton';
import { TopUtilityBar } from '@/components/TopUtilityBar';
import { TransactionRowDense } from '@/components/TransactionRowDense';
import { useAppData } from '@/app/_layout';
import { Card, CardContent } from '@/components/Card';
import { AppText } from '@/components/AppText';
import { useMonthOverview } from '@/lib/useMonthOverview';
import type { Category, Insight, SavingsGoal, Transaction } from '@/context/DataContext';

const currency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(Number.isFinite(value) ? value : 0);

const compactDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
};

const scoreStatus = (score: number) => {
  if (score >= 700) return 'Elite';
  if (score >= 620) return 'Excellent';
  if (score >= 540) return 'Stable';
  if (score >= 430) return 'Watch';
  return 'Critical';
};

export default function HomeTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    summary,
    insights,
    bills,
    debts,
    savingsGoals,
    transactions,
    categories,
    summaryLoading,
  } = useAppData();
  const { openCurrentMonth } = useMonthOverview();

  const categoryMap = React.useMemo(
    () => new Map<number, Category>((categories ?? []).map((category: Category) => [category.id, category])),
    [categories]
  );

  const totalIncome = summary?.incomeBaseline || summary?.totalIncome || 0;
  const totalExpenses = summary?.totalExpenses || 0;
  const totalSavings = summary?.totalSavingsProgress || 0;
  const totalDebt = React.useMemo(
    () =>
      (debts ?? []).reduce((sum, debt) => {
        const balance = Number.parseFloat(debt.currentBalance || '0');
        return sum + (Number.isFinite(balance) ? balance : 0);
      }, 0),
    [debts]
  );

  const healthScore = React.useMemo(() => {
    if (!summary) return 0;
    const savingsRate = totalIncome > 0 ? Math.min(totalSavings / totalIncome, 1) : 0;
    const spendRate = totalIncome > 0 ? Math.min(totalExpenses / totalIncome, 1.2) : 1;
    const debtLoad = totalIncome > 0 ? Math.min(totalDebt / Math.max(totalIncome * 6, 1), 1) : 0.6;
    const raw = 760 - spendRate * 220 - debtLoad * 150 + savingsRate * 180;
    return Math.max(280, Math.min(810, Math.round(raw)));
  }, [summary, totalDebt, totalExpenses, totalIncome, totalSavings]);

  const weeklyBars = React.useMemo(() => {
    const expenseTransactions = (transactions ?? []).filter(
      (item: Transaction) => item.type === 'expense'
    );
    const today = new Date();
    const bars = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      return {
        key,
        label: date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2).toUpperCase(),
        total: 0,
      };
    });

    expenseTransactions.forEach((transaction: Transaction) => {
      const key = transaction.date.slice(0, 10);
      const bar = bars.find((entry) => entry.key === key);
      if (!bar) return;
      const amount = Number.parseFloat(transaction.amount || '0');
      if (Number.isFinite(amount)) bar.total += amount;
    });

    const max = Math.max(...bars.map((bar) => bar.total), 1);
    return bars.map((bar) => ({ ...bar, heightRatio: bar.total / max }));
  }, [transactions]);

  const alerts = React.useMemo(() => {
    const nextAlerts: {
      key: string;
      label: string;
      message: string;
      progressLabel?: string;
      tone: 'income' | 'expense' | 'debt' | 'savings' | 'insight';
      onPress?: () => void;
    }[] = [];

    const upcomingBill = (bills ?? [])
      .filter((bill) => bill.dueDay != null)
      .sort((a, b) => (a.dueDay ?? 99) - (b.dueDay ?? 99))[0];
    if (upcomingBill) {
      nextAlerts.push({
        key: `bill-${upcomingBill.id}`,
        label: 'Bill due',
        message: `${upcomingBill.name} is coming up for ${currency(
          Number.parseFloat(upcomingBill.amount || '0')
        )}.`,
        progressLabel: upcomingBill.dueDay ? `Due day ${upcomingBill.dueDay}` : undefined,
        tone: 'expense',
        onPress: () => router.push('/plan' as any),
      });
    }

    const heaviestDebt = (debts ?? [])
      .slice()
      .sort(
        (a, b) =>
          Number.parseFloat(b.currentBalance || '0') - Number.parseFloat(a.currentBalance || '0')
      )[0];
    if (heaviestDebt) {
      nextAlerts.push({
        key: `debt-${heaviestDebt.id}`,
        label: 'Debt task',
        message: `Record an extra payment on ${heaviestDebt.name} to cut interest drag.`,
        progressLabel: currency(Number.parseFloat(heaviestDebt.currentBalance || '0')),
        tone: 'debt',
        onPress: () => router.push('/plan' as any),
      });
    }

    const closestGoal = ((savingsGoals ?? []) as SavingsGoal[]).slice().sort((a, b) => {
      const aRemaining =
        Number.parseFloat(a.targetAmount || '0') - Number.parseFloat(a.currentAmount || '0');
      const bRemaining =
        Number.parseFloat(b.targetAmount || '0') - Number.parseFloat(b.currentAmount || '0');
      return aRemaining - bRemaining;
    })[0];
    if (closestGoal) {
      const remaining = Math.max(
        Number.parseFloat(closestGoal.targetAmount || '0') -
          Number.parseFloat(closestGoal.currentAmount || '0'),
        0
      );
      nextAlerts.push({
        key: `goal-${closestGoal.id}`,
        label: 'Goal alert',
        message: `${closestGoal.name} is within reach if you add ${currency(
          Math.min(remaining, 500)
        )} next.`,
        progressLabel: `${currency(Number.parseFloat(closestGoal.currentAmount || '0'))} saved`,
        tone: 'savings',
        onPress: () => router.push('/plan' as any),
      });
    }

    ((insights ?? []) as Insight[]).slice(0, 1).forEach((insight) => {
      nextAlerts.push({
        key: `insight-${insight.id}`,
        label: insight.title,
        message: insight.description,
        tone: 'insight',
        onPress: () => router.push('/insights'),
      });
    });

    return nextAlerts.slice(0, 3);
  }, [bills, debts, insights, router, savingsGoals]);

  const recentTransactions = React.useMemo(
    () =>
      ((summary?.recentTransactions as Transaction[] | undefined) ?? transactions ?? []).slice(
        0,
        5
      ),
    [summary?.recentTransactions, transactions]
  );

  if (summaryLoading || !summary) {
    return (
      <View className="flex-1 bg-app-canvas">
        <TopUtilityBar actionIcon="calendar-outline" actionLabel="Open current month" onPressAction={openCurrentMonth} />
        <ScrollView
          className="flex-1 bg-app-canvas"
          contentContainerStyle={{ paddingTop: 20, paddingBottom: insets.bottom + 120 }}
          contentContainerClassName="px-5 gap-4">
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-60 rounded-3xl" />
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-app-canvas">
      <Stack.Screen options={{ headerShown: false }} />
      <TopUtilityBar
        actionIcon="calendar-outline"
        actionLabel="Open current month"
        onPressAction={openCurrentMonth}
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 20, paddingBottom: insets.bottom + 120 }}
        contentContainerClassName="px-5">
        <HeroMetricCard
          eyebrow="Financial health score"
          title="Your system is strongest when spending, debt, and savings move together."
          value={String(healthScore)}
          status={scoreStatus(healthScore)}
          updatedLabel="Updated from current month cash flow"
          onPressDetails={() => router.push('/insights')}
          metrics={[
            { label: 'Income', value: currency(totalIncome), tone: 'income' },
            { label: 'Expenses', value: currency(totalExpenses), tone: 'expense' },
            { label: 'Debt', value: currency(totalDebt), tone: 'debt' },
            { label: 'Savings', value: currency(totalSavings), tone: 'savings' },
          ]}>
          <View className="mt-1 flex-row items-end gap-2">
            {weeklyBars.map((bar) => (
              <View key={bar.key} className="flex-1 items-center">
                <View className="h-20 w-full items-center justify-end">
                  <View
                    className="w-full rounded-full bg-accent-expense"
                    style={{ height: `${Math.max(bar.heightRatio * 100, 10)}%`, opacity: 0.92 }}
                  />
                </View>
                <AppText variant="label-xs" className="mt-2 text-app-text-faint">{bar.label}</AppText>
              </View>
            ))}
          </View>
        </HeroMetricCard>

        <View className="mt-6 flex-row flex-wrap gap-3">
          <QuickAction
            icon="add-circle-outline"
            label="Add transaction"
            onPress={() => router.push('/add-transaction')}
          />
          <QuickAction
            icon="download-outline"
            label="Import"
            onPress={() => router.push('/imports' as any)}
          />
          <QuickAction icon="calendar-outline" label="Review month" onPress={openCurrentMonth} />
          <QuickAction icon="flag-outline" label="Plan" onPress={() => router.push('/plan' as any)} />
        </View>

        <Card variant="glass-dark" className="mt-6">
          <CardContent>
            <SectionHeaderRow
              title="Expense pulse"
              subtitle="Current week spend rhythm"
              actionLabel="Deep dive"
              onPressAction={() => router.push('/activity' as any)}
            />
            <View className="mb-5 flex-row items-end justify-between">
              <View>
                <AppText variant="hero" className="text-app-text-strong">
                  {currency(totalExpenses)}
                </AppText>
                <AppText variant="body" className="mt-1 text-app-text-faint">Spent this month</AppText>
              </View>
              <View className="rounded-full bg-app-canvas-elevated px-3 py-2">
                <AppText variant="caption" className="text-app-text-soft">
                  {recentTransactions.length} recent moves
                </AppText>
              </View>
            </View>
            <View className="flex-row gap-2">
              {(summary?.categoryBreakdown ?? []).slice(0, 4).map((item: any) => (
                <View key={item.id} className="flex-1 rounded-2xl bg-app-canvas-elevated px-3 py-3">
                  <AppText variant="label-xs" className="text-app-text-faint">
                    {item.name}
                  </AppText>
                  <AppText variant="metric" className="mt-2 text-app-text-strong">
                    {currency(item.spent ?? 0)}
                  </AppText>
                </View>
              ))}
            </View>
          </CardContent>
        </Card>

        <View className="mt-8">
          <SectionHeaderRow title="Alerts and tasks" subtitle="The next few moves that matter" />
          <View className="gap-3">
            {alerts.map((alert) => (
              <AlertTaskCard
                key={alert.key}
                label={alert.label}
                message={alert.message}
                progressLabel={alert.progressLabel}
                tone={alert.tone}
                onPress={alert.onPress}
              />
            ))}
          </View>
        </View>

        <View className="mt-8">
          <SectionHeaderRow
            title="Recent activity"
            subtitle="Latest movement across your accounts"
            actionLabel="All activity"
            onPressAction={() => router.push('/activity' as any)}
          />
          <View className="gap-3">
            {recentTransactions.map((transaction: Transaction) => {
              const category = categoryMap.get(transaction.categoryId ?? -1);
              const amount = Number.parseFloat(transaction.amount || '0');
              return (
                <TransactionRowDense
                  key={transaction.id}
                  icon={category?.icon ?? (transaction.type === 'expense' ? '🧾' : '💸')}
                  title={transaction.description}
                  subtitle={`${category?.name ?? 'Uncategorized'} • ${compactDate(transaction.date)}`}
                  amount={currency(amount)}
                  tone={transaction.type === 'income' ? 'income' : 'expense'}
                  onPress={() =>
                    router.push({
                      pathname: '/transactions-modal',
                      params: { highlightId: transaction.id },
                    })
                  }
                />
              );
            })}
          </View>
        </View>
      </ScrollView>
      <FAB onPress={() => router.push('/add-transaction')} />
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ minWidth: '47%' }}
      className="flex-1 rounded-3xl border border-app-border bg-app-surface-1 px-4 py-4">
      <View className="h-11 w-11 items-center justify-center rounded-2xl bg-app-canvas-elevated">
        <Ionicons name={icon} size={18} color="#59F7A5" />
      </View>
      <Text className="mt-4 text-sm font-semibold text-app-text-strong">{label}</Text>
    </TouchableOpacity>
  );
}
