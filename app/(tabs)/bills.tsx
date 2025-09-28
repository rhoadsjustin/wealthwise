import React from 'react';
import { ScrollView, View, Text, RefreshControl, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HeaderProfileButton from '@/components/HeaderProfileButton';
import { BillCard } from '@/components/BillCard';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/Button';
import { useAppData } from '../_layout';
import { useBills } from '@/context/DataContext';
import { useToast } from '@/context/useToast';

export default function BillsTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bills, categories, summaryLoading, refreshAppData } = useAppData();
  const { markBillPaid, getBills } = useBills();
  const { toast } = useToast();

  const [refreshing, setRefreshing] = React.useState(false);
  const [payingBillId, setPayingBillId] = React.useState<number | null>(null);
  const [localBills, setLocalBills] = React.useState(bills || []);

  React.useEffect(() => {
    setLocalBills(bills || []);
  }, [bills]);

  const categoryMap = React.useMemo(() => {
    return new Map((categories || []).map((category: any) => [category.id, category]));
  }, [categories]);

  const handleRefresh = React.useCallback(async () => {
    try {
      setRefreshing(true);
      await refreshAppData();
      const latest = await getBills();
      setLocalBills(latest);
    } finally {
      setRefreshing(false);
    }
  }, [getBills, refreshAppData]);

  const handleAddBill = React.useCallback(() => {
    router.push('/bill-modal');
  }, [router]);

  const handleEditBill = React.useCallback(
    (bill: any) => {
      router.push({ pathname: '/bill-modal', params: { billId: bill.id } });
    },
    [router]
  );

  const handleMarkPaid = React.useCallback(
    async (bill: any) => {
      if (!bill?.id) return;
      try {
        setPayingBillId(bill.id);
        await markBillPaid(bill.id);
        toast({
          title: 'Bill recorded',
          description: `${bill.name} marked as paid for this month.`,
          variant: 'success',
        });
        await refreshAppData();
        const next = await getBills();
        setLocalBills(next);
      } catch (error) {
        console.error('Failed to mark bill paid', error);
        toast({
          title: 'Unable to mark bill',
          description: 'Please try again in a moment.',
          variant: 'destructive',
        });
      } finally {
        setPayingBillId(null);
      }
    },
    [getBills, markBillPaid, refreshAppData, toast]
  );

  const hasBills = localBills && localBills.length > 0;

  return (
    <View className="flex-1 bg-app-background">
      <Stack.Screen
        options={{
          title: '',
          headerTransparent: true,
          headerShadowVisible: false,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.push('/profile')}
              accessibilityLabel="Open profile"
              className="ml-2 h-10 w-10 items-center justify-center rounded-full bg-app-surface shadow-xs">
              <Ionicons name="menu-outline" size={20} color="#0F172A" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View className="flex-row items-center gap-3 pr-3">
              <TouchableOpacity
                onPress={handleAddBill}
                accessibilityLabel="Add bill"
                className="h-10 w-10 items-center justify-center rounded-full bg-primary-100">
                <Ionicons name="add" size={20} color="#0284C7" />
              </TouchableOpacity>
              <HeaderProfileButton />
            </View>
          ),
        }}
      />

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        <View
          className="px-5"
          style={{ paddingTop: Math.max(insets.top + 8, 32), paddingBottom: insets.bottom + 96 }}>
          <View className="mb-6 rounded-3xl border border-app-border bg-app-surface px-6 py-7 shadow-md">
            <Text className="text-sm font-medium text-app-text-muted">Monthly bills overview</Text>
            <Text className="mt-1 text-3xl font-semibold text-app-text">
              {hasBills
                ? `${localBills.length} active bill${localBills.length === 1 ? '' : 's'}`
                : 'No bills yet'}
            </Text>
            <Text className="mt-2 text-sm text-app-text-muted">
              Track recurring expenses by due date and stay ahead of upcoming payments.
            </Text>
            <Button
              variant="secondary"
              size="sm"
              className="mt-6 w-full justify-center"
              onPress={handleAddBill}
              title="Add bill"
            />
          </View>

          {summaryLoading && !hasBills ? (
            <View className="space-y-4">
              <Skeleton className="h-32 rounded-3xl" />
              <Skeleton className="h-32 rounded-3xl" />
              <Skeleton className="h-32 rounded-3xl" />
            </View>
          ) : null}

          {!summaryLoading && !hasBills ? (
            <View className="items-center rounded-3xl border border-dashed border-app-border bg-app-surface px-6 py-10">
              <Text className="text-base font-semibold text-app-text">No recurring bills yet</Text>
              <Text className="mt-2 text-center text-sm text-app-text-muted">
                Create your first bill to keep tabs on rent, utilities, and subscriptions without
                hunting through statements.
              </Text>
              <TouchableOpacity
                className="mt-5 rounded-full bg-primary-500 px-6 py-3"
                onPress={handleAddBill}
                accessibilityLabel="Create bill">
                <Text className="text-sm font-semibold text-white">Add a monthly bill</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {hasBills ? (
            <View className="space-y-4">
              {localBills.map((bill: any) => (
                <BillCard
                  key={bill.id}
                  bill={bill}
                  category={categoryMap.get(bill.categoryId ?? 0) || null}
                  onPressPay={handleMarkPaid}
                  onPressEdit={handleEditBill}
                  isProcessing={payingBillId === bill.id}
                />
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
