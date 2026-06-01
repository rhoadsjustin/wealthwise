import React from 'react';
import { View, Text } from 'react-native';
import { Card, CardContent } from './Card';
import { formatCurrency } from '@/lib/utils';
import { DashboardSummary } from '@/context/DataContext';

interface SavingsSummaryCardProps {
  summary: DashboardSummary | null;
}

export function SavingsSummaryCard({ summary }: SavingsSummaryCardProps) {
  if (!summary) return null;

  return (
    <Card
      className="mb-4 border border-app-border-strong bg-app-surface-1"
      variant="filled"
      padding="md">
      <CardContent className="gap-4">
        <View>
          <Text className="text-base font-semibold text-app-text-strong">Savings Overview</Text>
          <Text className="mt-1 text-sm text-app-text-faint">
            Track how much you plan to save each month and how close you are to your goals.
          </Text>
        </View>
        <View className="flex-row gap-4">
          <View className="flex-1 rounded-xl bg-app-surface-2 p-4">
            <Text className="text-xs uppercase tracking-wide text-app-text-faint">
              Account Total
            </Text>
            <Text className="mt-1 text-xl font-semibold text-accent-savings">
              {formatCurrency(summary.totalSavingsBalance || 0)}
            </Text>
            <Text className="mt-1 text-xs text-app-text-faint">Manual savings balances</Text>
          </View>
          <View className="flex-1 rounded-xl bg-app-surface-2 p-4">
            <Text className="text-xs uppercase tracking-wide text-app-text-faint">
              Monthly Plan
            </Text>
            <Text className="mt-1 text-xl font-semibold text-app-text-strong">
              {formatCurrency(summary.totalSavingsPlanned || 0)}
            </Text>
            <Text className="mt-1 text-xs text-app-text-faint">Across all active goals</Text>
          </View>
        </View>
        <View className="rounded-xl bg-app-surface-2 p-4">
          <Text className="text-xs uppercase tracking-wide text-app-text-faint">
            Net Income After Savings
          </Text>
          <Text className="mt-1 text-2xl font-semibold text-app-text-strong">
            {formatCurrency(summary.netIncomeAfterSavings || 0)}
          </Text>
          <Text className="mt-1 text-xs leading-tight text-app-text-faint">
            Baseline {formatCurrency(summary.incomeBaseline || summary.totalIncome || 0)} minus
            monthly savings
          </Text>
        </View>
      </CardContent>
    </Card>
  );
}

export default SavingsSummaryCard;
