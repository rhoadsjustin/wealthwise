import React from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { useSavings, SavingsGoal } from '@/context/DataContext';
import { useToast } from '@/context/useToast';
import { useAppData } from './_layout';
import { formatCurrency } from '@/lib/utils';

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

  return (
    <SafeAreaView className="flex-1 bg-app-background">
      <Stack.Screen
        options={{
          title: goal ? `Fund ${goal.name}` : 'Fund savings goal',
          headerTitleAlign: 'center',
        }}
      />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}>
        <ScrollView className="flex-1 px-4 pb-10">
          <View className="mt-6 gap-6">
            {goal ? (
              <View className="rounded-xl bg-app-surface p-4">
                <Text className="text-sm uppercase tracking-wide text-foreground-muted">
                  Current balance
                </Text>
                <Text className="mt-1 text-2xl font-semibold text-foreground-primary">
                  {formatCurrency(parseFloat(goal.currentAmount ?? '0'))}
                </Text>
                <Text className="mt-2 text-sm text-foreground-muted">
                  Target {formatCurrency(parseFloat(goal.targetAmount ?? '0'))}
                </Text>
              </View>
            ) : null}

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
                />
              )}
            />

            <View className="flex-row gap-3">
              <Button
                variant="outline"
                className="flex-1"
                title="Cancel"
                onPress={() => router.back()}
                disabled={submitting}
              />
              <Button
                className="flex-1"
                title="Record contribution"
                onPress={handleSubmit(onSubmit)}
                loading={submitting}
                disabled={submitting}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
