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
    <Card className="mb-4 bg-app-surface" variant="filled" padding="md">
      <CardContent className="gap-4">
        <View>
          <Text className="text-base font-semibold text-foreground-primary">Savings Overview</Text>
          <Text className="mt-1 text-sm text-foreground-muted">
            Track how much you plan to save each month and how close you are to your goals.
          </Text>
        </View>
        <View className="flex-row gap-4">
          <View className="flex-1 rounded-xl bg-background-primary p-4">
            <Text className="text-xs uppercase tracking-wide text-foreground-muted">
              Monthly Allocation
            </Text>
            <Text className="mt-1 text-xl font-semibold text-foreground-primary">
              {formatCurrency(summary.totalSavingsPlanned || 0)}
            </Text>
            <Text className="mt-1 text-xs text-foreground-muted">
              Subtracted from income before calculating net
            </Text>
          </View>
          <View className="flex-1 rounded-xl bg-background-primary p-4">
            <Text className="text-xs uppercase tracking-wide text-foreground-muted">
              Saved So Far
            </Text>
            <Text className="mt-1 text-xl font-semibold text-foreground-primary">
              {formatCurrency(summary.totalSavingsProgress || 0)}
            </Text>
            <Text className="mt-1 text-xs text-foreground-muted">Across all active goals</Text>
          </View>
        </View>
        <View className="rounded-xl bg-background-primary p-4">
          <Text className="text-xs uppercase tracking-wide text-foreground-muted">
            Net Income After Savings
          </Text>
          <Text className="mt-1 text-2xl font-semibold text-foreground-primary">
            {formatCurrency(summary.netIncomeAfterSavings || 0)}
          </Text>
          <Text className="mt-1 text-xs leading-tight text-foreground-muted">
            Baseline {formatCurrency(summary.incomeBaseline || summary.totalIncome || 0)} minus
            monthly savings
          </Text>
        </View>
      </CardContent>
    </Card>
  );
}

export default SavingsSummaryCard;
