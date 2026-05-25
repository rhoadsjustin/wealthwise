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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SwipeableRow from '@/components/SwipeableRow';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Card, CardContent } from '../components/Card';
import { AppText } from '@/components/AppText';
import { useAppData } from './_layout';
import { useTransactions } from '../context/DataContext';
import {
  impactLight,
  selection,
  success as hapticSuccess,
  warning as hapticWarn,
} from '../lib/haptics';
import categorizer from '@/lib/ai/categorizer';

export default function TransactionsModal() {
  const router = useRouter();
  const { transactions, categories } = useAppData();
  const { updateTransaction, deleteTransaction, getTransactions } = useTransactions();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<'all' | 'income' | 'expense' | 'uncategorized'>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [updatingTransactions, setUpdatingTransactions] = useState<Set<number>>(new Set());
  const [isAutoCategorizing, setIsAutoCategorizing] = useState(false);

  // Enable LayoutAnimation on Android
  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  const handleClose = () => {
    router.back();
  };

  const handleAutoCategorize = async () => {
    if (!transactions || transactions.length === 0) return;
    try {
      setIsAutoCategorizing(true);
      const uncategorized = transactions.filter((t: any) => t.type === 'expense' && !t.categoryId);
      const cats = categories;
      for (const tx of uncategorized.slice(0, 100)) {
        try {
          const s = await categorizer.suggestCategory({ description: tx.description }, cats);
          if (s.categoryId && s.confidence >= 0.7) {
            await updateTransaction(tx.id, { categoryId: s.categoryId });
          }
        } catch {}
      }
      await getTransactions();
    } catch (e) {
      console.warn('Auto-categorize failed', e);
    } finally {
      setIsAutoCategorizing(false);
    }
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
    <View className="flex-1 bg-app-canvas">
      <View className="px-5" style={{ paddingTop: Math.max(insets.top + 8, 24) }}>
        <View className="mb-4 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={handleClose}
              accessibilityLabel="Close transactions"
              className="mr-3 h-10 w-10 items-center justify-center rounded-full border border-app-border-strong bg-app-surface-2 shadow-xs">
              <Ionicons name="close" size={20} color="#8190B3" />
            </TouchableOpacity>
            <View>
              <AppText variant="page-title" className="text-app-text-strong">All transactions</AppText>
              <AppText variant="hint" className="mt-1 text-app-text-faint">
                {filteredTransactions.length} item{filteredTransactions.length === 1 ? '' : 's'}
              </AppText>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/add-transaction')}
            className="h-10 items-center justify-center rounded-full bg-primary-500 px-4"
            accessibilityLabel="Add transaction">
              <Text className="text-xs font-semibold text-white">Add</Text>
          </TouchableOpacity>
        </View>

        <View className="mb-6 rounded-3xl border border-app-border-strong bg-app-surface-1 px-5 py-5 shadow-md">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <AppText variant="form-label" className="text-app-text-faint">Quick filters</AppText>
              <AppText variant="title" className="mt-1 text-app-text-strong">
                Zero in on the transactions you need
              </AppText>
            </View>
            <TouchableOpacity
              onPress={handleAutoCategorize}
              disabled={isAutoCategorizing}
              className={`rounded-full px-4 py-2 ${
                isAutoCategorizing
                  ? 'border border-app-border-strong bg-app-surface-1 opacity-60'
                  : 'bg-app-surface-2'
              }`}
              accessibilityLabel="Auto categorize">
              <AppText
                variant="caption"
                className={isAutoCategorizing ? 'text-app-text-faint' : 'text-app-text-soft'}>
                {isAutoCategorizing ? 'Categorizing…' : 'Auto-categorize'}
              </AppText>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-4"
            contentContainerStyle={{ paddingHorizontal: 2 }}>
            <View className="flex-row gap-2">
              {filterButtons.map((button) => {
                const isActive = filter === button.key;
                return (
                  <TouchableOpacity
                    key={button.key}
                    onPress={() => setFilter(button.key as any)}
                    className={`flex-row items-center gap-2 rounded-full border px-4 py-2 ${
                      isActive
                        ? 'border-app-border-contrast bg-app-surface-3'
                        : 'border-app-border-strong bg-app-surface-2'
                    }`}>
                    <AppText
                      variant="form-label"
                      className={isActive ? 'text-app-text-strong' : 'text-app-text-soft'}>
                      {button.label}
                    </AppText>
                    {button.count > 0 && (
                      <View
                        className={`rounded-full px-2 py-0.5 ${
                          isActive ? 'bg-app-surface-2' : 'bg-app-border-muted'
                        }`}>
                        <AppText
                          variant="caption"
                          className={isActive ? 'text-app-text-strong' : 'text-app-text-faint'}>
                          {button.count}
                        </AppText>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Transactions List */}
      <ScrollView className="flex-1" contentContainerClassName="px-5 pt-2 pb-28">
        {filteredTransactions.length === 0 ? (
          <View className="items-center py-12">
            <Ionicons name="receipt-outline" size={48} color="#9CA3AF" />
            <AppText variant="section" className="mt-4 text-center text-app-text-soft">
              No transactions found
            </AppText>
            <AppText variant="body" className="mt-1 text-center text-app-text-faint">
              {filter === 'uncategorized'
                ? 'All your transactions are categorized!'
                : 'Start adding transactions to see them here'}
            </AppText>
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
                  <Card variant="default" className="bg-app-surface-1">
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
                            <AppText variant="title" className="text-app-text-strong" numberOfLines={1}>
                              {transaction.description}
                            </AppText>
                            <View className="mt-1 flex-row items-center">
                              <AppText
                                variant="body"
                                className={`${
                                  needsCategorization
                                    ? 'text-warning-600'
                                    : 'text-app-text-soft'
                                }`}>
                                {getCategoryName(transaction.categoryId)}
                              </AppText>
                              {isUpdating ? (
                                <View className="ml-2 rounded-full bg-primary-100 px-2 py-0.5">
                                  <AppText variant="caption" className="text-primary-600">
                                    Updating...
                                  </AppText>
                                </View>
                              ) : needsCategorization ? (
                                <View className="ml-2 rounded-full bg-warning-100 px-2 py-0.5">
                                  <AppText variant="caption" className="text-warning-600">
                                    Needs category
                                  </AppText>
                                </View>
                              ) : null}
                            </View>
                            <AppText variant="hint" className="mt-1 text-app-text-faint">
                              {formatDate(transaction.date)}
                            </AppText>
                          </View>
                        </View>
                        <View className="ml-3 flex-shrink-0 items-end">
                          <AppText
                            variant="metric-lg"
                            className={isExpense ? 'text-financial-negative' : 'text-financial-positive'}>
                            {isExpense ? '-' : '+'}$
                            {Math.abs(parseFloat(transaction.amount)).toFixed(2)}
                          </AppText>
                          {isUpdating && (
                            <AppText variant="hint" className="mt-1 text-app-text-faint">
                              Updating...
                            </AppText>
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
        <View className="flex-1 bg-app-canvas">
          <View className="px-5" style={{ paddingTop: Math.max(insets.top + 8, 24) }}>
            <View className="mb-4 flex-row items-center justify-between">
              <View>
                <AppText variant="title" className="text-app-text-strong">Select category</AppText>
                {selectedTransaction && (
                  <AppText variant="hint" className="mt-1 text-app-text-faint">
                    ${Math.abs(parseFloat(selectedTransaction.amount)).toFixed(2)} •{' '}
                    {formatDate(selectedTransaction.date)}
                  </AppText>
                )}
              </View>
              <TouchableOpacity
                onPress={handleCloseCategoryModal}
                accessibilityLabel="Close category selector"
                className="h-10 w-10 items-center justify-center rounded-full border border-app-border-strong bg-app-surface-2 shadow-xs">
                <Ionicons name="close" size={20} color="#8190B3" />
              </TouchableOpacity>
            </View>

            {selectedTransaction && (
              <View className="mb-6 rounded-2xl border border-app-border-strong bg-app-surface-1 px-4 py-3">
                <AppText variant="body" className="text-app-text-strong">
                  {selectedTransaction.description}
                </AppText>
                <AppText variant="hint" className="mt-1 text-app-text-faint">
                  Choose the best matching category below
                </AppText>
              </View>
            )}
          </View>

          <ScrollView className="flex-1" contentContainerClassName="px-5 pb-24">
            <View className="space-y-3">
              {categories
                .filter((cat: any) => parseFloat(cat.budget) > 0)
                .map((category: any) => (
                  <TouchableOpacity
                    key={category.id}
                    onPress={() => handleCategorySelect(category.id)}
                    disabled={updatingTransactions.size > 0}
                    className={`flex-row items-center justify-between rounded-2xl border border-app-border-strong bg-app-surface-1 px-4 py-4 shadow-xs ${
                      updatingTransactions.size > 0 ? 'opacity-50' : ''
                    }`}>
                    <View className="flex-row items-center">
                      <View
                        className="mr-3 h-10 w-10 items-center justify-center rounded-xl"
                        style={{ backgroundColor: category.color + '20' }}>
                        <Text className="text-base">{category.icon}</Text>
                      </View>
                      <View>
                        <AppText variant="title" className="text-app-text-strong">
                          {category.name}
                        </AppText>
                        <AppText variant="hint" className="text-app-text-faint">
                          Budget ${parseFloat(category.budget).toFixed(2)}
                        </AppText>
                      </View>
                    </View>
                    {updatingTransactions.size > 0 ? (
                      <AppText variant="hint" className="text-app-text-faint">Updating…</AppText>
                    ) : (
                      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                    )}
                  </TouchableOpacity>
                ))}
            </View>
          </ScrollView>
        </View>
      </Modal>

      <StatusBar style="light" />
    </View>
  );
}
