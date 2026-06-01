import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Switch,
  Platform,
  Alert,
  TouchableOpacity,
  ScrollView,
  Keyboard,
} from 'react-native';
import { Stack, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/context/useAuth';
import { IncomeFrequency, ReminderSettings, useData } from '@/context/DataContext';
import { localStorage } from '@/lib/local-storage';
import { scheduleBudgetReminders, cancelBudgetReminders } from '@/lib/notifications';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { TopUtilityBar } from '@/components/TopUtilityBar';

const frequencyOptions: IncomeFrequency[] = ['weekly', 'biweekly', 'semimonthly', 'monthly'];

const sanitizeMoneyInput = (value: string) => {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  return parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
};

const formatCurrency = (value: string | number | null | undefined) => {
  const parsed = typeof value === 'number' ? value : parseFloat(String(value ?? '0'));
  if (!Number.isFinite(parsed)) return '$0';
  return parsed.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

export default function ProfileModal() {
  const router = useRouter();
  const transactionImportRoute = '/imports' as Href;
  const { username, login } = useAuth();
  const {
    updateUserProfile,
    getUserProfile,
    monthlyIncome,
    updateMonthlyIncome,
    isDemoMode,
    setDemoMode,
    getIncomeSources,
    createIncomeSource,
    deleteIncomeSource,
    getSavingsAccounts,
    createSavingsAccount,
    deleteSavingsAccount,
    getReminderSettings,
    updateReminderSettings,
  } = useData();
  const [name, setName] = useState(username || '');
  const [requireLock, setRequireLock] = useState(false);
  const [demoModeEnabled, setDemoModeEnabled] = useState(isDemoMode);
  const [incomeInput, setIncomeInput] = useState('');
  const [incomeError, setIncomeError] = useState<string | null>(null);
  const [incomeSources, setIncomeSources] = useState<any[]>([]);
  const [incomeForm, setIncomeForm] = useState({
    name: '',
    grossAmount: '',
    netAmount: '',
    taxAmount: '',
    deductionAmount: '',
    frequency: 'biweekly' as IncomeFrequency,
    nextPayDate: '',
  });
  const [savingsAccounts, setSavingsAccounts] = useState<any[]>([]);
  const [savingsForm, setSavingsForm] = useState({ name: '', balance: '' });
  const [reminders, setReminders] = useState<ReminderSettings>({
    enabled: false,
    monthlySnapshotEnabled: true,
    cadence: 'weekly',
    hour: 9,
    minute: 0,
  });

  useEffect(() => {
    const load = async () => {
      await localStorage.init();
      const lock = await localStorage.getSetting('requireAppLock');
      const [sources, accounts, reminderSettings] = await Promise.all([
        getIncomeSources(),
        getSavingsAccounts(),
        getReminderSettings(),
      ]);
      setRequireLock(Boolean(lock));
      setIncomeSources(sources);
      setSavingsAccounts(accounts);
      setReminders(reminderSettings);
    };
    load();
  }, [getIncomeSources, getReminderSettings, getSavingsAccounts]);

  useEffect(() => {
    if (monthlyIncome != null && Number.isFinite(monthlyIncome)) {
      setIncomeInput(String(monthlyIncome));
    } else {
      setIncomeInput('');
    }
  }, [monthlyIncome]);

  useEffect(() => {
    setDemoModeEnabled(isDemoMode);
  }, [isDemoMode]);

  const handleIncomeChange = (value: string) => {
    const normalized = sanitizeMoneyInput(value);
    if (incomeError) setIncomeError(null);
    setIncomeInput(normalized);
  };

  const addIncomeSource = async () => {
    if (!incomeForm.name.trim() || !incomeForm.grossAmount || !incomeForm.netAmount) {
      Alert.alert('Income source needed', 'Add a name, gross pay, and net pay.');
      return;
    }

    const saved = await createIncomeSource({
      ...incomeForm,
      taxAmount: incomeForm.taxAmount || null,
      deductionAmount: incomeForm.deductionAmount || null,
      nextPayDate: incomeForm.nextPayDate || null,
      isActive: true,
    });
    setIncomeSources((current) => [...current, saved]);
    setIncomeForm({
      name: '',
      grossAmount: '',
      netAmount: '',
      taxAmount: '',
      deductionAmount: '',
      frequency: 'biweekly',
      nextPayDate: '',
    });
  };

  const removeIncomeSource = async (id: number) => {
    await deleteIncomeSource(id);
    setIncomeSources((current) => current.filter((source) => source.id !== id));
  };

  const addSavingsAccount = async () => {
    if (!savingsForm.name.trim() || !savingsForm.balance) {
      Alert.alert('Savings account needed', 'Add an account name and current balance.');
      return;
    }

    const saved = await createSavingsAccount({
      name: savingsForm.name,
      balance: savingsForm.balance,
    });
    setSavingsAccounts((current) => [...current, saved]);
    setSavingsForm({ name: '', balance: '' });
  };

  const removeSavingsAccount = async (id: number) => {
    await deleteSavingsAccount(id);
    setSavingsAccounts((current) => current.filter((account) => account.id !== id));
  };

  const closeProfile = React.useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/(tabs)');
  }, [router]);

  const saveProfile = async () => {
    try {
      const user = await getUserProfile();
      if (name && name !== user.username) {
        await updateUserProfile({ username: name });
        await login(name);
      }

      const cleanedIncome = incomeInput.replace(/[^0-9.]/g, '');
      const parsedIncome = parseFloat(cleanedIncome);

      if (cleanedIncome && (Number.isNaN(parsedIncome) || parsedIncome <= 0)) {
        setIncomeError('Enter a valid monthly amount');
        return;
      } else {
        setIncomeError(null);
      }

      if (cleanedIncome && parsedIncome !== monthlyIncome) {
        await updateMonthlyIncome(parsedIncome);
      }

      if (demoModeEnabled !== isDemoMode) {
        await setDemoMode(demoModeEnabled);
      }

      await localStorage.setSetting('requireAppLock', requireLock);
      await updateReminderSettings(reminders);
      if (reminders.enabled) {
        await scheduleBudgetReminders(reminders);
      } else {
        await cancelBudgetReminders();
      }
      Alert.alert('Saved', 'Profile updated');
      closeProfile();
    } catch (error) {
      console.error('Failed to save profile', error);
      Alert.alert('Error', 'Failed to save profile');
    }
  };

  const insets = useSafeAreaInsets();

  const screenOptions = React.useMemo(() => ({ headerShown: false }), []);

  return (
    <View className="flex-1 bg-app-canvas">
      <Stack.Screen options={screenOptions} />
      <TopUtilityBar
        badge="Profile"
        actionIcon="close"
        onPressAction={closeProfile}
      />
      <ScrollView
        className="flex-1"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom + 32, 56),
        }}
        scrollEnabled
        bounces
        alwaysBounceVertical
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
        <View className="px-5">


          <View className="space-y-5">
            <View className="rounded-3xl border border-app-border-strong bg-app-surface-1 px-5 py-5 shadow-sm">
              <Text className="text-sm font-medium text-app-text-faint">Display name</Text>
              <Input
                label="Username"
                placeholder="Your username"
                value={name}
                onChangeText={setName}
                variant="dark"
                className="mt-3"
              />
            </View>

            <View className="rounded-3xl border border-app-border-strong bg-app-surface-1 px-5 py-5 shadow-sm">
              <Text className="text-base font-semibold text-app-text-strong">Household income</Text>
              <Text className="mt-2 text-xs text-app-text-faint">
                Used to benchmark budgets and insight recommendations.
              </Text>
              <Input
                className="mt-4"
                size="lg"
                keyboardType="decimal-pad"
                placeholder="e.g. 5500"
                value={incomeInput}
                onChangeText={handleIncomeChange}
                variant="dark"
                helperText="Monthly take-home amount"
                errorText={incomeError || undefined}
                maxLength={12}
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
              />
            </View>

            <View className="rounded-3xl border border-app-border-strong bg-app-surface-1 px-5 py-5 shadow-sm">
              <Text className="text-base font-semibold text-app-text-strong">
                Paycheck profiles
              </Text>
              <Text className="mt-2 text-xs leading-5 text-app-text-faint">
                Track gross pay, taxes, deductions, and take-home pay by paycheck rhythm.
              </Text>

              <View className="mt-4 gap-3">
                {incomeSources.map((source) => (
                  <View
                    key={source.id}
                    className="flex-row items-center justify-between rounded-2xl bg-app-surface-2 px-4 py-3">
                    <View className="flex-1 pr-3">
                      <Text className="text-sm font-semibold text-app-text-strong">
                        {source.name}
                      </Text>
                      <Text className="mt-1 text-xs text-app-text-faint">
                        {formatCurrency(source.netAmount)} net • {source.frequency}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeIncomeSource(source.id)}
                      accessibilityLabel={`Delete ${source.name} income source`}
                      className="h-10 w-10 items-center justify-center rounded-full bg-error-500/10">
                      <Ionicons name="trash-outline" size={16} color="#FF5D8F" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <View className="mt-5 gap-3">
                <Input
                  variant="dark"
                  placeholder="Paycheck name"
                  value={incomeForm.name}
                  onChangeText={(name) => setIncomeForm((current) => ({ ...current, name }))}
                />
                <View className="gap-3">
                  <Input
                    variant="dark"
                    keyboardType="decimal-pad"
                    placeholder="Gross"
                    value={incomeForm.grossAmount}
                    onChangeText={(grossAmount) =>
                      setIncomeForm((current) => ({
                        ...current,
                        grossAmount: sanitizeMoneyInput(grossAmount),
                      }))
                    }
                  />
                  <Input
                    variant="dark"
                    keyboardType="decimal-pad"
                    placeholder="Net"
                    value={incomeForm.netAmount}
                    onChangeText={(netAmount) =>
                      setIncomeForm((current) => ({
                        ...current,
                        netAmount: sanitizeMoneyInput(netAmount),
                      }))
                    }
                  />
                </View>
                <View className="gap-3">
                  <Input
                    variant="dark"
                    keyboardType="decimal-pad"
                    placeholder="Taxes"
                    value={incomeForm.taxAmount}
                    onChangeText={(taxAmount) =>
                      setIncomeForm((current) => ({
                        ...current,
                        taxAmount: sanitizeMoneyInput(taxAmount),
                      }))
                    }
                  />
                  <Input
                    variant="dark"
                    keyboardType="decimal-pad"
                    placeholder="Deductions"
                    value={incomeForm.deductionAmount}
                    onChangeText={(deductionAmount) =>
                      setIncomeForm((current) => ({
                        ...current,
                        deductionAmount: sanitizeMoneyInput(deductionAmount),
                      }))
                    }
                  />
                </View>
                <View className="flex-row flex-wrap gap-2">
                  {frequencyOptions.map((frequency) => (
                    <TouchableOpacity
                      key={frequency}
                      onPress={() => setIncomeForm((current) => ({ ...current, frequency }))}
                      className={`rounded-full border px-3 py-2 ${incomeForm.frequency === frequency
                          ? 'border-accent-income bg-success-500/10'
                          : 'border-app-border-strong bg-app-surface-2'
                        }`}>
                      <Text
                        className={`text-xs font-semibold ${incomeForm.frequency === frequency
                            ? 'text-accent-income'
                            : 'text-app-text-faint'
                          }`}>
                        {frequency}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Button
                  variant="secondary-muted"
                  title="Add paycheck profile"
                  onPress={addIncomeSource}
                />
              </View>
            </View>

            <View className="rounded-3xl border border-app-border-strong bg-app-surface-1 px-5 py-5 shadow-sm">
              <Text className="text-base font-semibold text-app-text-strong">
                Savings account totals
              </Text>
              <Text className="mt-2 text-xs leading-5 text-app-text-faint">
                Manual account balances roll into dashboard and monthly snapshots.
              </Text>

              <View className="mt-4 gap-3">
                {savingsAccounts.map((account) => (
                  <View
                    key={account.id}
                    className="flex-row items-center justify-between rounded-2xl bg-app-surface-2 px-4 py-3">
                    <View className="flex-1 pr-3">
                      <Text className="text-sm font-semibold text-app-text-strong">
                        {account.name}
                      </Text>
                      <Text className="mt-1 text-xs text-accent-savings">
                        {formatCurrency(account.balance)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeSavingsAccount(account.id)}
                      accessibilityLabel={`Delete ${account.name} savings account`}
                      className="h-10 w-10 items-center justify-center rounded-full bg-error-500/10">
                      <Ionicons name="trash-outline" size={16} color="#FF5D8F" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <View className="mt-5 gap-3">
                <Input
                  variant="dark"
                  placeholder="Account name"
                  value={savingsForm.name}
                  onChangeText={(name) => setSavingsForm((current) => ({ ...current, name }))}
                />
                <Input
                  variant="dark"
                  keyboardType="decimal-pad"
                  placeholder="Current balance"
                  value={savingsForm.balance}
                  onChangeText={(balance) =>
                    setSavingsForm((current) => ({
                      ...current,
                      balance: sanitizeMoneyInput(balance),
                    }))
                  }
                />
                <Button
                  variant="secondary-muted"
                  title="Add savings account"
                  onPress={addSavingsAccount}
                />
              </View>
            </View>

            <View className="rounded-3xl border border-app-border-strong bg-app-surface-1 px-5 py-5 shadow-sm">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-4">
                  <Text className="text-base font-semibold text-app-text-strong">Demo mode</Text>
                  <Text className="mt-2 text-xs text-app-text-faint">
                    Hide your real money amounts with consistent stand-in numbers while showing the
                    app.
                  </Text>
                </View>
                <Switch
                  value={demoModeEnabled}
                  onValueChange={setDemoModeEnabled}
                  thumbColor={demoModeEnabled ? '#58B6FF' : '#8190B3'}
                  trackColor={{ true: '#182136', false: '#0D1325' }}
                />
              </View>
            </View>

            <View className="rounded-3xl border border-app-border-strong bg-app-surface-1 px-5 py-5 shadow-sm">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-4">
                  <Text className="text-base font-semibold text-app-text-strong">
                    Budget reminders
                  </Text>
                  <Text className="mt-2 text-xs leading-5 text-app-text-faint">
                    Local notifications for tracking check-ins and month-start snapshots.
                  </Text>
                </View>
                <Switch
                  value={reminders.enabled}
                  onValueChange={(enabled) => setReminders((current) => ({ ...current, enabled }))}
                  thumbColor={reminders.enabled ? '#58B6FF' : '#8190B3'}
                  trackColor={{ true: '#182136', false: '#0D1325' }}
                />
              </View>
              <View className="mt-4 flex-row flex-wrap gap-2">
                {(['daily', 'weekly', 'monthly'] as const).map((cadence) => (
                  <TouchableOpacity
                    key={cadence}
                    onPress={() => setReminders((current) => ({ ...current, cadence }))}
                    className={`rounded-full border px-3 py-2 ${reminders.cadence === cadence
                        ? 'border-accent-savings bg-info-500/10'
                        : 'border-app-border-strong bg-app-surface-2'
                      }`}>
                    <Text
                      className={`text-xs font-semibold ${reminders.cadence === cadence
                          ? 'text-accent-savings'
                          : 'text-app-text-faint'
                        }`}>
                      {cadence}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View className="mt-4 gap-3">
                <Input
                  variant="dark"
                  keyboardType="numeric"
                  placeholder="Hour"
                  value={String(reminders.hour)}
                  onChangeText={(hour) =>
                    setReminders((current) => ({
                      ...current,
                      hour: Math.min(Math.max(Number.parseInt(hour || '0', 10), 0), 23),
                    }))
                  }
                />
                <Input
                  variant="dark"
                  keyboardType="numeric"
                  placeholder="Minute"
                  value={String(reminders.minute).padStart(2, '0')}
                  onChangeText={(minute) =>
                    setReminders((current) => ({
                      ...current,
                      minute: Math.min(Math.max(Number.parseInt(minute || '0', 10), 0), 59),
                    }))
                  }
                />
              </View>
              <View className="mt-4 flex-row items-center justify-between">
                <Text className="text-sm text-app-text-soft">Monthly snapshot</Text>
                <Switch
                  value={reminders.monthlySnapshotEnabled}
                  onValueChange={(monthlySnapshotEnabled) =>
                    setReminders((current) => ({ ...current, monthlySnapshotEnabled }))
                  }
                  thumbColor={reminders.monthlySnapshotEnabled ? '#58B6FF' : '#8190B3'}
                  trackColor={{ true: '#182136', false: '#0D1325' }}
                />
              </View>
            </View>

            <View className="rounded-3xl border border-app-border-strong bg-app-surface-1 px-5 py-5 shadow-sm">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-4">
                  <Text className="text-base font-semibold text-app-text-strong">
                    Require app lock on open
                  </Text>
                  <Text className="mt-2 text-xs text-app-text-faint">
                    Use Face ID / Touch ID or your passcode.
                  </Text>
                </View>
                <Switch
                  value={requireLock}
                  onValueChange={setRequireLock}
                  thumbColor={requireLock ? '#58B6FF' : '#8190B3'}
                  trackColor={{ true: '#182136', false: '#0D1325' }}
                />
              </View>
            </View>

            <View className="rounded-3xl border border-app-border-strong bg-app-surface-1 px-5 py-5 shadow-sm">
              <Text className="text-base font-semibold text-app-text-strong">Imports</Text>
              <Text className="mt-2 text-xs leading-5 text-app-text-faint">
                Open the import launcher for statement capture or Apple Card transaction review.
              </Text>
              <Button
                className="mt-4"
                variant="secondary-muted"
                title="Open imports"
                onPress={() => router.push(transactionImportRoute)}
              />
            </View>

            <Button
              className="w-full"
              size="lg"
              variant="primary-solid"
              title="Save changes"
              onPress={saveProfile}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
