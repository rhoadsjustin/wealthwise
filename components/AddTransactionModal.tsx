import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from './Button';
import { Input } from './Input';
import { Label } from './Label';
// Drop custom Select for categories; use a simple scrollable list
// RadioGroup removed in favor of a segmented toggle
import { useForm } from 'react-hook-form';
// Removed react-query; use DataContext directly
import { useToast } from '../context/useToast';
import { useData } from '../context/DataContext';
import { useAppData } from '@/app/_layout';
import { Ionicons } from '@expo/vector-icons';
import CreateCategoryModal from './CreateCategoryModal';
import { selection, success as hapticSuccess } from '../lib/haptics';
import type { Transaction as Tx } from '@/lib/schema/schema';

interface TransactionFormData {
  description: string;
  amount: string;
  type: 'income' | 'expense';
  categoryId?: number | null;
  date?: string;
}

interface AddTransactionModalProps {
  onClose: () => void;
  mode?: 'create' | 'edit';
  initialTransaction?: Tx | null;
}

export default function AddTransactionModal({ onClose, mode = 'create', initialTransaction = null }: AddTransactionModalProps) {
  const { toast } = useToast();
  const { createTransaction, updateTransaction, getCategories } = useData();
  const { refreshAppData } = useAppData();
  const [submitting, setSubmitting] = React.useState(false);
  const [categories, setCategories] = React.useState<any[]>([]);
  const [showCreateCategory, setShowCreateCategory] = React.useState(false);

  // Load categories on component mount
  const loadCategories = React.useCallback(async () => {
    try {
      const categoryData = await getCategories();
      setCategories(categoryData);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, [getCategories]);

  React.useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const {
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<TransactionFormData>({
    defaultValues: {
      type: 'expense',
    },
  });

  const transactionType = watch('type');
  const amountRaw = watch('amount') || '';
  const [amountDisplay, setAmountDisplay] = React.useState('');

  useEffect(() => {
    // Keep display string in sync when raw value changes programmatically
    if (!amountRaw) {
      setAmountDisplay('');
      return;
    }
    const num = Number(amountRaw);
    if (!isNaN(num)) {
      try {
        const formatted = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(num);
        setAmountDisplay(formatted);
      } catch {
        setAmountDisplay(`$${num.toFixed(2)}`);
      }
    }
  }, [amountRaw]);

  // Clear categoryId when switching to income type and reset form properly
  useEffect(() => {
    if (transactionType === 'income') {
      setValue('categoryId', null);
    }
  }, [transactionType, setValue]);

  // Initialize/reset form on open and when switching modes or initialTransaction changes
  useEffect(() => {
    if (mode === 'edit' && initialTransaction) {
      reset({
        type: initialTransaction.type,
        description: initialTransaction.description || '',
        amount: initialTransaction.amount || '',
        categoryId: initialTransaction.type === 'income' ? null : (initialTransaction.categoryId ?? null),
        date: initialTransaction.date,
      });
    } else {
      reset({
        type: 'expense',
        description: '',
        amount: '',
        categoryId: null,
      });
    }
  }, [reset, mode, initialTransaction]);

  const submitSave = async (data: TransactionFormData) => {
    try {
      setSubmitting(true);
      const transactionData = {
        description: data.description.trim(),
        amount: data.amount,
        type: data.type,
        categoryId: data.type === 'income' ? null : data.categoryId || null,
        date: data.date || (mode === 'edit' && initialTransaction?.date) || new Date().toISOString().split('T')[0],
      } as const;

      if (mode === 'edit' && initialTransaction?.id != null) {
        await updateTransaction(initialTransaction.id, transactionData as any);
      } else {
        await createTransaction(transactionData as any);
      }
      // Ensure dashboard reflects the addition immediately
      await refreshAppData();
      hapticSuccess();
      toast({
        title: mode === 'edit' ? 'Transaction Updated' : 'Transaction Added',
        description:
          mode === 'edit' ? 'Your changes have been saved.' : 'Your transaction has been successfully added.',
      });
      reset();
      onClose();
    } catch (error) {
      console.error('Transaction creation error:', error);
      toast({
        title: 'Error',
        description: 'Failed to add transaction. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = (data: TransactionFormData) => {
    // Basic validation
    if (!data.description?.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Description is required',
        variant: 'destructive',
      });
      return;
    }

    if (!data.amount?.trim() || isNaN(parseFloat(data.amount)) || parseFloat(data.amount) <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Amount must be a positive number',
        variant: 'destructive',
      });
      return;
    }

    // Prepare clean data for submission
    const submitData: TransactionFormData = {
      description: data.description.trim(),
      amount: data.amount,
      type: data.type,
      categoryId: data.type === 'income' ? null : data.categoryId || null,
      date: new Date().toISOString().split('T')[0],
    };

    submitSave(submitData);
  };

  return (
    <View className="flex-1 bg-background-primary">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1">
        {/* Header (safe-area aware). Mark non-collapsable for formSheet+ScrollView layout rule */}
        <SafeAreaView edges={['top']} className="bg-app-surface" collapsable={false}>
          <View className="border-b border-border-default px-6 pb-4 pt-2">
            <View className="items-center">
              <View
                className="mb-3 h-1.5 w-12 rounded-full bg-border-default"
                accessibilityElementsHidden
              />
              <Text className="text-lg font-semibold text-foreground-primary">{mode === 'edit' ? 'Edit Transaction' : 'Add Transaction'}</Text>
            </View>
          </View>
        </SafeAreaView>

        {/* Content + sticky action container to keep screen within 2 direct children */}
        <View style={{ flex: 1, position: 'relative' }}>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 220 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {/* Form Content */}
            <View className="flex-1 px-6 py-6">
              {/* Type Segmented Toggle (moved below header to avoid overlap) */}
              <View className="mb-4 flex-row rounded-xl bg-background-secondary p-1">
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Set transaction type to expense"
                  activeOpacity={0.8}
                  onPress={() => {
                    if (transactionType !== 'expense') selection();
                    setValue('type', 'expense');
                  }}
                  className={`flex-1 items-center rounded-lg px-4 py-2 ${
                    transactionType === 'expense' ? 'bg-primary-500' : 'bg-transparent'
                  }`}>
                  <Text
                    className={`text-sm font-medium ${
                      transactionType === 'expense'
                        ? 'text-foreground-inverse'
                        : 'text-foreground-primary'
                    }`}>
                    Expense
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Set transaction type to income"
                  activeOpacity={0.8}
                  onPress={() => {
                    if (transactionType !== 'income') selection();
                    setValue('type', 'income');
                  }}
                  className={`flex-1 items-center rounded-lg px-4 py-2 ${
                    transactionType === 'income' ? 'bg-success-500' : 'bg-transparent'
                  }`}>
                  <Text
                    className={`text-sm font-medium ${
                      transactionType === 'income'
                        ? 'text-foreground-inverse'
                        : 'text-foreground-primary'
                    }`}>
                    Income
                  </Text>
                </TouchableOpacity>
              </View>
              <View className="space-y-6">
                {/* Description Field */}
                <View>
                  <Label className="mb-2 text-sm font-medium text-foreground-primary">
                    Description
                  </Label>
                  <Input
                    value={watch('description') || ''}
                    onChangeText={(value) => setValue('description', value)}
                    placeholder="Enter transaction description"
                    variant="outline"
                  />
                  {errors.description && (
                    <Text className="mt-1 text-xs text-error-600">
                      {errors.description.message as string}
                    </Text>
                  )}
                </View>

                {/* Amount Field */}
                <View>
                  <Label className="mb-2 text-sm font-medium text-foreground-primary">Amount</Label>
                  <Input
                    keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                    returnKeyType="done"
                    value={amountDisplay}
                    onChangeText={(value) => {
                      // Strip currency symbols and grouping, keep digits and single dot
                      const cleaned = value.replace(/[^0-9.]/g, '');
                      const parts = cleaned.split('.');
                      const normalized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned;
                      // Limit to two decimal places if present
                      const [intPart, decPart] = normalized.split('.');
                      const limited = decPart !== undefined ? `${intPart}.${decPart.slice(0, 2)}` : intPart;
                      setValue('amount', limited);
                      // Display formatted currency for UX
                      if (limited === '' || isNaN(Number(limited))) {
                        setAmountDisplay('');
                      } else {
                        try {
                          const formatted = new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }).format(Number(limited));
                          setAmountDisplay(formatted);
                        } catch {
                          setAmountDisplay(`$${Number(limited).toFixed(2)}`);
                        }
                      }
                    }}
                    placeholder="$0.00"
                    variant="outline"
                    onFocus={() => selection()}
                    onSubmitEditing={handleSubmit(onSubmit)}
                  />
                  {errors.amount && (
                    <Text className="mt-1 text-xs text-error-600">
                      {errors.amount.message as string}
                    </Text>
                  )}
                </View>

                {/* Transaction Type section replaced by segmented toggle in header */}

                {/* Category Selection - Only for expenses */}
                {transactionType === 'expense' && (
                  <View>
                    <View className="mb-2 flex-row items-center justify-between">
                      <Label className="text-sm font-medium text-foreground-primary">
                        Category
                      </Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onPress={() => setShowCreateCategory(true)}
                        className="flex-row items-center px-2 py-1">
                        <Ionicons name="add" size={16} color="#6366F1" />
                        <Text className="ml-1 text-xs font-medium text-primary-600">
                          Create New
                        </Text>
                      </Button>
                    </View>

                    {/* Selected preview */}
                    {watch('categoryId') ? (
                      <View className="mb-2 flex-row items-center rounded-lg border border-app-border bg-app-surface p-2">
                        <View
                          className="mr-3 h-8 w-8 items-center justify-center rounded-lg"
                          style={{
                            backgroundColor:
                              categories.find((c) => c.id === watch('categoryId'))?.color + '20',
                          }}>
                          <Text className="text-sm">
                            {categories.find((c) => c.id === watch('categoryId'))?.icon || '📊'}
                          </Text>
                        </View>
                        <Text className="flex-1 font-medium text-foreground-primary">
                          {categories.find((c) => c.id === watch('categoryId'))?.name}
                        </Text>
                        <TouchableOpacity onPress={() => setValue('categoryId', null)}>
                          <Text className="text-xs font-medium text-blue-600">Clear</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Text className="mb-2 text-xs text-app-text-muted">Optional</Text>
                    )}

                    {/* Scrollable category list */}
                    <View className="rounded-lg border border-app-border bg-app-surface">
                      <ScrollView
                        style={{ maxHeight: 280 }}
                        keyboardShouldPersistTaps="handled"
                        nestedScrollEnabled>
                        {categories.map((category) => {
                          const isSelected = watch('categoryId') === category.id;
                          return (
                            <TouchableOpacity
                              key={category.id}
                              onPress={() => setValue('categoryId', category.id)}
                              activeOpacity={0.7}
                              className={`flex-row items-center px-3 py-3 ${
                                isSelected ? 'bg-blue-50' : 'bg-transparent'
                              }`}>
                              <View
                                className="mr-3 h-8 w-8 items-center justify-center rounded-lg"
                                style={{ backgroundColor: category.color + '20' }}>
                                <Text className="text-sm">{category.icon || '📊'}</Text>
                              </View>
                              <View className="flex-1">
                                <Text className="font-medium text-foreground-primary">
                                  {category.name}
                                </Text>
                                <Text className="text-xs text-foreground-secondary">
                                  Budget: ${parseFloat(category.budget).toFixed(2)}/month
                                </Text>
                              </View>
                              {isSelected && (
                                <Ionicons name="checkmark" size={16} color="#2563EB" />
                              )}
                            </TouchableOpacity>
                          );
                        })}
                        {categories.length === 0 && (
                          <View className="items-center px-3 py-6">
                            <Text className="text-sm text-app-text-secondary">
                              No categories yet — create one
                            </Text>
                          </View>
                        )}
                      </ScrollView>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Sticky Action Bar */}
          <SafeAreaView
            edges={['bottom']}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 80 }}
            className="bg-app-surface">
            <View className="border-t border-border-default px-6 py-4">
              <Button
                title="Save"
                variant="default"
                onPress={handleSubmit(onSubmit)}
                disabled={submitting}
                loading={submitting}
                className="w-full"
                size="lg">
                <Text>{mode === 'edit' ? 'Save Changes' : 'Save'}</Text>
              </Button>
            </View>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>

      {/* Create Category Modal */}
      <Modal visible={showCreateCategory} animationType="slide" presentationStyle="pageSheet">
        <CreateCategoryModal
          onClose={() => setShowCreateCategory(false)}
          onCategoryCreated={(categoryId) => {
            // Reload categories and auto-select the new one
            loadCategories().then(() => {
              setValue('categoryId', categoryId);
            });
          }}
        />
      </Modal>
    </View>
  );
}
