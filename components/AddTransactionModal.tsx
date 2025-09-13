import React, { useEffect } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { Button } from './Button';
import { Input } from './Input';
import { Label } from './Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './Select';
import { RadioGroup, RadioGroupItem } from './RadioGroup';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../context/useToast';
import { useData } from '../context/DataContext';
import { Ionicons } from '@expo/vector-icons';
import CreateCategoryModal from './CreateCategoryModal';
import { selection, success as hapticSuccess } from '../lib/haptics';

interface TransactionFormData {
  description: string;
  amount: string;
  type: 'income' | 'expense';
  categoryId?: number | null;
  date?: string;
}

interface AddTransactionModalProps {
  onClose: () => void;
}

export default function AddTransactionModal({ onClose }: AddTransactionModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { createTransaction, getCategories } = useData();
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

  // Clear categoryId when switching to income type and reset form properly
  useEffect(() => {
    if (transactionType === 'income') {
      setValue('categoryId', null);
    }
  }, [transactionType, setValue]);

  // Reset form when modal opens
  useEffect(() => {
    reset({
      type: 'expense',
      description: '',
      amount: '',
      categoryId: null,
    });
  }, [reset]);

  const createTransactionMutation = useMutation({
    mutationFn: async (data: TransactionFormData) => {
      // Prepare the transaction data, ensuring categoryId is null for income
      const transactionData = {
        description: data.description.trim(),
        amount: data.amount,
        type: data.type,
        categoryId: data.type === 'income' ? null : data.categoryId || null,
        date: data.date || new Date().toISOString(),
      };

      return await createTransaction(transactionData);
    },
    onSuccess: () => {
      hapticSuccess();
      // Invalidate query cache
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });

      toast({
        title: 'Transaction Added',
        description: 'Your transaction has been successfully added.',
      });
      reset();
      onClose();
    },
    onError: (error) => {
      console.error('Transaction creation error:', error);
      toast({
        title: 'Error',
        description: 'Failed to add transaction. Please try again.',
        variant: 'destructive',
      });
    },
  });

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
      date: new Date().toISOString(),
    };

    createTransactionMutation.mutate(submitData);
  };

  return (
    <View className="bg-background-primary flex-1">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Form Content */}
          <View className="flex-1 px-6 py-6">
            <View className="space-y-6">
              {/* Description Field */}
              <View>
                <Label className="text-foreground-primary mb-2 text-sm font-medium">
                  Description
                </Label>
                <Input
                  value={watch('description') || ''}
                  onChangeText={(value) => setValue('description', value)}
                  placeholder="Enter transaction description"
                  variant="outline"
                />
                {errors.description && (
                  <Text className="text-error-600 mt-1 text-xs">
                    {errors.description.message as string}
                  </Text>
                )}
              </View>

              {/* Amount Field */}
              <View>
                <Label className="text-foreground-primary mb-2 text-sm font-medium">Amount</Label>
                <Input
                  keyboardType="numeric"
                  value={watch('amount') || ''}
                  onChangeText={(value) => {
                    // Only allow numbers and decimal point
                    const cleaned = value.replace(/[^0-9.]/g, '');
                    // Prevent multiple decimal points
                    const parts = cleaned.split('.');
                    const formatted =
                      parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned;
                    setValue('amount', formatted);
                  }}
                  placeholder="0.00"
                  variant="outline"
                  onFocus={() => selection()}
                />
                {errors.amount && (
                  <Text className="text-error-600 mt-1 text-xs">
                    {errors.amount.message as string}
                  </Text>
                )}
              </View>

              {/* Transaction Type */}
              <View>
                <Label className="text-foreground-primary mb-3 text-sm font-medium">
                  Transaction Type
                </Label>
                <RadioGroup
                  value={transactionType}
                  onValueChange={(value) => setValue('type', value as 'income' | 'expense')}
                  className="flex-row gap-6">
                  <View className="flex-row items-center gap-2">
                    <RadioGroupItem value="expense" id="expense" />
                    <Label className="text-foreground-primary text-sm font-medium">Expense</Label>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <RadioGroupItem value="income" id="income" />
                    <Label className="text-foreground-primary text-sm font-medium">Income</Label>
                  </View>
                </RadioGroup>
              </View>

              {/* Category Selection - Only for expenses */}
              {transactionType === 'expense' && (
                <View>
                  <View className="mb-2 flex-row items-center justify-between">
                    <Label className="text-foreground-primary text-sm font-medium">Category</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onPress={() => setShowCreateCategory(true)}
                      className="flex-row items-center px-2 py-1">
                      <Ionicons name="add" size={16} color="#6366F1" />
                      <Text className="text-primary-600 ml-1 text-xs font-medium">Create New</Text>
                    </Button>
                  </View>
                  <Select
                    value={watch('categoryId')?.toString()}
                    onValueChange={(value) => setValue('categoryId', parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category (optional)">
                        {watch('categoryId') &&
                          categories.find((c) => c.id === watch('categoryId')) && (
                            <View className="flex-row items-center">
                              <View
                                className="mr-3 h-8 w-8 items-center justify-center rounded-lg"
                                style={{
                                  backgroundColor:
                                    categories.find((c) => c.id === watch('categoryId'))?.color +
                                    '20',
                                }}>
                                <Text className="text-sm">
                                  {categories.find((c) => c.id === watch('categoryId'))?.icon ||
                                    '📊'}
                                </Text>
                              </View>
                              <Text className="text-foreground-primary font-medium">
                                {categories.find((c) => c.id === watch('categoryId'))?.name}
                              </Text>
                            </View>
                          )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          <View className="flex-row items-center py-1">
                            <View
                              className="mr-3 h-8 w-8 items-center justify-center rounded-lg"
                              style={{ backgroundColor: category.color + '20' }}>
                              <Text className="text-sm">{category.icon || '📊'}</Text>
                            </View>
                            <View className="flex-1">
                              <Text className="text-foreground-primary font-medium">
                                {category.name}
                              </Text>
                              <Text className="text-foreground-secondary text-xs">
                                Budget: ${parseFloat(category.budget).toFixed(2)}/month
                              </Text>
                            </View>
                          </View>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </View>
              )}
            </View>
          </View>

        </ScrollView>

        {/* Sticky Action Bar */}
        <View className="border-border-default border-t px-6 py-4 bg-app-surface">
          <View className="flex-row gap-3">
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => {
                  selection();
                  onClose();
                }}
                className="flex-1"
                size="lg">
                <Text>Cancel</Text>
              </Button>
            <Button
              title="Add Transaction"
              variant="default"
              onPress={handleSubmit(onSubmit)}
              disabled={createTransactionMutation.isPending}
              loading={createTransactionMutation.isPending}
              className="flex-1"
              size="lg">
              <Text>Add Transaction</Text>
            </Button>
          </View>
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
