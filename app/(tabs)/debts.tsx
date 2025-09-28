import React from 'react';
import { ScrollView, View, Text, RefreshControl, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HeaderProfileButton from '@/components/HeaderProfileButton';
import { DebtCard } from '@/components/DebtCard';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/Button';
import { useAppData } from '../_layout';
import type { Debt } from '@/context/DataContext';
import { formatCurrency } from '@/lib/utils';

const toNumber = (value: string | null | undefined) => {
  const numeric = parseFloat(value || '0');
  return Number.isFinite(numeric) ? numeric : 0;
};

export default function DebtsTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { debts, categories, summaryLoading, refreshAppData } = useAppData();

  const [refreshing, setRefreshing] = React.useState(false);
  const [localDebts, setLocalDebts] = React.useState<Debt[]>(debts || []);

  React.useEffect(() => {
    setLocalDebts(Array.isArray(debts) ? debts : []);
  }, [debts]);

  const categoryMap = React.useMemo(() => {
    return new Map((categories || []).map((category: any) => [category.id, category]));
  }, [categories]);

  const handleRefresh = React.useCallback(async () => {
    try {
      setRefreshing(true);
      await refreshAppData();
    } finally {
      setRefreshing(false);
    }
  }, [refreshAppData]);

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
    const outstanding = localDebts.reduce((sum, debt) => sum + toNumber(debt.currentBalance), 0);
    const original = localDebts.reduce((sum, debt) => sum + toNumber(debt.totalAmount), 0);
    const paidOff = Math.max(original - outstanding, 0);
    return { outstanding, original, paidOff };
  }, [localDebts]);

  const hasDebts = localDebts.length > 0;

  return (
    <View className="flex-1 bg-app-background">
      <Stack.Screen
        options={{
          title: '',
          headerTransparent: true,
          headerShadowVisible: false,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.push('/profile')}
              accessibilityLabel="Open profile"
              className="ml-2 h-10 w-10 items-center justify-center rounded-full bg-app-surface shadow-xs">
              <Ionicons name="menu-outline" size={20} color="#0F172A" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View className="flex-row items-center gap-3 pr-3">
              <TouchableOpacity
                onPress={handleAddDebt}
                accessibilityLabel="Add debt"
                className="h-10 w-10 items-center justify-center rounded-full bg-primary-100">
                <Ionicons name="add" size={20} color="#0284C7" />
              </TouchableOpacity>
              <HeaderProfileButton />
            </View>
          ),
        }}
      />

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        <View
          className="px-5"
          style={{ paddingTop: Math.max(insets.top + 8, 32), paddingBottom: insets.bottom + 96 }}>
          <View className="mb-6 rounded-3xl border border-app-border bg-app-surface px-6 py-7 shadow-md">
            <Text className="text-sm font-medium text-app-text-muted">Debt payoff overview</Text>
            <Text className="mt-1 text-3xl font-semibold text-app-text">
              {hasDebts
                ? `${localDebts.length} active payoff plan${localDebts.length === 1 ? '' : 's'}`
                : 'No debts tracked'}
            </Text>
            {hasDebts ? (
              <View className="mt-5 space-y-2">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-app-text-muted">Outstanding balance</Text>
                  <Text className="text-base font-semibold text-app-text">
                    {formatCurrency(totals.outstanding)}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-app-text-muted">Paid off so far</Text>
                  <Text className="text-base font-semibold text-success-600">
                    {formatCurrency(totals.paidOff)}
                  </Text>
                </View>
              </View>
            ) : (
              <Text className="mt-2 text-sm text-app-text-muted">
                Capture credit cards, loans, or informal debts to see progress and stay on schedule.
              </Text>
            )}
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
              {localDebts.map((debt) => (
                <DebtCard
                  key={debt.id}
                  debt={debt}
                  category={categoryMap.get(debt.categoryId ?? 0) || null}
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
