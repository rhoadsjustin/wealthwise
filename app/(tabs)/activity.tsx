import React from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, CardContent } from '@/components/Card';
import { Input } from '@/components/Input';
import { PillSegmentedControl } from '@/components/PillSegmentedControl';
import { SectionHeaderRow } from '@/components/SectionHeaderRow';
import { Skeleton } from '@/components/Skeleton';
import { TopUtilityBar } from '@/components/TopUtilityBar';
import { TransactionRowDense } from '@/components/TransactionRowDense';
import { useAppData } from '@/app/_layout';
import type { Category, Transaction } from '@/context/DataContext';

type ActivityFilter = 'all' | 'expense' | 'income' | 'uncategorized';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(Number.isFinite(value) ? value : 0);

export default function ActivityTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { transactions, categories, summaryLoading, refreshAppData } = useAppData();
  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState<ActivityFilter>('all');
  const [refreshing, setRefreshing] = React.useState(false);

  const categoryMap = React.useMemo(
    () => new Map<number, Category>((categories ?? []).map((category: Category) => [category.id, category])),
    [categories]
  );

  const filteredTransactions = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return (transactions ?? []).filter((transaction: Transaction) => {
      if (filter === 'expense' && transaction.type !== 'expense') return false;
      if (filter === 'income' && transaction.type !== 'income') return false;
      if (filter === 'uncategorized' && transaction.categoryId != null) return false;

      if (!normalizedQuery) return true;
      const categoryName = categoryMap.get(transaction.categoryId ?? -1)?.name ?? '';
      return [transaction.description, categoryName, transaction.date]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [categoryMap, filter, query, transactions]);

  const stats = React.useMemo(() => {
    const expenseTotal = filteredTransactions.reduce((sum: number, transaction: Transaction) => {
      if (transaction.type !== 'expense') return sum;
      const amount = Number.parseFloat(transaction.amount || '0');
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);

    const uncategorizedCount = filteredTransactions.filter(
      (transaction: Transaction) => transaction.type === 'expense' && transaction.categoryId == null
    ).length;

    return {
      expenseTotal,
      transactionCount: filteredTransactions.length,
      uncategorizedCount,
    };
  }, [filteredTransactions]);

  const groupedTransactions = React.useMemo(() => {
    const groups = new Map<string, Transaction[]>();

    filteredTransactions.forEach((transaction: Transaction) => {
      const date = transaction.date.slice(0, 10);
      const bucket = groups.get(date);
      if (bucket) {
        bucket.push(transaction);
      } else {
        groups.set(date, [transaction]);
      }
    });

    return Array.from(groups.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filteredTransactions]);

  const handleRefresh = React.useCallback(async () => {
    try {
      setRefreshing(true);
      await refreshAppData();
    } finally {
      setRefreshing(false);
    }
  }, [refreshAppData]);

  if (summaryLoading && !(transactions ?? []).length) {
    return (
      <View className="flex-1 bg-app-canvas">
        <TopUtilityBar
          badge="Activity"
          actionIcon="download-outline"
          actionLabel="Open imports"
          onPressAction={() => router.push('/imports' as any)}
        />
        <ScrollView
          className="flex-1 bg-app-canvas"
          contentContainerStyle={{ paddingTop: 20, paddingBottom: insets.bottom + 100 }}
          contentContainerClassName="px-5 gap-4">
          <Skeleton className="h-16 rounded-3xl" />
          <Skeleton className="h-36 rounded-3xl" />
          <Skeleton className="h-80 rounded-3xl" />
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-app-canvas">
      <Stack.Screen options={{ headerShown: false }} />
      <TopUtilityBar
        badge="Activity"
        actionIcon="download-outline"
        actionLabel="Open imports"
        onPressAction={() => router.push('/imports' as any)}
      />
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={{ paddingTop: 20, paddingBottom: insets.bottom + 120 }}
        contentContainerClassName="px-5">
        <Text className="mb-6 text-sm leading-6 text-app-text-faint">
          Search, filter, import, and clean up your transaction stream.
        </Text>

        <Input
          variant="dark"
          value={query}
          onChangeText={setQuery}
          placeholder="Search merchants, categories, or dates"
          leftIcon={<Ionicons name="search-outline" size={18} color="#8190B3" />}
        />

        <PillSegmentedControl<ActivityFilter>
          className="mt-4"
          value={filter}
          onChange={setFilter}
          options={[
            { label: 'All', value: 'all' },
            { label: 'Expenses', value: 'expense' },
            { label: 'Income', value: 'income' },
            { label: 'Uncat', value: 'uncategorized' },
          ]}
        />

        <Card variant="glass-dark" className="mt-5">
          <CardContent>
            <SectionHeaderRow title="Flow snapshot" subtitle="Current filtered view" />
            <View className="flex-row gap-3">
              <StatCard label="Spent" value={formatCurrency(stats.expenseTotal)} />
              <StatCard label="Rows" value={String(stats.transactionCount)} />
              <StatCard label="Uncat" value={String(stats.uncategorizedCount)} />
            </View>
          </CardContent>
        </Card>

        <View className="mt-8">
          <SectionHeaderRow
            title="Imported and logged"
            subtitle="Your latest transaction stream"
            actionLabel="Bulk import"
            onPressAction={() => router.push('/imports' as any)}
          />

          {!groupedTransactions.length ? (
            <Card variant="inset">
              <CardContent>
                <Text className="text-sm text-app-text-faint">
                  No transactions match this view yet. Try a different filter or import a statement.
                </Text>
              </CardContent>
            </Card>
          ) : (
            <View className="gap-6">
              {groupedTransactions.map(([date, dayTransactions]) => (
                <View key={date}>
                  <Text className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-app-text-faint">
                    {new Date(date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                  <View className="gap-3">
                    {dayTransactions.map((transaction) => {
                      const category = categoryMap.get(transaction.categoryId ?? -1);
                      const amount = Number.parseFloat(transaction.amount || '0');
                      return (
                        <TransactionRowDense
                          key={transaction.id}
                          icon={category?.icon ?? (transaction.type === 'expense' ? '🧾' : '💸')}
                          title={transaction.description}
                          subtitle={`${category?.name ?? 'Uncategorized'} • ${transaction.date}`}
                          amount={formatCurrency(amount)}
                          tone={transaction.type === 'income' ? 'income' : 'expense'}
                          badge={transaction.categoryId == null ? 'Needs category' : null}
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
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-2xl bg-app-canvas-elevated px-3 py-4">
      <AppText variant="label-xs" className="text-app-text-faint">{label}</AppText>
      <AppText variant="metric-lg" className="mt-2 text-app-text-strong">{value}</AppText>
    </View>
  );
}
