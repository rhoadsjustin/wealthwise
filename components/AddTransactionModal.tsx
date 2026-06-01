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
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from './Button';
import { Input } from './Input';
import { Label } from './Label';
// Drop custom Select for categories; use a simple scrollable list
import { AppText } from '@/components/AppText';
// RadioGroup removed in favor of a segmented toggle
import { useForm, Controller, useWatch } from 'react-hook-form';
// Removed react-query; use DataContext directly
import { useToast } from '../context/useToast';
import { useData } from '../context/DataContext';
import { useActivityData, useAppData } from '@/app/_layout';
import { Ionicons } from '@expo/vector-icons';
import CreateCategoryModal from './CreateCategoryModal';
import { selection, success as hapticSuccess } from '../lib/haptics';
import type { Transaction as Tx } from '@/lib/schema/schema';
import { indexCategoryDocs, normalizeMerchant, suggestCategory } from '@/lib/ai/categorizer';
import { TopUtilityBar } from './TopUtilityBar';

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
  refreshScope?: 'app' | 'activity-summary';
}

export default function AddTransactionModal({
  onClose,
  mode = 'create',
  initialTransaction = null,
  refreshScope = 'app',
}: AddTransactionModalProps) {
  const { toast } = useToast();
  const { createTransaction, updateTransaction, getCategories } = useData();
  const { refreshAppData, refreshSummaryData } = useAppData();
  const { refreshActivityData } = useActivityData();
  const [submitting, setSubmitting] = React.useState(false);
  const [categories, setCategories] = React.useState<any[]>([]);
  const [showCreateCategory, setShowCreateCategory] = React.useState(false);
  const [suggestion, setSuggestion] = React.useState<{
    id: number;
    name: string;
    confidence: number;
  } | null>(null);
  const lastSuggestedMerchantRef = React.useRef<string | null>(null);

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
    control,
    reset,
    formState: { errors },
  } = useForm<TransactionFormData>({
    defaultValues: {
      type: 'expense',
    },
  });

  const transactionType = useWatch({ control, name: 'type' }) || 'expense';
  const amountRaw = useWatch({ control, name: 'amount' }) || '';
  const description = useWatch({ control, name: 'description' }) || '';
  const deferredDescription = React.useDeferredValue(description);
  const selectedCategoryId = useWatch({ control, name: 'categoryId' });
  const [amountFocused, setAmountFocused] = React.useState(false);

  const amountDisplay = React.useMemo(() => {
    if (!amountRaw) return '';
    if (amountFocused) return amountRaw;
    const num = Number(amountRaw);
    if (isNaN(num)) return '';
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    } catch {
      return `$${num.toFixed(2)}`;
    }
  }, [amountRaw, amountFocused]);
  // amountDisplay is derived; no effect needed

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
        categoryId:
          initialTransaction.type === 'income' ? null : (initialTransaction.categoryId ?? null),
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

  // Suggest category when description changes (expense only)
  useEffect(() => {
    const handle = setTimeout(() => {
      const desc = deferredDescription || '';
      const normalizedMerchant = normalizeMerchant(desc);

      if (
        transactionType !== 'expense' ||
        normalizedMerchant.length < 4 ||
        normalizedMerchant === lastSuggestedMerchantRef.current
      ) {
        if (!normalizedMerchant.trim() || transactionType !== 'expense') {
          lastSuggestedMerchantRef.current = null;
        }
        setSuggestion(null);
        return;
      }

      void (async () => {
        try {
          lastSuggestedMerchantRef.current = normalizedMerchant;
          await indexCategoryDocs(categories);
          const result = await suggestCategory({ description: normalizedMerchant }, categories);
          if (result.categoryId && result.confidence >= 0.4 && result.confidence < 0.7) {
            const cat = categories.find((c) => c.id === result.categoryId);
            if (cat) {
              setSuggestion({ id: cat.id, name: cat.name, confidence: result.confidence });
            }
          } else {
            setSuggestion(null);
          }
        } catch {
          lastSuggestedMerchantRef.current = null;
          setSuggestion(null);
        }
      })();
    }, 160);

    return () => clearTimeout(handle);
  }, [categories, deferredDescription, transactionType]);

  const refreshAfterSave = React.useCallback(async () => {
    if (refreshScope === 'activity-summary') {
      await Promise.all([refreshActivityData(), refreshSummaryData()]);
      return;
    }

    await refreshAppData();
  }, [refreshActivityData, refreshAppData, refreshScope, refreshSummaryData]);

  const submitSave = async (data: TransactionFormData) => {
    try {
      setSubmitting(true);
      const transactionData = {
        description: data.description.trim(),
        amount: data.amount,
        type: data.type,
        categoryId: data.type === 'income' ? null : data.categoryId || null,
        date:
          data.date ||
          (mode === 'edit' && initialTransaction?.date) ||
          new Date().toISOString().split('T')[0],
      } as const;

      if (mode === 'edit' && initialTransaction?.id != null) {
        await updateTransaction(initialTransaction.id, transactionData as any);
      } else {
        await createTransaction(transactionData as any);
      }
      await refreshAfterSave();
      hapticSuccess();
      toast({
        title: mode === 'edit' ? 'Transaction Updated' : 'Transaction Added',
        description:
          mode === 'edit'
            ? 'Your changes have been saved.'
            : 'Your transaction has been successfully added.',
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
    <View className="flex-1 bg-app-canvas">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1">
        {/* Header (safe-area aware). Mark non-collapsable for formSheet+ScrollView layout rule */}
        <Stack.Screen options={{ headerShown: false }} />
        <TopUtilityBar
          hideProfileButton={mode === 'edit'}
          badge={mode === 'edit' ? 'Edit Transaction' : 'Add Transaction'}
        />
        {/* Content and footer as siblings for proper keyboard avoidance */}
        <View style={{ flex: 1 }}>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            contentInsetAdjustmentBehavior="automatic">
            {/* Form Content */}
            <View className="flex-1 px-6 py-6">
              {/* Type Segmented Toggle (moved below header to avoid overlap) */}
              <View className="mb-4 flex-row rounded-xl bg-app-surface-2 p-1">
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Set transaction type to expense"
                  activeOpacity={0.8}
                  onPress={() => {
                    if (transactionType !== 'expense') selection();
                    setValue('type', 'expense');
                  }}
                  className={`flex-1 items-center rounded-lg px-4 py-2 ${transactionType === 'expense' ? 'bg-accent-expense' : 'bg-transparent'
                    }`}>
                  <AppText
                    variant="caption"
                    className={`${transactionType === 'expense' ? 'text-app-canvas' : 'text-app-text-soft'
                      }`}>
                    Expense
                  </AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Set transaction type to income"
                  activeOpacity={0.8}
                  onPress={() => {
                    if (transactionType !== 'income') selection();
                    setValue('type', 'income');
                  }}
                  className={`flex-1 items-center rounded-lg px-4 py-2 ${transactionType === 'income' ? 'bg-accent-income' : 'bg-transparent'
                    }`}>
                  <AppText
                    variant="caption"
                    className={`${transactionType === 'income' ? 'text-app-canvas' : 'text-app-text-soft'
                      }`}>
                    Income
                  </AppText>
                </TouchableOpacity>
              </View>
              <View className="space-y-6">
                {/* Description Field */}
                <View>
                  <Label className="mb-2 text-sm font-medium text-app-text-strong">
                    Description
                  </Label>
                  <Controller
                    control={control}
                    name="description"
                    render={({ field: { value, onChange } }) => (
                      <Input
                        value={value || ''}
                        onChangeText={onChange}
                        placeholder="Enter transaction description"
                        variant="dark"
                      />
                    )}
                  />
                  {errors.description && (
                    <AppText variant="hint" className="mt-1 text-error-600">
                      {errors.description.message as string}
                    </AppText>
                  )}
                </View>

                {/* Amount Field */}
                <View>
                  <Label className="mb-2 text-sm font-medium text-app-text-strong">Amount</Label>
                  <Input
                    keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                    returnKeyType="done"
                    value={amountDisplay}
                    onChangeText={(value) => {
                      // Keep only digits and a single decimal point, and limit to two decimals
                      const cleaned = value.replace(/[^0-9.]/g, '');
                      const firstDot = cleaned.indexOf('.');
                      let normalized = cleaned;
                      if (firstDot !== -1) {
                        const before = cleaned.slice(0, firstDot + 1);
                        const after = cleaned.slice(firstDot + 1).replace(/\./g, '');
                        normalized = before + after;
                      }
                      const [intPart, decPart] = normalized.split('.');
                      const limited =
                        decPart !== undefined ? `${intPart}.${decPart.slice(0, 2)}` : intPart;
                      setValue('amount', limited, { shouldDirty: true });
                    }}
                    placeholder="$0.00"
                    variant="dark"
                    onFocus={() => {
                      selection();
                      setAmountFocused(true);
                    }}
                    onBlur={() => setAmountFocused(false)}
                    onSubmitEditing={() => {
                      void handleSubmit(onSubmit)();
                    }}
                  />
                  {errors.amount && (
                    <AppText variant="hint" className="mt-1 text-error-600">
                      {errors.amount.message as string}
                    </AppText>
                  )}
                </View>

                {/* Transaction Type section replaced by segmented toggle in header */}

                {/* Category Selection - Only for expenses */}
                {transactionType === 'expense' && (
                  <View>
                    {suggestion && !selectedCategoryId && (
                      <View className="mb-2">
                        <TouchableOpacity
                          onPress={() =>
                            setValue('categoryId', suggestion.id, { shouldDirty: true })
                          }
                          className="self-start rounded-full border border-app-border-strong bg-app-surface-2 px-3 py-1">
                          <AppText variant="hint" className="text-accent-savings">
                            Suggested: {suggestion.name} ({Math.round(suggestion.confidence * 100)}
                            %) — Tap to apply
                          </AppText>
                        </TouchableOpacity>
                      </View>
                    )}
                    <View className="mb-2 flex-row items-center justify-between">
                      <Label className="text-sm font-medium text-app-text-strong">Category</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onPress={() => setShowCreateCategory(true)}
                        className="flex-row items-center px-2 py-1">
                        <Ionicons name="add" size={16} color="#58B6FF" />
                        <AppText variant="hint" className="ml-1 text-accent-savings">
                          Create New
                        </AppText>
                      </Button>
                    </View>

                    {/* Selected preview */}
                    {selectedCategoryId ? (
                      <View className="mb-2 flex-row items-center rounded-lg border border-app-border-strong bg-app-surface-2 p-2">
                        <View
                          className="mr-3 h-8 w-8 items-center justify-center rounded-lg"
                          style={{
                            backgroundColor:
                              categories.find((c) => c.id === selectedCategoryId)?.color + '30',
                          }}>
                          <Text className="text-sm">
                            {categories.find((c) => c.id === selectedCategoryId)?.icon || '📊'}
                          </Text>
                        </View>
                        <AppText variant="body" className="flex-1 text-app-text-strong">
                          {categories.find((c) => c.id === selectedCategoryId)?.name}
                        </AppText>
                        <TouchableOpacity onPress={() => setValue('categoryId', null)}>
                          <AppText variant="hint" className="text-accent-savings">
                            Clear
                          </AppText>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <AppText variant="hint" className="mb-2 text-app-text-faint">
                        Optional
                      </AppText>
                    )}

                    {/* Scrollable category list */}
                    <View className="rounded-lg border border-app-border-strong bg-app-surface-1">
                      <ScrollView
                        style={{ maxHeight: 280 }}
                        keyboardShouldPersistTaps="handled"
                        nestedScrollEnabled>
                        {categories.map((category) => {
                          const isSelected = selectedCategoryId === category.id;
                          return (
                            <TouchableOpacity
                              key={category.id}
                              onPress={() =>
                                setValue('categoryId', category.id, { shouldDirty: true })
                              }
                              activeOpacity={0.7}
                              className={`flex-row items-center px-3 py-3 ${isSelected ? 'bg-app-surface-3' : 'bg-transparent'
                                }`}>
                              <View
                                className="mr-3 h-8 w-8 items-center justify-center rounded-lg"
                                style={{ backgroundColor: category.color + '30' }}>
                                <Text className="text-sm">{category.icon || '📊'}</Text>
                              </View>
                              <View className="flex-1">
                                <AppText variant="body" className="text-app-text-strong">
                                  {category.name}
                                </AppText>
                                <AppText variant="hint" className="text-app-text-faint">
                                  Budget: ${parseFloat(category.budget).toFixed(2)}/month
                                </AppText>
                              </View>
                              {isSelected && (
                                <Ionicons name="checkmark" size={16} color="#58B6FF" />
                              )}
                            </TouchableOpacity>
                          );
                        })}
                        {categories.length === 0 && (
                          <View className="items-center px-3 py-6">
                            <AppText variant="body" className="text-app-text-faint">
                              No categories yet — create one
                            </AppText>
                          </View>
                        )}
                      </ScrollView>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Action Bar (non-absolute so it lifts above keyboard) */}
          <SafeAreaView edges={['bottom']} className="bg-app-surface-1">
            <View className="border-t border-app-border-strong px-6 py-4">
              <Button
                title="Save"
                variant="primary-solid"
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
