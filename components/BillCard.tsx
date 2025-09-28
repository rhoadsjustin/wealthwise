import React from 'react';
import { View, Text } from 'react-native';
import { Card, CardContent } from './Card';
import { Button } from './Button';
import type { Bill, Category } from '@/context/DataContext';
import { formatCurrency } from '@/lib/utils';

interface BillCardProps {
  bill: Bill;
  category?: Category | null;
  onPressPay?: (bill: Bill) => void;
  onPressEdit?: (bill: Bill) => void;
  isProcessing?: boolean;
}

const formatAmount = (amount: string) => {
  const value = parseFloat(amount || '0');
  if (!Number.isFinite(value)) return '$0.00';
  return formatCurrency(value);
};

const getNextDueDate = (bill: Bill) => {
  if (!bill.dueDay) return null;
  const today = new Date();
  const currentMonthDue = new Date(today.getFullYear(), today.getMonth(), bill.dueDay);
  if (currentMonthDue >= today) return currentMonthDue;
  return new Date(today.getFullYear(), today.getMonth() + 1, bill.dueDay);
};

const getDueStatus = (bill: Bill) => {
  const nextDueDate = getNextDueDate(bill);
  if (!nextDueDate) {
    return { label: 'Flexible due date', tone: 'muted' as const };
  }

  const now = new Date();
  const diffDays = Math.ceil((nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: 'Past due', tone: 'error' as const };
  }
  if (diffDays === 0) {
    return { label: 'Due today', tone: 'warning' as const };
  }
  if (diffDays === 1) {
    return { label: 'Due tomorrow', tone: 'warning' as const };
  }
  return {
    label: `Due in ${diffDays} days`,
    tone: diffDays <= 5 ? ('warning' as const) : ('info' as const),
  };
};

const getPaidStatus = (bill: Bill) => {
  if (!bill.lastPaidOn) return null;
  const paidDate = new Date(bill.lastPaidOn);
  const now = new Date();
  if (paidDate.getFullYear() === now.getFullYear() && paidDate.getMonth() === now.getMonth()) {
    return `Paid ${paidDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }
  return `Last paid ${paidDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
};

const toneClasses: Record<string, string> = {
  error: 'bg-error-100 text-error-700',
  warning: 'bg-warning-100 text-warning-700',
  info: 'bg-info-100 text-info-700',
  muted: 'bg-secondary-100 text-foreground-secondary',
};

export function BillCard({ bill, category, onPressPay, onPressEdit, isProcessing }: BillCardProps) {
  const amountLabel = formatAmount(bill.amount);
  const dueStatus = getDueStatus(bill);
  const paidStatus = getPaidStatus(bill);

  return (
    <Card className="bg-app-surface">
      <CardContent className="gap-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-lg font-semibold text-foreground-primary">{bill.name}</Text>
            <Text className="mt-1 text-sm text-foreground-muted">{amountLabel}</Text>
          </View>
          {bill.autoPay ? (
            <View className="rounded-full bg-success-100 px-3 py-1">
              <Text className="text-xs font-medium text-success-700">Auto-pay</Text>
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

        <View className="flex-row flex-wrap items-center gap-3">
          <View className={`rounded-full px-3 py-1 ${toneClasses[dueStatus.tone]}`}>
            <Text className="text-xs font-semibold uppercase tracking-wide">{dueStatus.label}</Text>
          </View>
          {paidStatus ? (
            <View className="rounded-full bg-success-50 px-3 py-1">
              <Text className="text-xs font-medium text-success-700">{paidStatus}</Text>
            </View>
          ) : null}
        </View>

        <View className="flex-row gap-2">
          <Button
            variant="success"
            size="sm"
            className="flex-1"
            onPress={() => onPressPay?.(bill)}
            disabled={isProcessing}
            title={isProcessing ? 'Recording…' : 'Mark paid'}
          />
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onPress={() => onPressEdit?.(bill)}
            title="Edit"
          />
        </View>
      </CardContent>
    </Card>
  );
}

export default BillCard;
