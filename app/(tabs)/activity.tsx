import React, { useDeferredValue } from 'react';
import {
  Alert,
  LayoutAnimation,
  Modal,
  Platform,
  RefreshControl,
  SectionList,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { AppText } from '@/components/AppText';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, CardContent } from '@/components/Card';
import { Input } from '@/components/Input';
import { PillSegmentedControl } from '@/components/PillSegmentedControl';
import { SectionHeaderRow } from '@/components/SectionHeaderRow';
import { Skeleton } from '@/components/Skeleton';
import { TopUtilityBar } from '@/components/TopUtilityBar';
import { useActivityData, useAppData } from '@/app/_layout';
import { useData, type Category, type Transaction } from '@/context/DataContext';
import {
  deriveActivityState,
  formatActivityShortDate,
  type ActivityFilter,
  type ActivityRow,
  type ActivitySection,
} from '@/lib/activityDerived';
import { ActivityTransactionRow } from '@/components/activity/ActivityTransactionRow';
import {
  impactLight,
  selection,
  success as hapticSuccess,
  warning as hapticWarn,
} from '@/lib/haptics';
import { indexCategoryDocs, suggestCategory } from '@/lib/ai/categorizer';

const EMPTY_SECTIONS: ActivitySection[] = [];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(Number.isFinite(value) ? value : 0);

