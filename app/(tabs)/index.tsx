import { Card, CardContent } from '../../components/Card';
import { Ionicons } from '@expo/vector-icons';
import { useAppData } from '../_layout';
import BankAccountsCard from '../../components/BankAccountsCard';
import CategoryStatsCard from '../../components/CategoryStatsCard';
import { Skeleton } from '../../components/Skeleton';
import { View, Text, ScrollView, TouchableOpacity, Platform, LayoutAnimation, UIManager } from 'react-native';
import { useRouter } from 'expo-router';
import React from 'react';

export default function SpendingTab() {
  const { summary, transactions, summaryLoading, categories } = useAppData();
  const router = useRouter();

  // Enable LayoutAnimation on Android
  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  React.useEffect(() => {
    // Soft animate whenever summary or transactions update
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [summary, transactions]);

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
    <View className="bg-app-background relative flex-1">
      <ScrollView className="content-padding">
        {/* Overview Cards */}
        <View className="overview-grid">
          <Card className="card-mobile bg-app-surface shadow-lg animate-fade-in">
            <CardContent className="p-4">
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-app-text text-sm font-medium">Monthly Budget</Text>
                <Ionicons name="wallet-outline" size={16} color="#0EA5E9" />
              </View>
              <View className="space-y-2">
                <View className="flex-row items-center justify-between">
                  <Text className="text-app-text text-lg font-bold">
                    ${(summary.totalBudget - summary.remainingBudget).toFixed(0)}
                  </Text>
                  <Text className="text-app-text-muted text-xs">
                    of ${summary.totalBudget.toFixed(0)}
                  </Text>
                </View>
                <View className="bg-app-border-muted h-2 w-full rounded-full">
                  <View
                    className="progress-bar h-2 rounded-full"
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
                <Text className="text-app-text-secondary text-xs">
                  ${summary.remainingBudget.toFixed(0)} remaining
                </Text>
              </View>
            </CardContent>
          </Card>

          <Card className="card-mobile bg-app-surface shadow-lg animate-fade-in">
            <CardContent className="p-4">
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-app-text text-sm font-medium">Total Spending</Text>
                <Ionicons name="trending-down-outline" size={16} color="#EF4444" />
              </View>
              <View className="space-y-2">
                <View className="flex-row items-center justify-between">
                  <Text className="text-financial-negative text-lg font-bold">
                    ${summary.totalExpenses.toFixed(0)}
                  </Text>
                  <Text
                    className={`text-xs ${budgetPercentage < 90 ? 'text-financial-positive' : 'text-financial-negative'}`}>
                    {budgetPercentage < 90 ? '↓ On track' : '↑ Over budget'}
                  </Text>
                </View>
                <Text className="text-app-text-secondary text-xs">
                  {budgetPercentage.toFixed(0)}% of budget used
                </Text>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Recent Transactions */}
        <Card className="card-mobile bg-app-surface shadow-lg animate-fade-in">
          <CardContent className="p-4">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-app-text text-lg font-semibold">Recent Transactions</Text>
              <TouchableOpacity onPress={() => router.push('/transactions-modal')}>
                <Text className="text-sm font-medium text-blue-600">
                  View All ({safeTransactions.length})
                </Text>
              </TouchableOpacity>
            </View>
            {safeTransactions.length === 0 ? (
              <View className="items-center py-8">
                <Text className="text-app-text-secondary text-center">No transactions yet</Text>
                <Text className="text-app-text-muted mt-1 text-center text-sm">
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
                      className="flex-row items-center justify-between py-2 animate-slide-in">
                      <View className="min-w-0 flex-1 flex-row items-center">
                        <View
                          className="mr-3 h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
                          style={{ backgroundColor: `${iconInfo.color}20` }}>
                          <Text>{iconInfo.icon.includes('fa-') ? '💳' : iconInfo.icon}</Text>
                        </View>
                        <View className="min-w-0 flex-1">
                          <Text className="text-app-text text-sm font-medium" numberOfLines={1}>
                            {transaction.description}
                          </Text>
                          <Text className="text-app-text-muted text-xs">
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
    </View>
  );
}
