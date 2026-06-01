import React from 'react';
import { ScrollView, View, Text, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DebtCard } from '@/components/DebtCard';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/Button';
import { useActivityData, useSummaryData } from '../_layout';
import type { Debt, Category } from '@/context/DataContext';
import { formatCurrency } from '@/lib/utils';

const toNumber = (value: string | null | undefined) => {
  const numeric = parseFloat(value || '0');
  return Number.isFinite(numeric) ? numeric : 0;
};

export default function DebtsTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { debts, summaryLoading, refreshSummaryData } = useSummaryData();
  const { categories } = useActivityData();

  const [refreshing, setRefreshing] = React.useState(false);

  const categoryMap = React.useMemo(() => {
    const list: Category[] = Array.isArray(categories) ? categories : [];
    return new Map<number, Category>(list.map((category) => [category.id, category]));
  }, [categories]);

  const handleRefresh = React.useCallback(async () => {
    try {
      setRefreshing(true);
      await refreshSummaryData();
    } finally {
      setRefreshing(false);
    }
  }, [refreshSummaryData]);

  const handleAddDebt = React.useCallback(() => {
    router.push('/debt-modal');
  }, [router]);

  const handleEditDebt = React.useCallback(
    (debt: Debt) => {
      router.push({ pathname: '/debt-modal', params: { debtId: debt.id } });
    },
    [router]
  );

  const handleRecordPayment = React.useCallback(
    (debt: Debt) => {
      router.push({ pathname: '/debt-payment-modal', params: { debtId: debt.id } });
    },
    [router]
  );

  const totals = React.useMemo(() => {
    const visibleDebts = debts ?? [];
    const outstanding = visibleDebts.reduce((sum, debt) => sum + toNumber(debt.currentBalance), 0);
    const original = visibleDebts.reduce((sum, debt) => sum + toNumber(debt.totalAmount), 0);
    const paidOff = Math.max(original - outstanding, 0);
    return { outstanding, original, paidOff };
  }, [debts]);

  const visibleDebts = debts ?? [];
  const hasDebts = visibleDebts.length > 0;

  return (
    <View className="flex-1 bg-app-background">
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        <View className="px-5" style={{ paddingTop: 12, paddingBottom: insets.bottom + 96 }}>
          <View className="mb-6 rounded-3xl border border-app-border bg-app-surface px-6 py-7 shadow-md">
            <Text className="text-sm font-medium text-app-text-muted">Outstanding balance</Text>
            <Text className="mt-1 text-4xl font-semibold text-app-text">
              {formatCurrency(totals.outstanding)}
            </Text>
            <Text className="mt-2 text-sm text-app-text-muted">
              {hasDebts
                ? `Paid off ${formatCurrency(totals.paidOff)} so far`
                : 'Capture credit cards, loans, or informal debts to keep payoff progress in view.'}
            </Text>
            <Button
              variant="secondary"
              size="sm"
              className="mt-6 w-full justify-center"
              onPress={handleAddDebt}
              title="Add debt"
            />
          </View>

          {summaryLoading && !hasDebts ? (
            <View className="space-y-4">
              <Skeleton className="h-36 rounded-3xl" />
              <Skeleton className="h-36 rounded-3xl" />
              <Skeleton className="h-36 rounded-3xl" />
            </View>
          ) : null}

          {!summaryLoading && !hasDebts ? (
            <View className="items-center rounded-3xl border border-dashed border-app-border bg-app-surface px-6 py-10">
              <Text className="text-base font-semibold text-app-text">
                No debts being tracked yet
              </Text>
              <Text className="mt-2 text-center text-sm text-app-text-muted">
                Organize your balances, minimums, and payoff progress in one place.
              </Text>
              <TouchableOpacity
                className="mt-5 rounded-full bg-primary-500 px-6 py-3"
                onPress={handleAddDebt}
                accessibilityLabel="Create debt">
                <Text className="text-sm font-semibold text-white">Add a debt</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {hasDebts ? (
            <View className="space-y-4">
              {visibleDebts.map((debt: Debt) => (
                <DebtCard
                  key={debt.id}
                  debt={debt}
                  category={categoryMap.get(debt.categoryId ?? 0) ?? null}
                  onPressPayment={handleRecordPayment}
                  onPressEdit={handleEditDebt}
                />
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