export default function ActivityTab() {
  const router = useRouter();
  const params = useLocalSearchParams<{ highlightId?: string; openEdit?: string }>();
  const insets = useSafeAreaInsets();
  const { transactions, categories, activityLoading, refreshActivityData } = useActivityData();
  const { refreshSummaryData } = useAppData();
  const { updateTransaction, deleteTransaction, getCategories } = useData();
  const listRef = React.useRef<SectionList<ActivityRow, ActivitySection> | null>(null);
  const [searchInput, setSearchInput] = React.useState('');
  const [filter, setFilter] = React.useState<ActivityFilter>('all');
  const [refreshing, setRefreshing] = React.useState(false);
  const [selectedTransaction, setSelectedTransaction] = React.useState<Transaction | null>(null);
  const [showCategoryModal, setShowCategoryModal] = React.useState(false);
  const [updatingTransactions, setUpdatingTransactions] = React.useState<Set<number>>(new Set());
  const [isAutoCategorizing, setIsAutoCategorizing] = React.useState(false);
  const [highlightedTransactionId, setHighlightedTransactionId] = React.useState<number | null>(null);
  const deferredQuery = useDeferredValue(searchInput);

  React.useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const derivedState = React.useMemo(
    () =>
      deriveActivityState({
        transactions,
        categories,
        filter,
        query: deferredQuery,
        updatingTransactionIds: updatingTransactions,
      }),
    [transactions, categories, filter, deferredQuery, updatingTransactions]
  );

  const highlightTransactionId = React.useMemo(() => {
    const nextId = Number(params.highlightId);
    return Number.isFinite(nextId) ? nextId : null;
  }, [params.highlightId]);

  const sectionLocationByTransactionId = React.useMemo(() => {
    const nextMap = new Map<number, { sectionIndex: number; itemIndex: number }>();

    derivedState.sections.forEach((section, sectionIndex) => {
      section.data.forEach((row, itemIndex) => {
        nextMap.set(row.transaction.id, { sectionIndex, itemIndex });
      });
    });

    return nextMap;
  }, [derivedState.sections]);

  React.useEffect(() => {
    if (!highlightTransactionId) return;

    const location = sectionLocationByTransactionId.get(highlightTransactionId);
    if (!location) return;

    setHighlightedTransactionId(highlightTransactionId);

    const frame = requestAnimationFrame(() => {
      listRef.current?.scrollToLocation({
        sectionIndex: location.sectionIndex,
        itemIndex: location.itemIndex,
        animated: true,
        viewOffset: 132,
      });
    });

    const timeout = setTimeout(() => {
      setHighlightedTransactionId((current) =>
        current === highlightTransactionId ? null : current
      );
    }, 2600);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timeout);
    };
  }, [highlightTransactionId, sectionLocationByTransactionId]);

  React.useEffect(() => {
    if (params.openEdit !== '1' || !highlightTransactionId) return;
    if (!sectionLocationByTransactionId.has(highlightTransactionId)) return;

    router.replace('/activity');
    router.push(`/edit-transaction/${highlightTransactionId}`);
  }, [highlightTransactionId, params.openEdit, router, sectionLocationByTransactionId]);

  const handleRefresh = React.useCallback(async () => {
    try {
      setRefreshing(true);
      await Promise.all([refreshActivityData(), refreshSummaryData()]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshActivityData, refreshSummaryData]);

  const closeCategoryModal = React.useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowCategoryModal(false);
    setSelectedTransaction(null);
  }, []);

  const openCategoryModal = React.useCallback(async (transaction: Transaction) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    await impactLight();
    setSelectedTransaction(transaction);
    setShowCategoryModal(true);
  }, []);

  const markUpdating = React.useCallback((transactionId: number, next: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setUpdatingTransactions((current) => {
      const updated = new Set(current);
      if (next) {
        updated.add(transactionId);
      } else {
        updated.delete(transactionId);
      }
      return updated;
    });
  }, []);

  const refreshAfterTransactionChange = React.useCallback(async () => {
    await Promise.all([refreshActivityData(), refreshSummaryData()]);
  }, [refreshActivityData, refreshSummaryData]);

  const handleCategorySelect = React.useCallback(
    async (categoryId: number | null) => {
      if (!selectedTransaction?.id) return;
      const transactionId = selectedTransaction.id;

      markUpdating(transactionId, true);
      try {
        await updateTransaction(transactionId, { categoryId });
        await refreshAfterTransactionChange();
        await hapticSuccess();
        closeCategoryModal();
      } catch (error) {
        console.error('Failed to update transaction category:', error);
        Alert.alert('Error', 'Failed to update transaction category. Please try again.');
        await hapticWarn();
      } finally {
        markUpdating(transactionId, false);
      }
    },
    [
      closeCategoryModal,
      markUpdating,
      refreshAfterTransactionChange,
      selectedTransaction,
      updateTransaction,
    ]
  );

  const handleDeleteTransaction = React.useCallback(
    (transactionId: number) => {
      selection();
      Alert.alert('Delete Transaction', 'Are you sure you want to delete this transaction?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            markUpdating(transactionId, true);
            try {
              await deleteTransaction(transactionId);
              await refreshAfterTransactionChange();
              await hapticSuccess();
            } catch (error) {
              console.error('Failed to delete transaction:', error);
              await hapticWarn();
            } finally {
              markUpdating(transactionId, false);
            }
          },
        },
      ]);
    },
    [deleteTransaction, markUpdating, refreshAfterTransactionChange]
  );

  const handleAutoCategorize = React.useCallback(async () => {
    if (!transactions.length) return;

    try {
      setIsAutoCategorizing(true);
      const uncategorized = transactions.filter(
        (transaction) => transaction.type === 'expense' && transaction.categoryId == null
      );
      if (!uncategorized.length) {
        return;
      }

      const latestCategories = await getCategories();
      await indexCategoryDocs(latestCategories);

      let updatedCount = 0;
      for (const transaction of uncategorized.slice(0, 100)) {
        try {
          const suggestion = await suggestCategory(
            { description: transaction.description },
            latestCategories
          );
          if (suggestion.categoryId && suggestion.confidence >= 0.7) {
            await updateTransaction(transaction.id, { categoryId: suggestion.categoryId });
            updatedCount += 1;
          }
        } catch {}
      }

      await refreshAfterTransactionChange();
      if (updatedCount > 0) {
        await hapticSuccess();
      }
    } catch (error) {
      console.warn('Auto-categorize failed', error);
      await hapticWarn();
    } finally {
      setIsAutoCategorizing(false);
    }
  }, [getCategories, refreshAfterTransactionChange, transactions, updateTransaction]);

  const handleQueryChange = React.useCallback((value: string) => {
    setSearchInput(value);
  }, []);

  const handleFilterChange = React.useCallback((value: ActivityFilter) => {
    startTransition(() => {
      setFilter(value);
    });
  }, []);

  const handleOpenEdit = React.useCallback(
    (transactionId: number) => {
      router.push(`/edit-transaction/${transactionId}`);
    },
    [router]
  );

  const renderHeader = React.useMemo(
    () => (
      <View>
        <Text className="mb-6 text-sm leading-6 text-app-text-faint">
          Search, filter, import, and clean up your transaction stream.
        </Text>

        <Input
          variant="dark"
          value={searchInput}
          onChangeText={handleQueryChange}
          placeholder="Search merchants, categories, or dates"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          leftIcon={<Ionicons name="search-outline" size={18} color="#8190B3" />}
        />

        <PillSegmentedControl<ActivityFilter>
          className="mt-4"
          value={filter}
          onChange={handleFilterChange}
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
              <StatCard label="Spent" value={formatCurrency(derivedState.expenseTotal)} />
              <StatCard label="Rows" value={String(derivedState.transactionCount)} />
              <StatCard label="Uncat" value={String(derivedState.uncategorizedCount)} />
            </View>
          </CardContent>
        </Card>

        <View className="mt-8">
          <SectionHeaderRow
            title="Imported and logged"
            subtitle="Swipe for actions, tap a row to edit it"
            actionLabel={isAutoCategorizing ? 'Categorizing…' : 'Auto-categorize'}
            onPressAction={handleAutoCategorize}
          />
        </View>
      </View>
    ),
    [
      derivedState.expenseTotal,
      derivedState.transactionCount,
      derivedState.uncategorizedCount,
      filter,
      handleAutoCategorize,
      handleFilterChange,
      handleQueryChange,
      isAutoCategorizing,
      searchInput,
    ]
  );

  const renderSectionHeader = React.useCallback(
    ({ section }: { section: ActivitySection }) => (
      <Text className="mb-3 mt-2 text-xs font-medium uppercase tracking-[0.12em] text-app-text-faint">
        {section.title}
      </Text>
    ),
    []
  );

  const renderItem = React.useCallback(
    ({ item }: { item: ActivityRow }) => {
      const transactionId = item.transaction.id;
      return (
        <View className="mb-3">
          <ActivityTransactionRow
            row={item}
            subtitle={`${item.categoryLabel} • ${formatActivityShortDate(item.transaction.date)}`}
            highlighted={highlightedTransactionId === transactionId}
            onPress={() => handleOpenEdit(transactionId)}
            onEditAction={() => {
              void selection();
              handleOpenEdit(transactionId);
            }}
            onOpenCategory={() => void openCategoryModal(item.transaction)}
            onDelete={() => handleDeleteTransaction(transactionId)}
          />
        </View>
      );
    },
    [handleDeleteTransaction, handleOpenEdit, highlightedTransactionId, openCategoryModal]
  );

  const keyExtractor = React.useCallback((item: ActivityRow) => String(item.transaction.id), []);

  if (activityLoading && !transactions.length) {
    return (
      <View className="flex-1 bg-app-canvas">
        <TopUtilityBar
          badge="Activity"
          actionIcon="download-outline"
          actionLabel="Open imports"
          onPressAction={() => router.push('/imports' as any)}
        />
        <View className="px-5" style={{ paddingTop: 20, paddingBottom: insets.bottom + 100 }}>
          <Skeleton className="h-16 rounded-3xl" />
          <Skeleton className="mt-4 h-36 rounded-3xl" />
          <Skeleton className="mt-4 h-80 rounded-3xl" />
        </View>
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

      <SectionList
        ref={listRef}
        className="flex-1"
        sections={derivedState.sections.length ? derivedState.sections : EMPTY_SECTIONS}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <Card variant="inset">
            <CardContent>
              <Text className="text-sm text-app-text-faint">
                No transactions match this view yet. Try a different filter or import a statement.
              </Text>
            </CardContent>
          </Card>
        }
        contentContainerStyle={{
          paddingTop: 20,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: 20,
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={12}
        maxToRenderPerBatch={8}
        windowSize={8}
        removeClippedSubviews={Platform.OS === 'android'}
        stickySectionHeadersEnabled={false}
      />

      <Modal
        visible={showCategoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeCategoryModal}>
        <View className="flex-1 bg-app-canvas">
          <View className="px-5" style={{ paddingTop: Math.max(insets.top + 8, 24) }}>
            <View className="mb-4 flex-row items-center justify-between">
              <View>
                <AppText variant="title" className="text-app-text-strong">
                  Select category
                </AppText>
                {selectedTransaction ? (
                  <AppText variant="hint" className="mt-1 text-app-text-faint">
                    {formatCurrency(Math.abs(Number.parseFloat(selectedTransaction.amount || '0')))}{' '}
                    • {formatActivityShortDate(selectedTransaction.date)}
                  </AppText>
                ) : null}
              </View>
              <TouchableOpacity
                onPress={closeCategoryModal}
                accessibilityLabel="Close category selector"
                className="h-10 w-10 items-center justify-center rounded-full border border-app-border bg-app-surface-2">
                <Ionicons name="close" size={20} color="#8190B3" />
              </TouchableOpacity>
            </View>

            {selectedTransaction ? (
              <View className="mb-6 rounded-2xl border border-app-border bg-app-surface-1 px-4 py-3">
                <AppText variant="body" className="text-app-text-strong">
                  {selectedTransaction.description}
                </AppText>
                <AppText variant="hint" className="mt-1 text-app-text-faint">
                  Choose the best matching category below.
                </AppText>
              </View>
            ) : null}
          </View>

          <SectionList
            sections={[{ title: 'categories', data: categories }]}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <CategoryOptionRow
                category={item}
                disabled={updatingTransactions.size > 0}
                onPress={() => void handleCategorySelect(item.id)}
              />
            )}
            ListHeaderComponent={
              <View className="px-5">
                <TouchableOpacity
                  onPress={() => void handleCategorySelect(null)}
                  disabled={updatingTransactions.size > 0}
                  className={`mb-3 flex-row items-center justify-between rounded-2xl border border-app-border bg-app-surface-1 px-4 py-4 ${
                    updatingTransactions.size > 0 ? 'opacity-50' : ''
                  }`}>
                  <View className="flex-row items-center gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-app-canvas-elevated">
                      <Text className="text-base">🧾</Text>
                    </View>
                    <View>
                      <AppText variant="title" className="text-app-text-strong">
                        Uncategorized
                      </AppText>
                      <AppText variant="hint" className="text-app-text-faint">
                        Keep this row uncategorized for now
                      </AppText>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            }
            renderSectionHeader={() => null}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 96 }}
            ItemSeparatorComponent={() => <View className="h-3" />}
          />
        </View>
      </Modal>
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-2xl bg-app-canvas-elevated px-3 py-4">
      <AppText variant="label-xs" className="text-app-text-faint">
        {label}
      </AppText>
      <AppText variant="metric-lg" className="mt-2 text-app-text-strong">
        {value}
      </AppText>
    </View>
  );
}

function CategoryOptionRow({
  category,
  disabled,
  onPress,
}: {
  category: Category;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className={`flex-row items-center justify-between rounded-2xl border border-app-border bg-app-surface-1 px-4 py-4 ${
        disabled ? 'opacity-50' : ''
      }`}>
      <View className="flex-row items-center gap-3">
        <View
          className="h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${category.color}20` }}>
          <Text className="text-base">{category.icon}</Text>
        </View>
        <View>
          <AppText variant="title" className="text-app-text-strong">
            {category.name}
          </AppText>
          <AppText variant="hint" className="text-app-text-faint">
            Monthly budget {formatCurrency(Number.parseFloat(category.budget || '0'))}
          </AppText>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </TouchableOpacity>
  );
}
