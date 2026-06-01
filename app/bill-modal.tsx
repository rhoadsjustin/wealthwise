import React from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Label } from '@/components/Label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/Select';
import { useBills } from '@/context/DataContext';
import { useActivityData, useSummaryData } from './_layout';
import { useToast } from '@/context/useToast';

interface BillFormData {
  name: string;
  amount: string;
  categoryId: string;
  dueDay: string;
  autoPay: boolean;
  notes: string;
}

export default function BillModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ billId?: string }>();
  const billId = params.billId ? Number(params.billId) : null;
  const isEditing = Number.isFinite(billId);

  const { bills, refreshSummaryData, isDemoMode } = useSummaryData();
  const { categories } = useActivityData();
  const { createBill, updateBill, deleteBill, getBillById } = useBills();
  const { toast } = useToast();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BillFormData>({
    defaultValues: {
      name: '',
      amount: '',
      categoryId: '',
      dueDay: '',
      autoPay: false,
      notes: '',
    },
  });

  const [initializing, setInitializing] = React.useState(isEditing);

  React.useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      if (!isEditing || !billId) {
        setInitializing(false);
        return;
      }

      const existingFromContext = !isDemoMode
        ? (bills || []).find((bill: any) => bill.id === billId)
        : null;
      if (existingFromContext) {
        reset({
          name: existingFromContext.name,
          amount: existingFromContext.amount,
          categoryId: (existingFromContext.categoryId ?? '').toString(),
          dueDay: existingFromContext.dueDay ? String(existingFromContext.dueDay) : '',
          autoPay: Boolean(existingFromContext.autoPay),
          notes: existingFromContext.notes || '',
        });
        setInitializing(false);
        return;
      }

      try {
        const found = await getBillById(billId);
        if (!isMounted || !found) return;
        if (found) {
          reset({
            name: found.name,
            amount: found.amount,
            categoryId: (found.categoryId ?? '').toString(),
            dueDay: found.dueDay ? String(found.dueDay) : '',
            autoPay: Boolean(found.autoPay),
            notes: found.notes || '',
          });
        }
      } finally {
        if (isMounted) setInitializing(false);
      }
    };

    hydrate();

    return () => {
      isMounted = false;
    };
  }, [bills, billId, getBillById, isDemoMode, isEditing, reset]);

  const onSubmit = React.useCallback(
    async (data: BillFormData) => {
      const trimmedName = data.name.trim();
      if (!trimmedName) {
        toast({
          title: 'Name is required',
          description: 'Please add a short name so you recognize this bill later.',
          variant: 'destructive',
        });
        return;
      }
      if (!data.amount || Number.isNaN(parseFloat(data.amount))) {
        toast({
          title: 'Amount is required',
          description: 'Enter the typical monthly amount for this bill.',
          variant: 'destructive',
        });
        return;
      }
      if (!data.categoryId) {
        toast({
          title: 'Select a category',
          description: 'Bills should map to one of your budget categories.',
          variant: 'destructive',
        });
        return;
      }

      const sanitizedAmount = parseFloat(data.amount).toFixed(2);
      const dueDayNumber = data.dueDay
        ? Math.min(Math.max(parseInt(data.dueDay, 10), 1), 31)
        : null;

      try {
        if (isEditing && billId) {
          await updateBill(billId, {
            name: trimmedName,
            amount: sanitizedAmount,
            categoryId: Number(data.categoryId),
            dueDay: dueDayNumber,
            autoPay: data.autoPay,
            notes: data.notes?.trim() || null,
          });
          toast({
            title: 'Bill updated',
            description: `${trimmedName} has been updated.`,
            variant: 'success',
          });
        } else {
          await createBill({
            name: trimmedName,
            amount: sanitizedAmount,
            categoryId: Number(data.categoryId),
            dueDay: dueDayNumber,
            autoPay: data.autoPay,
            notes: data.notes?.trim() || null,
          });
          toast({
            title: 'Bill added',
            description: `${trimmedName} is now tracked in your monthly plan.`,
            variant: 'success',
          });
        }

        await refreshSummaryData();
        router.back();
      } catch (error) {
        console.error('Failed to save bill', error);
        toast({
          title: 'Unable to save',
          description: 'Please review the details and try again.',
          variant: 'destructive',
        });
      }
    },
    [billId, createBill, isEditing, refreshSummaryData, router, toast, updateBill]
  );

  const handleDelete = React.useCallback(() => {
    if (!billId) return;
    Alert.alert('Delete bill', 'This will remove the bill from tracking. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBill(billId);
            toast({
              title: 'Bill deleted',
              description: 'The bill is no longer being tracked.',
            });
            await refreshSummaryData();
            router.back();
          } catch (error) {
            console.error('Failed to delete bill', error);
            toast({
              title: 'Unable to delete',
              description: 'Please try again.',
              variant: 'destructive',
            });
          }
        },
      },
    ]);
  }, [billId, deleteBill, refreshSummaryData, router, toast]);

  return (
    <View className="flex-1 bg-app-canvas">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: insets.bottom + 160 }}
          keyboardShouldPersistTaps="handled">
          <View className="border-b border-app-border-strong bg-app-surface-1 px-6 pb-4 pt-6">
            <Text className="text-xl font-semibold text-app-text-strong">
              {isEditing ? 'Edit bill' : 'Add monthly bill'}
            </Text>
            <Text className="mt-1 text-sm text-app-text-faint">
              Keep recurring expenses visible and categorized for cleaner spending insights.
            </Text>
          </View>

          <View className="px-6 py-6">
            <View className="space-y-6">
              <Controller
                control={control}
                name="name"
                rules={{ required: 'Bill name is required' }}
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Bill name"
                    placeholder="e.g. Rent"
                    value={value}
                    onChangeText={onChange}
                    variant="dark"
                    errorText={errors.name?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="amount"
                rules={{ required: 'Amount is required' }}
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Amount"
                    placeholder="1500"
                    keyboardType="numeric"
                    value={value}
                    onChangeText={onChange}
                    variant="dark"
                    helperText="Average monthly amount"
                    errorText={errors.amount?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="categoryId"
                rules={{ required: 'Select a category' }}
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
                            : 'Choose category'}
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
                    {errors.categoryId && (
                      <Text className="mt-1 text-xs text-error-600">
                        {errors.categoryId.message}
                      </Text>
                    )}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="dueDay"
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Due day (optional)"
                    placeholder="1"
                    keyboardType="numeric"
                    value={value}
                    onChangeText={onChange}
                    variant="dark"
                    helperText="Day of month (1-31). Leave blank if flexible."
                  />
                )}
              />

              <Controller
                control={control}
                name="autoPay"
                render={({ field: { value, onChange } }) => (
                  <View className="flex-row items-center justify-between rounded-xl border border-app-border-strong bg-app-surface-2 px-4 py-3">
                    <View className="flex-1 pr-4">
                      <Text className="text-sm font-medium text-app-text-strong">
                        Auto-pay enabled
                      </Text>
                      <Text className="mt-1 text-xs text-app-text-faint">
                        Toggle on if the bill is automatically drafted each month.
                      </Text>
                    </View>
                    <Switch
                      value={value}
                      onValueChange={onChange}
                      trackColor={{
                        false: '#0D1325',
                        true: '#182136',
                      }}
                      thumbColor={value ? '#58B6FF' : '#8190B3'}
                    />
                  </View>
                )}
              />

              <Controller
                control={control}
                name="notes"
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Notes"
                    placeholder="Optional details, confirmation numbers, etc."
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
            <Button
              variant="outline"
              className="mb-3"
              size="md"
              onPress={handleDelete}
              title="Delete bill"
            />
          ) : null}
          <Button
            onPress={handleSubmit(onSubmit)}
            title={isEditing ? 'Save changes' : 'Add bill'}
            variant="primary-solid"
            disabled={isSubmitting || initializing}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
