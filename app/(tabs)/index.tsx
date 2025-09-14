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

export default function SpendingTab() {
  const { summary, transactions, summaryLoading, categories, refreshAppData } = useAppData();
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);
  const [showSeeAll, setShowSeeAll] = React.useState(false);
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

  // Show loading state while data is loading
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

  const budgetPercentage =
    summary.totalBudget > 0
      ? ((summary.totalBudget - summary.remainingBudget) / summary.totalBudget) * 100
      : 0;

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
        <View className="flex-row gap-3">
          <Card className="card-mobile flex-1 bg-app-surface">
            <CardContent className="p-3">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-xs font-medium text-app-text">Monthly Budget</Text>
                <Ionicons name="wallet-outline" size={16} color="#0EA5E9" />
              </View>
              <View className="space-y-1">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-semibold text-app-text">
                    ${(summary.totalBudget - summary.remainingBudget).toFixed(0)}
                  </Text>
                  <Text className="text-[11px] text-app-text-muted">
                    of ${summary.totalBudget.toFixed(0)}
                  </Text>
                </View>
                <View className="h-1.5 w-full rounded-full bg-app-border-muted">
                  <View
                    className="progress-bar h-1.5 rounded-full"
                    style={{
                      width: `${Math.min(budgetPercentage, 100)}%`,
                      backgroundColor:
                        budgetPercentage >= 90
                          ? '#EF4444'
                          : budgetPercentage >= 70
                            ? '#F59E0B'
                            : '#22C55E',
                    }}
                  />
                </View>
                <Text className="text-[11px] text-app-text-secondary">
                  ${summary.remainingBudget.toFixed(0)} remaining
                </Text>
              </View>
            </CardContent>
          </Card>

          <Card className="card-mobile flex-1 bg-app-surface">
            <CardContent className="p-3">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-xs font-medium text-app-text">Total Spending</Text>
                <Ionicons name="trending-down-outline" size={16} color="#EF4444" />
              </View>
              <View className="space-y-1">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-semibold text-financial-negative">
                    ${summary.totalExpenses.toFixed(0)}
                  </Text>
                  <Text
                    className={`text-[11px] ${budgetPercentage < 90 ? 'text-financial-positive' : 'text-financial-negative'}`}>
                    {budgetPercentage < 90 ? '↓ On track' : '↑ Over budget'}
                  </Text>
                </View>
                <Text className="text-[11px] text-app-text-secondary">
                  {budgetPercentage.toFixed(0)}% of budget used
                </Text>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Recent Transactions */}
        <Card className="card-mobile bg-app-surface">
          <CardContent className="p-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-app-text">Recent Transactions</Text>
              <TouchableOpacity onPress={() => router.push('/transactions-modal')}>
                <Text className="text-sm font-medium text-blue-600">
                  View All ({safeTransactions.length})
                </Text>
              </TouchableOpacity>
            </View>
            {safeTransactions.length === 0 ? (
              <View className="items-center py-8">
                <Text className="text-center text-app-text-secondary">No transactions yet</Text>
                <Text className="mt-1 text-center text-sm text-app-text-muted">
                  Add your first transaction to get started
                </Text>
              </View>
            ) : (
              <View className="space-y-3">
                {safeTransactions.slice(0, 8).map((transaction: any) => {
                  const iconInfo = getTransactionIcon(transaction.type, transaction.categoryId);
                  const isExpense = transaction.type === 'expense';

                  return (
                    <View
                      key={transaction.id}
                      className="flex-row items-center justify-between py-1.5">
                      <View className="min-w-0 flex-1 flex-row items-center">
                        <View
                          className="mr-3 h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
                          style={{ backgroundColor: `${iconInfo.color}20` }}>
                          <Text>{iconInfo.icon.includes('fa-') ? '💳' : iconInfo.icon}</Text>
                        </View>
                        <View className="min-w-0 flex-1">
                          <Text className="text-sm font-medium text-app-text" numberOfLines={1}>
                            {transaction.description}
                          </Text>
                          <Text className="text-[11px] text-app-text-muted">
                            {getCategoryName(transaction.categoryId)} •{' '}
                            {formatDate(transaction.date)}
                          </Text>
                        </View>
                      </View>
                      <View className="ml-3 flex-shrink-0 items-end">
                        <Text
                          className={`text-sm font-medium ${isExpense ? 'text-financial-negative' : 'text-financial-positive'}`}>
                          {isExpense ? '-' : '+'}$
                          {Math.abs(parseFloat(transaction.amount)).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </CardContent>
        </Card>

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
