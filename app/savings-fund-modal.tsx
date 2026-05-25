import React from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { useSavings, SavingsGoal } from '@/context/DataContext';
import { useToast } from '@/context/useToast';
import { useAppData } from './_layout';
import { formatCurrency } from '@/lib/utils';
import { Ionicons } from '@expo/vector-icons';

interface FundGoalFormValues {
  amount: string;
  contributedOn?: string;
  notes?: string;
}

export default function SavingsFundModal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const goalIdParam = typeof params.goalId === 'string' ? Number(params.goalId) : undefined;
  const { toast } = useToast();
  const { recordSavingsContribution, getSavingsGoals } = useSavings();
  const { refreshAppData } = useAppData();
  const [goal, setGoal] = React.useState<SavingsGoal | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const { control, handleSubmit } = useForm<FundGoalFormValues>({
    defaultValues: {
      amount: '',
      contributedOn: new Date().toISOString().split('T')[0],
      notes: '',
    },
  });

  React.useEffect(() => {
    const loadGoal = async () => {
      if (!goalIdParam) return;
      const goals = await getSavingsGoals();
      const match = goals.find((g) => g.id === goalIdParam) || null;
      setGoal(match);
    };
    loadGoal();
  }, [goalIdParam, getSavingsGoals]);

  const onSubmit = async (values: FundGoalFormValues) => {
    if (!goalIdParam) {
      toast({
        title: 'Select goal first',
        description: 'Choose a savings goal to fund.',
        variant: 'destructive',
      });
      return;
    }

    if (!values.amount || Number.isNaN(Number(values.amount))) {
      toast({
        title: 'Amount required',
        description: 'Enter a valid contribution amount.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      await recordSavingsContribution(goalIdParam, {
        amount: values.amount,
        contributedOn: values.contributedOn,
        notes: values.notes,
      });
      await refreshAppData();
      toast({ title: 'Contribution recorded', description: 'Savings balance updated.' });
      router.back();
    } catch (error) {
      console.error('Failed to record contribution', error);
      toast({
        title: 'Unable to add contribution',
        description: 'Please try again shortly.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-app-canvas">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="pb-24"
          keyboardShouldPersistTaps="handled">
          <View className="px-5" style={{ paddingTop: Math.max(insets.top + 8, 24) }}>
            <View className="mb-4 flex-row items-center justify-between">
              <View>
                <Text className="text-xl font-semibold text-app-text-strong">
                  {goal ? `Fund ${goal.name}` : 'Fund savings goal'}
                </Text>
                <Text className="mt-1 text-xs text-app-text-faint">
                  Log the contribution to keep your progress current.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => router.back()}
                accessibilityLabel="Close fund modal"
                className="h-10 w-10 items-center justify-center rounded-full border border-app-border-strong bg-app-surface-2 shadow-xs">
                <Ionicons name="close" size={18} color="#8190B3" />
              </TouchableOpacity>
            </View>

            {goal && (
              <View className="mb-6 rounded-3xl border border-app-border-strong bg-app-surface-1 px-5 py-5 shadow-sm">
                <Text className="text-sm font-medium text-app-text-faint">Current balance</Text>
                <Text className="mt-1 text-2xl font-semibold text-app-text-strong">
                  {formatCurrency(parseFloat(goal.currentAmount ?? '0'))}
                </Text>
                <Text className="mt-3 text-xs text-app-text-faint">
                  Target {formatCurrency(parseFloat(goal.targetAmount ?? '0'))}
                </Text>
              </View>
            )}

            <View className="rounded-3xl border border-app-border-strong bg-app-surface-1 px-5 py-5 shadow-sm">
              <View className="space-y-6">
                <Controller
                  control={control}
                  name="amount"
                  rules={{ required: true }}
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="Contribution amount"
                      placeholder="100"
                      keyboardType="numeric"
                      value={value}
                      onChangeText={onChange}
                      variant="dark"
                      errorText={!value ? 'Amount is required' : undefined}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="contributedOn"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="Date"
                      placeholder="2024-04-15"
                      value={value || ''}
                      onChangeText={onChange}
                      variant="dark"
                      helperText="Auto-filled with today"
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="notes"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="Notes"
                      placeholder="Where did this money come from?"
                      multiline
                      numberOfLines={3}
                      value={value || ''}
                      onChangeText={onChange}
                      variant="dark"
                    />
                  )}
                />
              </View>
            </View>

            <View className="mt-6">
              <Button
                className="w-full"
                variant="primary-solid"
                title="Record contribution"
                onPress={handleSubmit(onSubmit)}
                loading={submitting}
                disabled={submitting}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
