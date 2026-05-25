import React from 'react';
import { View, Text } from 'react-native';
import { AppText } from '@/components/AppText';
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

const toneBg: Record<string, string> = {
  error: 'bg-error-100',
  warning: 'bg-warning-100',
  info: 'bg-info-100',
  muted: 'bg-secondary-100',
};

const toneText: Record<string, string> = {
  error: 'text-error-700',
  warning: 'text-warning-700',
  info: 'text-info-700',
  muted: 'text-app-text-soft',
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
            <AppText variant="section" className="text-app-text-strong">{debt.name}</AppText>
            <AppText variant="body" className="mt-1 text-app-text-faint">
              {toCurrency(debt.currentBalance)} outstanding of {toCurrency(debt.totalAmount)}
            </AppText>
          </View>
          {interestRateLabel ? (
            <View className="rounded-full bg-info-100 px-3 py-1">
              <AppText variant="caption" className="text-info-700">APR {interestRateLabel}</AppText>
            </View>
          ) : null}
        </View>

        {category ? (
          <View className="flex-row items-center gap-2">
            <Text className="text-lg" accessibilityLabel={`${category.name} icon`}>
              {category.icon}
            </Text>
            <AppText variant="body" className="text-app-text-soft">{category.name}</AppText>
          </View>
        ) : null}

        <View>
          <View className="mb-2 flex-row items-center justify-between">
            <AppText variant="form-label" className="text-app-text-soft">
              {progress.toFixed(0)}% paid
            </AppText>
            <AppText variant="body" className="text-app-text-faint">
              {toCurrency(paidDown.toString())} paid off
            </AppText>
          </View>
          <Progress value={progress} color="#0EA5E9" backgroundColor="#E0F2FE" height={10} />
        </View>

        <View className="flex-row flex-wrap items-center gap-3">
          <View className={`rounded-full px-3 py-1 ${toneBg[dueStatus.tone]}`}>
            <AppText variant="label-sm" className={toneText[dueStatus.tone]}>{dueStatus.label}</AppText>
          </View>
          {minimum > 0 ? (
            <View className="rounded-full bg-secondary-100 px-3 py-1">
              <AppText variant="caption" className="text-app-text-soft">
                Min payment {toCurrency(debt.minimumPayment)}
              </AppText>
            </View>
          ) : null}
        </View>

        <View className="flex-row gap-2">
          <Button
            variant="success"
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
