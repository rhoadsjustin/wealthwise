import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/Card';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/useToast';
import { useActivityData, useAppData } from '@/app/_layout';
import {
  getAppleFinanceAccounts,
  getAppleFinanceAuthorizationStatus,
  getAppleFinanceAvailability,
  getAppleFinanceRecentTransactions,
  requestAppleFinanceAuthorization,
  type AppleFinanceAccount,
  type AppleFinanceAuthorizationStatus,
  type AppleFinanceTransaction,
} from '@/lib/appleFinance';
import {
  buildExistingTransactionDedupSet,
  buildImportedTransactionDedupKey,
  mapAppleFinanceTransactionToDraft,
} from '@/lib/appleFinanceImport';
import { formatCurrency, formatDate } from '@/lib/utils';

const screenOptions = { headerShown: false } as const;

export default function AppleCardImportModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { createTransaction, getTransactions, isInitialized } = useData();
  const { refreshActivityData } = useActivityData();
  const { refreshSummaryData } = useAppData();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [authorizationStatus, setAuthorizationStatus] =
    useState<AppleFinanceAuthorizationStatus>('notDetermined');
  const [financeKitEntitled, setFinanceKitEntitled] = useState(false);
  const [walletAvailable, setWalletAvailable] = useState(false);
  const [accounts, setAccounts] = useState<AppleFinanceAccount[]>([]);
  const [transactions, setTransactions] = useState<AppleFinanceTransaction[]>([]);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<string>>(new Set());
  const [existingDedupKeys, setExistingDedupKeys] = useState<Set<string>>(new Set());

  const loadFinanceKitState = useCallback(async () => {
    if (!isInitialized) return;

    setIsLoading(true);
    setAvailabilityError(null);

    try {
      const [availability, existingTransactions] = await Promise.all([
        getAppleFinanceAvailability(),
        getTransactions(),
      ]);

      setFinanceKitEntitled(availability.financeKitEntitled);
      setWalletAvailable(availability.walletDataAvailable);
      setExistingDedupKeys(buildExistingTransactionDedupSet(existingTransactions));

      if (!availability.financeKitEntitled) {
        setAuthorizationStatus('notDetermined');
        setAccounts([]);
        setTransactions([]);
        setSelectedTransactionIds(new Set());
        setAvailabilityError('This build is not signed with the Apple FinanceKit entitlement yet.');
        return;
      }

      const status = await getAppleFinanceAuthorizationStatus();
      setAuthorizationStatus(status);

      if (status === 'authorized' && availability.walletDataAvailable) {
        const [walletAccounts, recentTransactions] = await Promise.all([
          getAppleFinanceAccounts(),
          getAppleFinanceRecentTransactions(150),
        ]);

        const liabilityAccounts = walletAccounts.filter((account) => account.kind === 'liability');
        const liabilityAccountIds = new Set(liabilityAccounts.map((account) => account.id));
        const filteredTransactions = recentTransactions.filter((transaction) =>
          liabilityAccountIds.has(transaction.accountId)
        );

        setAccounts(liabilityAccounts);
        setTransactions(filteredTransactions);

        const existingKeys = buildExistingTransactionDedupSet(existingTransactions);
        const defaultSelected = filteredTransactions
          .filter((transaction) => !existingKeys.has(buildImportedTransactionDedupKey(transaction)))
          .map((transaction) => transaction.id);

        setSelectedTransactionIds(new Set(defaultSelected));
      } else {
        setAccounts([]);
        setTransactions([]);
        setSelectedTransactionIds(new Set());
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load Apple Wallet data.';
      setAvailabilityError(message);
      setFinanceKitEntitled(false);
      setAccounts([]);
      setTransactions([]);
      setSelectedTransactionIds(new Set());
    } finally {
      setIsLoading(false);
    }
  }, [getTransactions, isInitialized]);

  useEffect(() => {
    loadFinanceKitState();
  }, [loadFinanceKitState]);

  const transactionAccountMap = useMemo(() => {
    const map = new Map<string, AppleFinanceAccount>();
    accounts.forEach((account) => map.set(account.id, account));
    return map;
  }, [accounts]);

  const previewRows = useMemo(
    () =>
      transactions.map((transaction) => {
        const draft = mapAppleFinanceTransactionToDraft(transaction);
        const isDuplicate = existingDedupKeys.has(buildImportedTransactionDedupKey(transaction));
        return {
          transaction,
          draft,
          isDuplicate,
          account: transactionAccountMap.get(transaction.accountId) ?? null,
        };
      }),
    [existingDedupKeys, transactionAccountMap, transactions]
  );

  const selectableRows = previewRows.filter((row) => !row.isDuplicate);
  const selectedCount = selectableRows.filter((row) =>
    selectedTransactionIds.has(row.transaction.id)
  ).length;

  const handleAuthorize = async () => {
    setIsAuthorizing(true);
    try {
      const status = await requestAppleFinanceAuthorization();
      setAuthorizationStatus(status);
      if (status === 'authorized') {
        showToast.success('Wallet connected', 'Apple Card transactions are ready to review.');
      }
      await loadFinanceKitState();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'FinanceKit authorization failed.';
      showToast.error('Authorization failed', message);
    } finally {
      setIsAuthorizing(false);
    }
  };

  const toggleTransaction = (transactionId: string) => {
    setSelectedTransactionIds((current) => {
      const next = new Set(current);
      if (next.has(transactionId)) {
        next.delete(transactionId);
      } else {
        next.add(transactionId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedTransactionIds(new Set(selectableRows.map((row) => row.transaction.id)));
  };

  const clearSelection = () => {
    setSelectedTransactionIds(new Set());
  };

  const handleImport = async () => {
    const rowsToImport = previewRows.filter(
      (row) => !row.isDuplicate && selectedTransactionIds.has(row.transaction.id)
    );

    if (!rowsToImport.length) {
      showToast.info('Nothing selected', 'Choose at least one new transaction to import.');
      return;
    }

    setIsImporting(true);
    try {
      for (const row of rowsToImport) {
        await createTransaction(row.draft);
      }

      await Promise.all([refreshActivityData(), refreshSummaryData()]);
      showToast.success(
        'Import complete',
        `${rowsToImport.length} Apple Card transaction${rowsToImport.length === 1 ? '' : 's'} added.`
      );
      router.replace('/activity' as any);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed.';
      showToast.error('Import failed', message);
    } finally {
      setIsImporting(false);
    }
  };

  const topPadding = Math.max(insets.top + 8, 24);
  const bottomPadding = Math.max(insets.bottom + 18, 28);

  return (
    <View className="flex-1 bg-app-canvas">
      <Stack.Screen options={screenOptions} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: topPadding, paddingBottom: bottomPadding }}
        keyboardShouldPersistTaps="handled">
        <View className="px-5">
          <View className="mb-5 flex-row items-center justify-between">
            <View className="pr-4">
              <Text className="text-3xl font-semibold text-app-text-strong">Apple Card import</Text>
              <Text className="mt-1 text-sm text-app-text-faint">
                Review recent Wallet transactions and bring them into your budget.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.back()}
              accessibilityLabel="Close Apple Card import"
              className="h-11 w-11 items-center justify-center rounded-full border border-app-border bg-app-surface-1">
              <Ionicons name="close" size={18} color="#F8FAFC" />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <Card variant="glass-dark">
              <CardContent className="flex-row items-center py-2">
                <ActivityIndicator size="small" color="#59F7A5" />
                <Text className="ml-3 text-sm text-app-text-faint">
                  Checking FinanceKit availability...
                </Text>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card variant="hero" className="mb-4">
                <CardHeader className="pb-3">
                  <CardTitle variant="small">Status</CardTitle>
                  <CardDescription>
                    FinanceKit is iPhone-only and requires iOS 17.4 or later with Wallet financial
                    data available on this device.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <View className="gap-2">
                    <StatusRow
                      label="Platform"
                      value={Platform.OS === 'ios' ? 'iOS' : 'Not iOS'}
                      tone={Platform.OS === 'ios' ? 'good' : 'bad'}
                    />
                    <StatusRow
                      label="Wallet data"
                      value={walletAvailable ? 'Available' : 'Unavailable'}
                      tone={walletAvailable ? 'good' : 'bad'}
                    />
                    <StatusRow
                      label="Entitlement"
                      value={financeKitEntitled ? 'Present' : 'Missing'}
                      tone={financeKitEntitled ? 'good' : 'bad'}
                    />
                    <StatusRow
                      label="Authorization"
                      value={authorizationStatus}
                      tone={authorizationStatus === 'authorized' ? 'good' : 'neutral'}
                    />
                  </View>
                  {availabilityError ? (
                    <Text className="mt-4 text-sm leading-5 text-error-600">
                      {availabilityError}
                    </Text>
                  ) : null}
                </CardContent>
              </Card>

              {financeKitEntitled && authorizationStatus !== 'authorized' ? (
                <Card variant="glass-dark" className="mb-4">
                  <CardHeader className="pb-3">
                    <CardTitle variant="small">Connect Wallet</CardTitle>
                    <CardDescription>
                      Ask iOS for permission to access eligible Wallet financial data for import.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="primary-solid"
                      title="Authorize Apple Wallet access"
                      loading={isAuthorizing}
                      onPress={handleAuthorize}
                    />
                  </CardContent>
                </Card>
              ) : null}

              {authorizationStatus === 'authorized' ? (
                <>
                  <Card variant="glass-dark" className="mb-4">
                    <CardHeader className="pb-3">
                      <CardTitle variant="small">Eligible accounts</CardTitle>
                      <CardDescription>
                        This first pass focuses on liability accounts, which is the Apple Card path.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {accounts.length ? (
                        <View className="gap-3">
                          {accounts.map((account) => (
                            <View
                              key={account.id}
                              className="rounded-2xl border border-app-border bg-app-canvas-elevated px-4 py-3">
                              <Text className="text-sm font-semibold text-app-text-strong">
                                {account.displayName}
                              </Text>
                              <Text className="mt-1 text-xs text-app-text-faint">
                                {account.institutionName} · {account.currencyCode}
                              </Text>
                              {account.creditLimit?.amount ? (
                                <Text className="mt-2 text-xs text-app-text-soft">
                                  Credit limit {formatCurrency(Number(account.creditLimit.amount))}
                                </Text>
                              ) : null}
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text className="text-sm text-app-text-muted">
                          No eligible Apple Card accounts were returned by FinanceKit.
                        </Text>
                      )}
                    </CardContent>
                  </Card>

                  <Card variant="glass-dark">
                    <CardHeader className="pb-3">
                      <CardTitle variant="small">Recent transactions</CardTitle>
                      <CardDescription>
                        Duplicate rows are pre-filtered using existing local transactions by date,
                        amount, and normalized description.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <View className="mb-4 flex-row items-center justify-between">
                        <Text className="text-xs text-app-text-muted">
                          {selectedCount} selected - {previewRows.length} loaded
                        </Text>
                        <View className="flex-row gap-2">
                          <Button
                            size="sm"
                            variant="secondary-muted"
                            title="Select all"
                            onPress={selectAll}
                          />
                          <Button size="sm" variant="pill" title="Clear" onPress={clearSelection} />
                        </View>
                      </View>

                      <View className="gap-3">
                        {previewRows.length ? (
                          previewRows.map((row) => {
                            const isSelected = selectedTransactionIds.has(row.transaction.id);
                            return (
                              <TouchableOpacity
                                key={row.transaction.id}
                                activeOpacity={row.isDuplicate ? 1 : 0.8}
                                disabled={row.isDuplicate}
                                onPress={() => toggleTransaction(row.transaction.id)}
                                className={`rounded-2xl border px-4 py-4 ${
                                  row.isDuplicate
                                    ? 'border-app-border bg-app-canvas-elevated opacity-60'
                                    : isSelected
                                      ? 'border-app-border-contrast bg-app-surface-2'
                                      : 'border-app-border bg-app-surface-1'
                                }`}>
                                <View className="flex-row items-start justify-between">
                                  <View className="flex-1 pr-4">
                                    <Text className="text-sm font-semibold text-app-text-strong">
                                      {row.draft.description}
                                    </Text>
                                    <Text className="mt-1 text-xs text-app-text-faint">
                                      {formatDate(row.draft.date)} ·{' '}
                                      {row.account?.displayName ?? 'Wallet account'}
                                    </Text>
                                    <Text className="mt-2 text-xs text-app-text-soft">
                                      {row.draft.type === 'expense' ? 'Expense' : 'Income'} ·{' '}
                                      {formatCurrency(Number(row.draft.amount))}
                                    </Text>
                                    {row.isDuplicate ? (
                                      <Text className="mt-2 text-xs font-medium text-warning-700">
                                        Already imported or already logged locally
                                      </Text>
                                    ) : null}
                                  </View>
                                  <View className="pt-1">
                                    <Ionicons
                                      name={
                                        row.isDuplicate
                                          ? 'remove-circle-outline'
                                          : isSelected
                                            ? 'checkmark-circle'
                                            : 'ellipse-outline'
                                      }
                                      size={22}
                                      color={
                                        row.isDuplicate
                                          ? '#94A3B8'
                                          : isSelected
                                            ? '#59F7A5'
                                            : '#94A3B8'
                                      }
                                    />
                                  </View>
                                </View>
                              </TouchableOpacity>
                            );
                          })
                        ) : (
                          <Text className="text-sm text-app-text-muted">
                            No recent Apple Card transactions were returned yet.
                          </Text>
                        )}
                      </View>
                    </CardContent>
                  </Card>
                </>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>

      <View
        className="border-t border-app-border bg-app-surface-1 px-5 pt-3"
        style={{ paddingBottom: bottomPadding }}>
        <Button
          size="lg"
          variant="primary-solid"
          title={isImporting ? 'Importing...' : 'Import selected transactions'}
          loading={isImporting}
          disabled={authorizationStatus !== 'authorized' || selectedCount === 0}
          onPress={handleImport}
        />
      </View>
    </View>
  );
}

function StatusRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'good' | 'bad' | 'neutral';
}) {
  const toneClass =
    tone === 'good'
      ? 'text-accent-income'
      : tone === 'bad'
        ? 'text-accent-expense'
        : 'text-app-text-soft';

  return (
    <View className="flex-row items-center justify-between rounded-2xl bg-app-canvas-elevated px-4 py-3">
      <Text className="text-sm text-app-text-soft">{label}</Text>
      <Text className={`text-sm font-medium ${toneClass}`}>{value}</Text>
    </View>
  );
}
