import { StatusBar } from 'expo-status-bar';
import {
  Platform,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import SwipeableRow from '@/components/SwipeableRow';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Card, CardContent } from '../components/Card';
import { useAppData } from './_layout';
import { useTransactions } from '../context/DataContext';
import {
  impactLight,
  selection,
  success as hapticSuccess,
  warning as hapticWarn,
} from '../lib/haptics';

export default function TransactionsModal() {
  const router = useRouter();
  const { transactions, categories } = useAppData();
  const { updateTransaction, deleteTransaction } = useTransactions();
  const [filter, setFilter] = useState<'all' | 'income' | 'expense' | 'uncategorized'>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [updatingTransactions, setUpdatingTransactions] = useState<Set<number>>(new Set());

  // Enable LayoutAnimation on Android
  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  const handleClose = () => {
    router.back();
  };

  const getTransactionIcon = (type: string, categoryId: number | null) => {
    if (type === 'income') {
      return { icon: '💰', color: '#2ECC71' };
    }

    const category = categories.find((c: any) => c.id === categoryId);
    return {
      icon: category?.icon || '🛒',
      color: category?.color || '#6B7280',
    };
  };

  const getCategoryName = (categoryId: number | null) => {
    if (!categoryId) return null;
    const category = categories.find((c: any) => c.id === categoryId);
    return category?.name || 'Unknown';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  };

  const filteredTransactions = (transactions || []).filter((transaction: any) => {
    switch (filter) {
      case 'income':
        return transaction.type === 'income';
      case 'expense':
        return transaction.type === 'expense';
      case 'uncategorized':
        return !transaction.categoryId;
      default:
        return true;
    }
  });

  const filterButtons = [
    { key: 'all', label: 'All', count: transactions?.length || 0 },
    {
      key: 'expense',
      label: 'Expenses',
      count: transactions?.filter((t: any) => t.type === 'expense').length || 0,
    },
    {
      key: 'income',
      label: 'Income',
      count: transactions?.filter((t: any) => t.type === 'income').length || 0,
    },
    {
      key: 'uncategorized',
      label: 'Uncategorized',
      count: transactions?.filter((t: any) => !t.categoryId).length || 0,
    },
  ];

  const handleCategorizeTransaction = (transaction: any) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    impactLight();
    setSelectedTransaction(transaction);
    setShowCategoryModal(true);
  };

  const handleCategorySelect = async (categoryId: number) => {
    if (selectedTransaction) {
      const transactionId = selectedTransaction.id;

      // Add to updating set for immediate UI feedback
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setUpdatingTransactions((prev) => new Set(prev).add(transactionId));

      try {
        await updateTransaction(transactionId, { categoryId });
        hapticSuccess();

        // Close modal and clear selection
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowCategoryModal(false);
        setSelectedTransaction(null);
      } catch (error) {
        console.error('Failed to update transaction:', error);
        Alert.alert('Error', 'Failed to update transaction category. Please try again.');
        hapticWarn();
      } finally {
        // Remove from updating set
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setUpdatingTransactions((prev) => {
          const newSet = new Set(prev);
          newSet.delete(transactionId);
          return newSet;
        });
      }
    }
  };

  const handleDeleteTransaction = (transactionId: number) => {
    selection();
    Alert.alert('Delete Transaction', 'Are you sure you want to delete this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setUpdatingTransactions((prev) => new Set(prev).add(transactionId));
          try {
            await deleteTransaction(transactionId);
            hapticSuccess();
          } catch (e) {
            console.error('Failed to delete transaction:', e);
            hapticWarn();
          } finally {
            setUpdatingTransactions((prev) => {
              const next = new Set(prev);
              next.delete(transactionId);
              return next;
            });
          }
        },
      },
    ]);
  };

  const handleCloseCategoryModal = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowCategoryModal(false);
    setSelectedTransaction(null);
  };

  return (
    <View className="flex-1 bg-app-background">
      {/* Header */}
      <View className="bg-app-surface-alt border-b border-app-border px-4 pb-4 pt-12">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={handleClose}
              className="mr-4 h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: '#00000010' }}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="text-xl font-semibold text-app-text">All Transactions</Text>
          </View>
          <Text className="text-sm text-app-text-secondary">
            {filteredTransactions.length} items
          </Text>
        </View>

        {/* Filter Buttons */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-4"
          contentContainerStyle={{ paddingHorizontal: 4 }}>
          <View className="flex-row gap-2">
            {filterButtons.map((button) => (
              <TouchableOpacity
                key={button.key}
                onPress={() => setFilter(button.key as any)}
                className={`rounded-full border px-4 py-2 ${
                  filter === button.key
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-app-border bg-app-surface'
                }`}>
                <View className="flex-row items-center gap-1">
                  <Text
                    className={`text-sm font-medium ${
                      filter === button.key ? 'text-blue-600' : 'text-app-text'
                    }`}>
                    {button.label}
                  </Text>
                  {button.count > 0 && (
                    <View
                      className={`rounded-full px-1.5 py-0.5 ${
                        filter === button.key ? 'bg-blue-100' : 'bg-app-border-muted'
                      }`}>
                      <Text
                        className={`text-xs font-medium ${
                          filter === button.key ? 'text-blue-600' : 'text-app-text-muted'
                        }`}>
                        {button.count}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Transactions List */}
      <ScrollView className="flex-1 px-4 pt-4">
        {filteredTransactions.length === 0 ? (
          <View className="items-center py-12">
            <Ionicons name="receipt-outline" size={48} color="#9CA3AF" />
            <Text className="mt-4 text-center text-lg text-app-text-secondary">
              No transactions found
            </Text>
            <Text className="mt-1 text-center text-app-text-muted">
              {filter === 'uncategorized'
                ? 'All your transactions are categorized!'
                : 'Start adding transactions to see them here'}
            </Text>
          </View>
        ) : (
          <View className="space-y-3 pb-6">
            {filteredTransactions.map((transaction: any, index: number) => {
              const iconInfo = getTransactionIcon(transaction.type, transaction.categoryId);
              const isExpense = transaction.type === 'expense';
              const needsCategorization = !transaction.categoryId && transaction.type === 'expense';
              const isUpdating = updatingTransactions.has(transaction.id);

              return (
                <SwipeableRow
                  key={transaction.id}
                  leftWidth={64}
                  rightWidth={128}
                  leftActions={({ close }) => (
                    <View className="h-full flex-row items-stretch">
                      <TouchableOpacity
                        onPress={() => {
                          handleCategorizeTransaction(transaction);
                          close();
                        }}
                        activeOpacity={0.9}
                        className="h-full w-16 items-center justify-center rounded-l-xl border border-success-200 bg-success-100 dark:border-success-800 dark:bg-success-900/30"
                        accessibilityLabel="Categorize">
                        <Ionicons name="pricetags-outline" size={20} color="#15803d" />
                      </TouchableOpacity>
                    </View>
                  )}
                  rightActions={({ close }) => (
                    <View className="h-full flex-row items-stretch rounded-r-xl">
                      <TouchableOpacity
                        onPress={() => {
                          selection();
                          close();
                          router.push(`/edit-transaction/${transaction.id}`);
                        }}
                        activeOpacity={0.9}
                        className="h-full w-16 items-center justify-center border border-primary-200 bg-primary-100 dark:border-primary-800 dark:bg-primary-900/30"
                        accessibilityLabel="Edit">
                        <Ionicons name="create-outline" size={20} color="#0369a1" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          handleDeleteTransaction(transaction.id);
                          close();
                        }}
                        activeOpacity={0.9}
                        className="h-full w-16 items-center justify-center rounded-r-xl border border-error-200 bg-error-100 dark:border-error-800 dark:bg-error-900/30"
                        accessibilityLabel="Delete">
                        <Ionicons name="trash-outline" size={20} color="#b91c1c" />
                      </TouchableOpacity>
                    </View>
                  )}>
                  <Card variant="default" className="bg-app-surface">
                    <CardContent className="p-4">
                      <View className="flex-row items-center justify-between">
                        <View className="min-w-0 flex-1 flex-row items-center">
                          <View
                            className="mr-3 h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
                            style={{ backgroundColor: `${iconInfo.color}20` }}>
                            <Text className="text-base">
                              {iconInfo.icon.includes('fa-') ? '💳' : iconInfo.icon}
                            </Text>
                          </View>
                          <View className="min-w-0 flex-1">
                            <Text className="text-base font-medium text-app-text" numberOfLines={1}>
                              {transaction.description}
                            </Text>
                            <View className="mt-1 flex-row items-center">
                              <Text
                                className={`text-sm ${
                                  needsCategorization
                                    ? 'text-orange-600'
                                    : 'text-app-text-secondary'
                                }`}>
                                {getCategoryName(transaction.categoryId)}
                              </Text>
                              {isUpdating ? (
                                <View className="ml-2 rounded-full bg-blue-100 px-2 py-0.5">
                                  <Text className="text-xs font-medium text-blue-600">
                                    Updating...
                                  </Text>
                                </View>
                              ) : needsCategorization ? (
                                <View className="ml-2 rounded-full bg-orange-100 px-2 py-0.5">
                                  <Text className="text-xs font-medium text-orange-600">
                                    Needs category
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                            <Text className="mt-1 text-xs text-app-text-muted">
                              {formatDate(transaction.date)}
                            </Text>
                          </View>
                        </View>
                        <View className="ml-3 flex-shrink-0 items-end">
                          <Text
                            className={`text-lg font-semibold ${
                              isExpense ? 'text-financial-negative' : 'text-financial-positive'
                            }`}>
                            {isExpense ? '-' : '+'}$
                            {Math.abs(parseFloat(transaction.amount)).toFixed(2)}
                          </Text>
                          {isUpdating && (
                            <Text className="mt-1 text-xs font-medium text-gray-400">
                              Updating...
                            </Text>
                          )}
                        </View>
                      </View>
                    </CardContent>
                  </Card>
                </SwipeableRow>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Category Selection Modal */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseCategoryModal}>
        <View className="flex-1 bg-app-background">
          <View className="border-b border-app-border bg-app-surface px-4 pb-4 pt-12">
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-semibold text-app-text">Select Category</Text>
              <TouchableOpacity
                onPress={handleCloseCategoryModal}
                className="h-8 w-8 items-center justify-center rounded-full"
                style={{ backgroundColor: '#00000010' }}>
                <Ionicons name="close" size={20} color="#374151" />
              </TouchableOpacity>
            </View>
            {selectedTransaction && (
              <View className="mt-3 rounded-lg bg-app-border-muted p-3">
                <Text className="text-sm font-medium text-app-text">
                  {selectedTransaction.description}
                </Text>
                <Text className="text-xs text-app-text-secondary">
                  ${Math.abs(parseFloat(selectedTransaction.amount)).toFixed(2)} •{' '}
                  {formatDate(selectedTransaction.date)}
                </Text>
              </View>
            )}
          </View>

          <ScrollView className="flex-1 px-4 pt-4">
            <View className="space-y-1 pb-6">
              {categories
                .filter((cat: any) => parseFloat(cat.budget) > 0) // Only show categories with budgets for expenses
                .map((category: any) => (
                  <TouchableOpacity
                    key={category.id}
                    onPress={() => handleCategorySelect(category.id)}
                    disabled={updatingTransactions.size > 0}
                    className={`rounded-lg border p-4 ${
                      updatingTransactions.size > 0 ? 'opacity-50' : ''
                    } bg-app-surface-alt border-app-border`}>
                    <View className="flex-row items-center">
                      <View
                        className="mr-3 h-10 w-10 items-center justify-center rounded-lg"
                        style={{ backgroundColor: category.color + '20' }}>
                        <Text className="text-base">{category.icon}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-medium text-app-text">{category.name}</Text>
                        <Text className="text-sm text-app-text-secondary">
                          Budget: ${parseFloat(category.budget).toFixed(2)}
                        </Text>
                      </View>
                      {updatingTransactions.size > 0 ? (
                        <Text className="text-xs text-gray-400">Updating...</Text>
                      ) : (
                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
            </View>
          </ScrollView>
        </View>
      </Modal>

      <StatusBar style={Platform.OS === 'ios' ? 'dark' : 'auto'} />
    </View>
  );
}
