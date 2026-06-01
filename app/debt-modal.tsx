import React from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Label } from '@/components/Label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/Select';
import { useDebts } from '@/context/DataContext';
import { useActivityData, useSummaryData } from './_layout';
import { useToast } from '@/context/useToast';

interface DebtFormData {
  name: string;
  totalAmount: string;
  currentBalance: string;
  interestRate: string;
  minimumPayment: string;
  dueDay: string;
  categoryId: string;
  notes: string;
}

const formatNumeric = (value: string) => {
  const numeric = parseFloat(value || '0');
  if (!Number.isFinite(numeric)) {
    return '0.00';
  }
  return numeric.toFixed(2);
};

export default function DebtModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ debtId?: string }>();
  const debtId = params.debtId ? Number(params.debtId) : null;
  const isEditing = Number.isFinite(debtId);

  const { debts, refreshSummaryData, isDemoMode } = useSummaryData();
  const { categories } = useActivityData();
  const { createDebt, updateDebt, deleteDebt, getDebtById } = useDebts();
  const { toast } = useToast();

  const scrollRef = React.useRef<import('react-native').ScrollView | null>(null);
  const resetScrollPosition = React.useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    });
  }, []);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DebtFormData>({
    defaultValues: {
      name: '',
      totalAmount: '',
      currentBalance: '',
      interestRate: '',
      minimumPayment: '',
      dueDay: '',
      categoryId: '',
      notes: '',
    },
  });

  const [initializing, setInitializing] = React.useState(isEditing);

  React.useEffect(() => {
    resetScrollPosition();
  }, [resetScrollPosition]);

  React.useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      if (!isEditing || !debtId) {
        resetScrollPosition();
        setInitializing(false);
        return;
      }

      const fromContext = !isDemoMode
        ? (debts || []).find((debt: any) => debt.id === debtId)
        : null;
      if (fromContext) {
        reset({
          name: fromContext.name,
          totalAmount: fromContext.totalAmount,
          currentBalance: fromContext.currentBalance,
          interestRate: fromContext.interestRate ?? '',
          minimumPayment: fromContext.minimumPayment ?? '',
          dueDay: fromContext.dueDay ? String(fromContext.dueDay) : '',
          categoryId: (fromContext.categoryId ?? '').toString(),
          notes: fromContext.notes ?? '',
        });
        setInitializing(false);
        return;
      }

      try {
        const found = await getDebtById(debtId);
        if (!isMounted || !found) return;
        if (found) {
          reset({
            name: found.name,
            totalAmount: found.totalAmount,
            currentBalance: found.currentBalance,
            interestRate: found.interestRate ?? '',
            minimumPayment: found.minimumPayment ?? '',
            dueDay: found.dueDay ? String(found.dueDay) : '',
            categoryId: (found.categoryId ?? '').toString(),
            notes: found.notes ?? '',
          });
          resetScrollPosition();
        }
      } finally {
        if (isMounted) setInitializing(false);
      }
    };

    hydrate();

    return () => {
      isMounted = false;
    };
  }, [debts, debtId, getDebtById, isDemoMode, isEditing, reset, resetScrollPosition]);

  const onSubmit = React.useCallback(
    async (data: DebtFormData) => {
      const name = data.name.trim();
      if (!name) {
        toast({
          title: 'Name is required',
          description: 'Give the debt a friendly name so it is easy to spot.',
          variant: 'destructive',
        });
        return;
      }

      if (!data.totalAmount || Number.isNaN(parseFloat(data.totalAmount))) {
        toast({
          title: 'Total amount needed',
          description: 'Include the original balance so payoff progress works.',
          variant: 'destructive',
        });
        return;
      }

      const totalAmount = formatNumeric(data.totalAmount);
      const currentBalance = data.currentBalance
        ? formatNumeric(data.currentBalance)
        : formatNumeric(data.totalAmount);
      const minimumPayment = data.minimumPayment ? formatNumeric(data.minimumPayment) : undefined;
      const dueDay = data.dueDay ? Math.min(Math.max(parseInt(data.dueDay, 10), 1), 31) : null;
      const interestRate = data.interestRate ? String(parseFloat(data.interestRate)) : undefined;

      try {
        if (isEditing && debtId) {
          await updateDebt(debtId, {
            name,
            totalAmount,
            currentBalance,
            minimumPayment,
            interestRate,
            dueDay,
            categoryId: data.categoryId ? Number(data.categoryId) : null,
            notes: data.notes?.trim() || null,
          });
          toast({
            title: 'Debt updated',
            description: `${name} has been updated.`,
            variant: 'success',
          });
        } else {
          await createDebt({
            name,
            totalAmount,
            currentBalance,
            minimumPayment,
            interestRate,
            dueDay,
            categoryId: data.categoryId ? Number(data.categoryId) : null,
            notes: data.notes?.trim() || null,
          });
          toast({
            title: 'Debt added',
            description: `${name} is ready to track.`,
            variant: 'success',
          });
        }

        await refreshSummaryData();
        router.back();
      } catch (error) {
        console.error('Failed to save debt', error);
        toast({
          title: 'Unable to save',
          description: 'Please review the details and try again.',
          variant: 'destructive',
        });
      }
    },
    [createDebt, debtId, isEditing, refreshSummaryData, router, toast, updateDebt]
  );

  const handleDelete = React.useCallback(() => {
    if (!debtId) return;
    Alert.alert('Delete debt', 'Remove this debt from your payoff tracking?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDebt(debtId);
            toast({ title: 'Debt removed' });
            await refreshSummaryData();
            router.back();
          } catch (error) {
            console.error('Failed to delete debt', error);
            toast({
              title: 'Unable to delete',
              description: 'Please try again.',
              variant: 'destructive',
            });
          }
        },
      },
    ]);
  }, [debtId, deleteDebt, refreshSummaryData, router, toast]);

  return (
    <View className="flex-1 bg-app-canvas">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1">
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{ paddingBottom: insets.bottom + 160 }}
          keyboardShouldPersistTaps="handled">
          <View className="border-b border-app-border-strong bg-app-surface-1 px-6 pb-4 pt-6">
            <Text className="text-xl font-semibold text-app-text-strong">
              {isEditing ? 'Edit debt' : 'Add debt'}
            </Text>
            <Text className="mt-1 text-sm text-app-text-faint">
              Capture balances, minimums, and payoff cadence to accelerate progress.
            </Text>
          </View>

          <View className="px-6 py-6">
            <View className="space-y-6">
              <Controller
                control={control}
                name="name"
                rules={{ required: 'Debt name is required' }}
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Debt name"
                    placeholder="e.g. Chase Sapphire"
                    value={value}
                    onChangeText={onChange}
                    variant="dark"
                    errorText={errors.name?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="totalAmount"
                rules={{ required: 'Total amount is required' }}
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Original amount"
                    placeholder="2400"
                    keyboardType="numeric"
                    value={value}
                    onChangeText={onChange}
                    variant="dark"
                    helperText="Starting balance when you began tracking"
                    errorText={errors.totalAmount?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="currentBalance"
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Current balance"
                    placeholder="1800"
                    keyboardType="numeric"
                    value={value}
                    onChangeText={onChange}
                    variant="dark"
                    helperText="Leave blank to match the original amount"
                  />
                )}
              />

              <Controller
                control={control}
                name="minimumPayment"
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Minimum payment"
                    placeholder="80"
                    keyboardType="numeric"
                    value={value}
                    onChangeText={onChange}
                    variant="dark"
                    helperText="Optional monthly minimum"
                  />
                )}
              />

              <Controller
                control={control}
                name="interestRate"
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Interest rate"
                    placeholder="19.99"
                    keyboardType="numeric"
                    value={value}
                    onChangeText={onChange}
                    variant="dark"
                    helperText="APR as a percentage"
                  />
                )}
              />

              <Controller
                control={control}
                name="dueDay"
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Due day (optional)"
                    placeholder="21"
                    keyboardType="numeric"
                    value={value}
                    onChangeText={onChange}
                    variant="dark"
                    helperText="Day of month (1-31)"
                  />
                )}
              />

              <Controller
                control={control}
                name="categoryId"
                render={({ field: { value, onChange } }) => (
                  <View>
                    <Label className="mb-2 text-sm font-medium text-app-text-strong">
                      Category
                    </Label>
                    <Select value={value} onValueChange={onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose category">
                          {value
                            ? categories?.find((category: any) => String(category.id) === value)
                                ?.name || 'Unknown'
                            : 'Optional category link'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(categories || []).map((category: any) => (
                          <SelectItem key={category.id} value={String(category.id)}>
                            <Text className="text-sm text-app-text-strong">{category.name}</Text>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </View>
                )}
              />

              <Controller
                control={control}
                name="notes"
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Notes"
                    placeholder="Payment strategy, contact info, etc."
                    value={value}
                    onChangeText={onChange}
                    variant="dark"
                    multiline
                    numberOfLines={3}
                  />
                )}
              />
            </View>
          </View>
        </ScrollView>

        <View
          className="border-t border-app-border-strong bg-app-surface-1 px-6 pb-6 pt-4"
          style={{ paddingBottom: Math.max(insets.bottom + 16, 24) }}>
          {isEditing ? (
            <Button variant="outline" className="mb-3" onPress={handleDelete} title="Delete debt" />
          ) : null}
          <Button
            onPress={handleSubmit(onSubmit)}
            title={isEditing ? 'Save changes' : 'Add debt'}
            variant="primary-solid"
            disabled={isSubmitting || initializing}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
