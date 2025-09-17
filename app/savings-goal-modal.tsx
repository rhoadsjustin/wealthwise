import React from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { useSavings, SavingsGoal } from '@/context/DataContext';
import { useToast } from '@/context/useToast';
import { useAppData } from './_layout';

interface SavingsGoalFormValues {
  name: string;
  targetAmount: string;
  monthlyContribution?: string;
  targetDate?: string;
  autoDeduct?: boolean;
  notes?: string;
}

export default function SavingsGoalModal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const goalIdParam = typeof params.goalId === 'string' ? Number(params.goalId) : undefined;
  const { toast } = useToast();
  const {
    createSavingsGoal,
    updateSavingsGoal,
    getSavingsGoals,
  } = useSavings();
  const { refreshAppData } = useAppData();
  const [initialGoal, setInitialGoal] = React.useState<SavingsGoal | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [bootstrapping, setBootstrapping] = React.useState(Boolean(goalIdParam));

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SavingsGoalFormValues>({
    defaultValues: {
      name: '',
      targetAmount: '',
      monthlyContribution: '',
      targetDate: '',
      autoDeduct: true,
      notes: '',
    },
  });

  React.useEffect(() => {
    let mounted = true;
    const loadGoal = async () => {
      if (!goalIdParam) {
        if (mounted) {
          setBootstrapping(false);
        }
        return;
      }
      try {
        const goals = await getSavingsGoals();
        if (!mounted) return;
        const goal = goals.find((g) => g.id === goalIdParam);
        if (goal) {
          setInitialGoal(goal);
          setValue('name', goal.name);
          setValue('targetAmount', goal.targetAmount ?? '');
          setValue('monthlyContribution', goal.monthlyContribution ?? '');
          setValue('targetDate', goal.targetDate ?? '');
          setValue('autoDeduct', Boolean(goal.autoDeduct));
          setValue('notes', goal.notes ?? '');
        }
      } finally {
        if (mounted) {
          setBootstrapping(false);
        }
      }
    };
    loadGoal();
    return () => {
      mounted = false;
    };
  }, [goalIdParam, getSavingsGoals, setValue]);

  const onSubmit = async (values: SavingsGoalFormValues) => {
    if (!values.name?.trim()) {
      toast({
        title: 'Name required',
        description: 'Give your savings goal a descriptive name.',
        variant: 'destructive',
      });
      return;
    }

    if (!values.targetAmount || Number.isNaN(Number(values.targetAmount))) {
      toast({
        title: 'Invalid amount',
        description: 'Add a valid target amount for this goal.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name: values.name.trim(),
        targetAmount: values.targetAmount,
        monthlyContribution: values.monthlyContribution?.trim() || undefined,
        targetDate: values.targetDate?.trim() || undefined,
        autoDeduct: values.autoDeduct ?? true,
        notes: values.notes?.trim() || undefined,
      };

      if (goalIdParam && initialGoal) {
        await updateSavingsGoal(goalIdParam, payload);
        toast({ title: 'Savings goal updated', description: 'Your changes have been saved.' });
      } else {
        await createSavingsGoal(payload);
        toast({ title: 'Savings goal created', description: 'Savings has been added to your plan.' });
      }

      await refreshAppData();
      router.back();
    } catch (error) {
      console.error('Failed to save savings goal', error);
      toast({
        title: 'Unable to save goal',
        description: 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const modalTitle = goalIdParam ? 'Edit savings goal' : 'New savings goal';

  return (
    <SafeAreaView className="flex-1 bg-app-background">
      <Stack.Screen
        options={{
          title: modalTitle,
          headerTitleAlign: 'center',
        }}
      />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}>
        <ScrollView className="flex-1 px-4 pb-10">
          <View className="mt-6 gap-6">
            <Controller
              control={control}
              name="name"
              rules={{ required: true }}
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Goal name"
                  placeholder="Emergency fund"
                  value={value}
                  onChangeText={onChange}
                  errorText={errors.name ? 'Name is required' : undefined}
                />
              )}
            />

            <Controller
              control={control}
              name="targetAmount"
              rules={{ required: true }}
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Target amount"
                  placeholder="5000"
                  keyboardType="numeric"
                  value={value}
                  onChangeText={onChange}
                  helperText="Enter the total amount you want to save"
                  errorText={errors.targetAmount ? 'Target amount is required' : undefined}
                />
              )}
            />

            <Controller
              control={control}
              name="monthlyContribution"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Monthly contribution"
                  placeholder="250"
                  keyboardType="numeric"
                  value={value || ''}
                  onChangeText={onChange}
                  helperText="Amount to subtract from income each month"
                />
              )}
            />

            <Controller
              control={control}
              name="targetDate"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Target date"
                  placeholder="2024-12-31"
                  value={value || ''}
                  onChangeText={onChange}
                  helperText="Optional. Use YYYY-MM-DD format"
                />
              )}
            />

            <Controller
              control={control}
              name="autoDeduct"
              render={({ field: { value, onChange } }) => (
                <View className="flex-row items-center justify-between rounded-xl bg-app-surface px-4 py-3">
                  <View className="flex-1 pr-4">
                    <Text className="text-base font-medium text-foreground-primary">Auto-transfer</Text>
                    <Text className="mt-1 text-sm text-foreground-muted">
                      Reserve this amount from income before budgeting
                    </Text>
                  </View>
                  <Switch
                    value={value ?? true}
                    onValueChange={onChange}
                    thumbColor={value ? '#0EA5E9' : '#f4f3f4'}
                    trackColor={{ true: '#bae6fd', false: '#e5e7eb' }}
                  />
                </View>
              )}
            />

            <Controller
              control={control}
              name="notes"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Notes"
                  placeholder="Any extra details"
                  multiline
                  numberOfLines={4}
                  value={value || ''}
                  onChangeText={onChange}
                  helperText="Optional context for this savings goal"
                />
              )}
            />

            <View className="flex-row gap-3">
              <Button
                variant="outline"
                className="flex-1"
                size="lg"
                title="Cancel"
                onPress={() => router.back()}
                disabled={loading}
              />
              <Button
                className="flex-1"
                size="lg"
                title={goalIdParam ? 'Save changes' : 'Create goal'}
                onPress={handleSubmit(onSubmit)}
                loading={loading}
                disabled={loading || bootstrapping}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
