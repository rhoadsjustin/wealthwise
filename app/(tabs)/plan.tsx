import React from 'react';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card, CardContent } from '@/components/Card';
import { SectionHeaderRow } from '@/components/SectionHeaderRow';
import { Skeleton } from '@/components/Skeleton';
import { TopUtilityBar } from '@/components/TopUtilityBar';
import { AppText } from '@/components/AppText';
import { useAppData } from '@/app/_layout';
import type { SavingsGoal } from '@/context/DataContext';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(Number.isFinite(value) ? value : 0);

export default function PlanTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bills, debts, savingsGoals, summary, summaryLoading, refreshAppData } = useAppData();
  const [refreshing, setRefreshing] = React.useState(false);

  const totals = React.useMemo(() => {
    const billTotal = (bills ?? []).reduce(
      (sum, bill) => sum + Number.parseFloat(bill.amount || '0'),
      0
    );
    const debtTotal = (debts ?? []).reduce(
      (sum, debt) => sum + Number.parseFloat(debt.currentBalance || '0'),
      0
    );
    const savingsProgress = summary?.totalSavingsProgress ?? 0;
    return {
      billTotal: Number.isFinite(billTotal) ? billTotal : 0,
      debtTotal: Number.isFinite(debtTotal) ? debtTotal : 0,
      savingsProgress,
    };
  }, [bills, debts, summary?.totalSavingsProgress]);

  const handleRefresh = React.useCallback(async () => {
    try {
      setRefreshing(true);
      await refreshAppData();
    } finally {
      setRefreshing(false);
    }
  }, [refreshAppData]);

  if (summaryLoading && !summary) {
    return (
      <View className="flex-1 bg-app-canvas">
        <TopUtilityBar
          badge="Plan"
          actionIcon="add-outline"
          actionLabel="Create savings goal"
          onPressAction={() => router.push('/savings-goal-modal')}
        />
        <ScrollView
          className="flex-1 bg-app-canvas"
          contentContainerStyle={{ paddingTop: 20, paddingBottom: insets.bottom + 100 }}
          contentContainerClassName="px-5 gap-4">
          <Skeleton className="h-28 rounded-3xl" />
          <Skeleton className="h-56 rounded-3xl" />
          <Skeleton className="h-56 rounded-3xl" />
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-app-canvas">
      <Stack.Screen options={{ headerShown: false }} />
      <TopUtilityBar
        badge="Plan"
        actionIcon="add-outline"
        actionLabel="Create savings goal"
        onPressAction={() => router.push('/savings-goal-modal')}
      />
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={{ paddingTop: 20, paddingBottom: insets.bottom + 120 }}
        contentContainerClassName="px-5">
        <Text className="mb-6 text-sm leading-6 text-app-text-faint">
          Bills, debt, and savings in one place so the month feels coordinated.
        </Text>

        <Card variant="hero">
          <CardContent>
            <SectionHeaderRow
              title="Commitment overview"
              subtitle="Where your money is already spoken for"
            />
            <View className="flex-row gap-3">
              <OverviewStat label="Bills" value={formatCurrency(totals.billTotal)} tone="expense" />
              <OverviewStat label="Debt" value={formatCurrency(totals.debtTotal)} tone="debt" />
              <OverviewStat
                label="Savings"
                value={formatCurrency(totals.savingsProgress)}
                tone="savings"
              />
            </View>
          </CardContent>
        </Card>

        <View className="mt-8">
          <SectionHeaderRow
            title="Bills"
            actionLabel="Add bill"
            onPressAction={() => router.push('/bill-modal')}
          />
          <View className="gap-3">
            {(bills ?? []).length ? (
              (bills ?? []).map((bill) => (
                <CommitmentCard
                  key={bill.id}
                  title={bill.name}
                  subtitle={bill.dueDay ? `Due day ${bill.dueDay}` : 'Flexible due date'}
                  value={formatCurrency(Number.parseFloat(bill.amount || '0'))}
                  tone="expense"
                  meta={
                    bill.autoPay
                      ? 'Auto-pay'
                      : bill.lastPaidOn
                        ? 'Recently paid'
                        : 'Needs attention'
                  }
                  onPressPrimary={() =>
                    router.push({ pathname: '/bill-modal', params: { billId: bill.id } })
                  }
                  primaryLabel="Edit"
                />
              ))
            ) : (
              <EmptyCommitment
                label="No bills tracked yet"
                actionLabel="Create first bill"
                onPress={() => router.push('/bill-modal')}
              />
            )}
          </View>
        </View>

        <View className="mt-8">
          <SectionHeaderRow
            title="Debt"
            actionLabel="Add debt"
            onPressAction={() => router.push('/debt-modal')}
          />
          <View className="gap-3">
            {(debts ?? []).length ? (
              (debts ?? []).map((debt) => (
                <CommitmentCard
                  key={debt.id}
                  title={debt.name}
                  subtitle={
                    debt.minimumPayment
                      ? `Min ${formatCurrency(Number.parseFloat(debt.minimumPayment))}`
                      : 'No minimum set'
                  }
                  value={formatCurrency(Number.parseFloat(debt.currentBalance || '0'))}
                  tone="debt"
                  meta={debt.interestRate ? `APR ${debt.interestRate}%` : 'Balance tracked'}
                  onPressPrimary={() =>
                    router.push({ pathname: '/debt-payment-modal', params: { debtId: debt.id } })
                  }
                  onPressSecondary={() =>
                    router.push({ pathname: '/debt-modal', params: { debtId: debt.id } })
                  }
                  primaryLabel="Record payment"
                  secondaryLabel="Edit"
                />
              ))
            ) : (
              <EmptyCommitment
                label="No debt tracked yet"
                actionLabel="Create first debt"
                onPress={() => router.push('/debt-modal')}
              />
            )}
          </View>
        </View>

        <View className="mt-8">
          <SectionHeaderRow
            title="Savings goals"
            actionLabel="New goal"
            onPressAction={() => router.push('/savings-goal-modal')}
          />
          <View className="gap-3">
            {(savingsGoals ?? []).length ? (
              ((savingsGoals ?? []) as SavingsGoal[]).map((goal) => (
                <SavingsGoalCompact
                  key={goal.id}
                  goal={goal}
                  onPressFund={() =>
                    router.push({ pathname: '/savings-fund-modal', params: { goalId: goal.id } })
                  }
                  onPressEdit={() =>
                    router.push({ pathname: '/savings-goal-modal', params: { goalId: goal.id } })
                  }
                />
              ))
            ) : (
              <EmptyCommitment
                label="No savings goals yet"
                actionLabel="Create first goal"
                onPress={() => router.push('/savings-goal-modal')}
              />
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function OverviewStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'expense' | 'debt' | 'savings';
}) {
  const toneColor =
    tone === 'expense'
      ? 'text-accent-expense'
      : tone === 'debt'
        ? 'text-accent-debt'
        : 'text-accent-savings';
  return (
    <View className="flex-1 rounded-2xl bg-app-canvas-elevated px-3 py-4">
      <AppText variant="label-xs" className="text-app-text-faint">{label}</AppText>
      <AppText variant="metric-lg" className={`mt-2 ${toneColor}`}>{value}</AppText>
    </View>
  );
}

function CommitmentCard({
  title,
  subtitle,
  value,
  meta,
  tone,
  primaryLabel,
  secondaryLabel,
  onPressPrimary,
  onPressSecondary,
}: {
  title: string;
  subtitle: string;
  value: string;
  meta: string;
  tone: 'expense' | 'debt';
  primaryLabel: string;
  secondaryLabel?: string;
  onPressPrimary: () => void;
  onPressSecondary?: () => void;
}) {
  const accent = tone === 'expense' ? 'text-accent-expense' : 'text-accent-debt';
  const icon = tone === 'expense' ? 'receipt-outline' : 'card-outline';

  return (
    <Card variant="glass-dark">
      <CardContent>
        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-1 flex-row gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-app-canvas-elevated">
              <Ionicons name={icon as never} size={18} color="#F8FAFC" />
            </View>
            <View className="flex-1">
              <AppText variant="title" className="text-app-text-strong">{title}</AppText>
              <AppText variant="hint" className="mt-1 text-app-text-faint">{subtitle}</AppText>
              <AppText variant="hint" className="mt-2 text-app-text-soft">{meta}</AppText>
            </View>
          </View>
          <AppText variant="metric-lg" className={accent}>{value}</AppText>
        </View>
        <View className="mt-4 flex-row gap-2">
          <TouchableOpacity
            onPress={onPressPrimary}
            className="flex-1 rounded-full border border-app-border-contrast bg-app-surface-2 px-4 py-3">
            <Text className="text-center text-sm font-semibold text-app-text-strong">
              {primaryLabel}
            </Text>
          </TouchableOpacity>
          {secondaryLabel && onPressSecondary ? (
            <TouchableOpacity
              onPress={onPressSecondary}
              className="rounded-full border border-app-border bg-app-canvas-elevated px-4 py-3">
          <AppText variant="body" className="text-app-text-soft">{secondaryLabel}</AppText>
            </TouchableOpacity>
          ) : null}
        </View>
      </CardContent>
    </Card>
  );
}

function SavingsGoalCompact({
  goal,
  onPressFund,
  onPressEdit,
}: {
  goal: SavingsGoal;
  onPressFund: () => void;
  onPressEdit: () => void;
}) {
  const target = Number.parseFloat(goal.targetAmount || '0');
  const current = Number.parseFloat(goal.currentAmount || '0');
  const progress = target > 0 ? Math.min(current / target, 1) : 0;

  return (
    <Card variant="glass-dark">
      <CardContent>
        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <AppText variant="title" className="text-app-text-strong">{goal.name}</AppText>
            <AppText variant="hint" className="mt-1 text-app-text-faint">
              {formatCurrency(current)} of {formatCurrency(target)}
            </AppText>
          </View>
          <AppText variant="metric-lg" className="text-accent-savings">
            {Math.round(progress * 100)}%
          </AppText>
        </View>
        <View className="mt-4 h-2 rounded-full bg-app-canvas-elevated">
          <View
            className="h-2 rounded-full bg-accent-savings"
            style={{ width: `${Math.max(progress * 100, 6)}%` }}
          />
        </View>
        <View className="mt-4 flex-row gap-2">
          <TouchableOpacity
            onPress={onPressFund}
            className="flex-1 rounded-full border border-app-border-contrast bg-app-surface-2 px-4 py-3">
          <AppText variant="body" className="text-sm font-semibold text-app-text-strong">Fund</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onPressEdit}
            className="rounded-full border border-app-border bg-app-canvas-elevated px-4 py-3">
          <AppText variant="body" className="text-app-text-soft">Edit</AppText>
          </TouchableOpacity>
        </View>
      </CardContent>
    </Card>
  );
}

function EmptyCommitment({
  label,
  actionLabel,
  onPress,
}: {
  label: string;
  actionLabel: string;
  onPress: () => void;
}) {
  return (
    <Card variant="inset">
      <CardContent>
        <AppText variant="body" className="text-app-text-faint">{label}</AppText>
        <TouchableOpacity
          onPress={onPress}
          className="mt-4 self-start rounded-full border border-app-border-contrast bg-app-surface-2 px-4 py-3">
          <AppText variant="body" className="text-sm font-semibold text-app-text-strong">{actionLabel}</AppText>
        </TouchableOpacity>
      </CardContent>
    </Card>
  );
}
