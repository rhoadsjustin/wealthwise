import React from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { useDebts } from '@/context/DataContext';
import { useAppData } from './_layout';
import { useToast } from '@/context/useToast';
import { formatCurrency } from '@/lib/utils';

interface DebtPaymentFormData {
  amount: string;
  paidOn: string;
  notes: string;
}

const today = () => new Date().toISOString().split('T')[0];

export default function DebtPaymentModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ debtId?: string }>();
  const debtId = params.debtId ? Number(params.debtId) : null;

  const { debts, refreshAppData } = useAppData();
  const { getDebts, recordDebtPayment } = useDebts();
  const { toast } = useToast();

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DebtPaymentFormData>({
    defaultValues: {
      amount: '',
      paidOn: today(),
      notes: '',
    },
  });

  const [currentDebt, setCurrentDebt] = React.useState<any | null>(
    debtId ? ((debts || []).find((debt: any) => debt.id === debtId) ?? null) : null
  );

  React.useEffect(() => {
    if (!debtId) return;
    const existing = (debts || []).find((debt: any) => debt.id === debtId);
    if (existing) {
      setCurrentDebt(existing);
      setValue('amount', existing.minimumPayment || '');
    }
  }, [debts, debtId, setValue]);

  React.useEffect(() => {
    let isMounted = true;
    const hydrate = async () => {
      if (!debtId) return;
      if (currentDebt) {
        setValue('amount', currentDebt.minimumPayment || '');
        setValue('paidOn', today());
        return;
      }
      const latest = await getDebts();
      if (!isMounted) return;
      const found = latest.find((debt: any) => debt.id === debtId);
      if (found) {
        setCurrentDebt(found);
        reset({
          amount: found.minimumPayment || '',
          paidOn: today(),
          notes: '',
        });
      }
    };

    hydrate();
    return () => {
      isMounted = false;
    };
  }, [currentDebt, debtId, getDebts, reset, setValue]);

  const onSubmit = React.useCallback(
    async (data: DebtPaymentFormData) => {
      if (!debtId) return;
      const amount = parseFloat(data.amount || '0');
      if (!Number.isFinite(amount) || amount <= 0) {
        toast({
          title: 'Enter a valid amount',
          description: 'Payments must be greater than zero.',
          variant: 'destructive',
        });
        return;
      }

      const paidOn = data.paidOn || today();

      try {
        await recordDebtPayment(debtId, {
          amount: amount.toFixed(2),
          paidOn,
          notes: data.notes?.trim() || null,
          categoryId: currentDebt?.categoryId ?? null,
        });
        toast({
          title: 'Payment recorded',
          description: 'Progress has been updated.',
          variant: 'success',
        });
        await refreshAppData();
        router.back();
      } catch (error) {
        console.error('Failed to record payment', error);
        toast({
          title: 'Unable to record payment',
          description: 'Please try again.',
          variant: 'destructive',
        });
      }
    },
    [currentDebt?.categoryId, debtId, recordDebtPayment, refreshAppData, router, toast]
  );

  const debtName = currentDebt?.name ?? 'Debt';
  const balanceLabel = currentDebt
    ? formatCurrency(parseFloat(currentDebt.currentBalance || '0'))
    : null;

  return (
    <View className="flex-1 bg-app-canvas">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}
          keyboardShouldPersistTaps="handled">
          <View className="border-b border-app-border-strong bg-app-surface-1 px-6 pb-4 pt-6">
            <Text className="text-xl font-semibold text-app-text-strong">Record payment</Text>
            <Text className="mt-1 text-sm text-app-text-faint">
              {debtName}
              {balanceLabel ? ` · ${balanceLabel} outstanding` : ''}
            </Text>
          </View>

          <View className="px-6 py-6">
            <View className="space-y-6">
              <Controller
                control={control}
                name="amount"
                rules={{ required: 'Payment amount is required' }}
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Amount"
                    placeholder="125"
                    keyboardType="numeric"
                    value={value}
                    onChangeText={onChange}
                    variant="dark"
                    errorText={errors.amount?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="paidOn"
                rules={{ required: 'Payment date is required' }}
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Payment date"
                    placeholder="2024-03-15"
                    value={value}
                    onChangeText={onChange}
                    variant="dark"
                    helperText="Use YYYY-MM-DD format"
                    errorText={errors.paidOn?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="notes"
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Notes"
                    placeholder="Optional memo"
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
          <Button
            onPress={handleSubmit(onSubmit)}
            title="Save payment"
            variant="primary-solid"
            disabled={isSubmitting || !debtId}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
