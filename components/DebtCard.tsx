import React from 'react';
import { View, Text } from 'react-native';
import { Card, CardContent } from './Card';
import { Button } from './Button';
import { Progress } from './Progress';
import type { Debt, Category } from '@/context/DataContext';
import { formatCurrency } from '@/lib/utils';

interface DebtCardProps {
  debt: Debt;
  category?: Category | null;
  onPressPayment?: (debt: Debt) => void;
  onPressEdit?: (debt: Debt) => void;
  isProcessing?: boolean;
}

const toCurrency = (value: string | null | undefined) => {
  const numeric = parseFloat(value || '0');
  if (!Number.isFinite(numeric)) return '$0.00';
  return formatCurrency(numeric);
};

const getDueStatus = (debt: Debt) => {
  if (!debt.dueDay) {
    return { label: 'Flexible due date', tone: 'muted' as const };
  }
  const now = new Date();
  const due = new Date(now.getFullYear(), now.getMonth(), debt.dueDay);
  if (due < now) {
    const diff = Math.ceil((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    return { label: `${diff} days past due`, tone: 'error' as const };
  }
  const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return { label: 'Payment due today', tone: 'warning' as const };
  if (diff === 1) return { label: 'Due tomorrow', tone: 'warning' as const };
  return {
    label: `Due in ${diff} days`,
    tone: diff <= 5 ? ('warning' as const) : ('info' as const),
  };
};

const toneClasses: Record<string, string> = {
  error: 'bg-error-100 text-error-700',
  warning: 'bg-warning-100 text-warning-700',
  info: 'bg-info-100 text-info-700',
  muted: 'bg-secondary-100 text-foreground-secondary',
};

export function DebtCard({
  debt,
  category,
  onPressPayment,
  onPressEdit,
  isProcessing,
}: DebtCardProps) {
  const totalAmount = parseFloat(debt.totalAmount || '0');
  const balance = parseFloat(debt.currentBalance || '0');
  const minimum = parseFloat(debt.minimumPayment || '0');
  const progress =
    totalAmount > 0 ? Math.min(Math.max(((totalAmount - balance) / totalAmount) * 100, 0), 100) : 0;
  const paidDown = Math.max(totalAmount - balance, 0);
  const dueStatus = getDueStatus(debt);
  const interestRateValue = parseFloat(debt.interestRate || '');
  const interestRateLabel = Number.isFinite(interestRateValue)
    ? `${interestRateValue.toFixed(2)}%`
    : null;

  return (
    <Card className="bg-app-surface">
      <CardContent className="gap-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-lg font-semibold text-foreground-primary">{debt.name}</Text>
            <Text className="mt-1 text-sm text-foreground-muted">
              {toCurrency(debt.currentBalance)} outstanding of {toCurrency(debt.totalAmount)}
            </Text>
          </View>
          {interestRateLabel ? (
            <View className="rounded-full bg-info-100 px-3 py-1">
              <Text className="text-xs font-medium text-info-700">APR {interestRateLabel}</Text>
            </View>
          ) : null}
        </View>

        {category ? (
          <View className="flex-row items-center gap-2">
            <Text className="text-lg" accessibilityLabel={`${category.name} icon`}>
              {category.icon}
            </Text>
            <Text className="text-sm font-medium text-foreground-secondary">{category.name}</Text>
          </View>
        ) : null}

        <View>
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-sm font-medium text-foreground-secondary">
              {progress.toFixed(0)}% paid
            </Text>
            <Text className="text-sm text-foreground-muted">
              {toCurrency(paidDown.toString())} paid off
            </Text>
          </View>
          <Progress value={progress} color="#0EA5E9" backgroundColor="#E0F2FE" height={10} />
        </View>

        <View className="flex-row flex-wrap items-center gap-3">
          <View className={`rounded-full px-3 py-1 ${toneClasses[dueStatus.tone]}`}>
            <Text className="text-xs font-semibold uppercase tracking-wide">{dueStatus.label}</Text>
          </View>
          {minimum > 0 ? (
            <View className="rounded-full bg-secondary-100 px-3 py-1">
              <Text className="text-xs font-medium text-foreground-secondary">
                Min payment {toCurrency(debt.minimumPayment)}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="flex-row gap-2">
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            onPress={() => onPressPayment?.(debt)}
            disabled={isProcessing}
            title={isProcessing ? 'Saving…' : 'Record payment'}
          />
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onPress={() => onPressEdit?.(debt)}
            title="Edit"
          />
        </View>
      </CardContent>
    </Card>
  );
}

export default DebtCard;
