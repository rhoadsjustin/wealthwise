import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { CardContent } from '@/components/Card';
import SwipeableRow from '@/components/SwipeableRow';
import { AppText } from '@/components/AppText';
import type { ActivityRow } from '@/lib/activityDerived';

interface ActivityTransactionRowProps {
  row: ActivityRow;
  subtitle: string;
  highlighted?: boolean;
  onPress: () => void;
  onOpenCategory: () => void;
  onDelete: () => void;
  onEditAction: () => void;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export const ActivityTransactionRow = React.memo(function ActivityTransactionRow({
  row,
  subtitle,
  highlighted = false,
  onPress,
  onOpenCategory,
  onDelete,
  onEditAction,
}: ActivityTransactionRowProps) {
  const { transaction, category, amountValue, badge, needsCategory } = row;
  const icon = category?.icon ?? (transaction.type === 'expense' ? '🧾' : '💸');

  return (
    <SwipeableRow
      leftWidth={72}
      rightWidth={144}
      leftActions={({ close }) => (
        <View className="h-full flex-row items-stretch">
          <TouchableOpacity
            onPress={() => {
              onOpenCategory();
              close();
            }}
            activeOpacity={0.9}
            className="h-full w-[72px] items-center justify-center rounded-l-3xl border border-success-500/30 bg-success-500/15"
            accessibilityLabel="Categorize transaction">
            <Ionicons name="pricetags-outline" size={20} color="#22C55E" />
          </TouchableOpacity>
        </View>
      )}
      rightActions={({ close }) => (
        <View className="h-full flex-row items-stretch rounded-r-3xl">
          <TouchableOpacity
            onPress={() => {
              onEditAction();
              close();
            }}
            activeOpacity={0.9}
            className="h-full w-[72px] items-center justify-center border border-info-500/30 bg-info-500/15"
            accessibilityLabel="Edit transaction">
            <Ionicons name="create-outline" size={20} color="#38BDF8" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              onDelete();
              close();
            }}
            activeOpacity={0.9}
            className="h-full w-[72px] items-center justify-center rounded-r-3xl border border-error-500/30 bg-error-500/15"
            accessibilityLabel="Delete transaction">
            <Ionicons name="trash-outline" size={20} color="#F87171" />
          </TouchableOpacity>
        </View>
      )}>
      <View
        className={`rounded-3xl border bg-app-surface-1 ${
          highlighted ? 'border-primary-400/70 bg-app-surface-2' : 'border-app-border'
        }`}>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={onPress}
          accessibilityLabel={`Edit ${transaction.description}`}>
          <CardContent className="p-4">
            <View className="flex-row items-center justify-between gap-3">
              <View className="min-w-0 flex-1 flex-row items-center gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-app-canvas-elevated">
                  <Text className="text-xl">{icon}</Text>
                </View>
                <View className="min-w-0 flex-1">
                  <AppText
                    variant="title"
                    className="text-sm text-app-text-strong"
                    numberOfLines={1}>
                    {transaction.description}
                  </AppText>
                  <AppText variant="hint" className="mt-1 text-app-text-faint" numberOfLines={1}>
                    {subtitle}
                  </AppText>
                </View>
              </View>
              <View className="items-end">
                <AppText
                  variant="metric"
                  className={
                    transaction.type === 'income' ? 'text-accent-income' : 'text-accent-expense'
                  }>
                  {formatCurrency(amountValue)}
                </AppText>
                {badge ? (
                  <View className="mt-2 rounded-full bg-app-canvas-elevated px-2.5 py-1">
                    <AppText
                      variant="label-xs"
                      className={
                        needsCategory && badge !== 'Updating…'
                          ? 'text-warning-700'
                          : 'text-app-text-faint'
                      }>
                      {badge}
                    </AppText>
                  </View>
                ) : null}
              </View>
            </View>
          </CardContent>
        </TouchableOpacity>
      </View>
    </SwipeableRow>
  );
},
(prev, next) =>
  prev.subtitle === next.subtitle &&
  prev.highlighted === next.highlighted &&
  prev.row.transaction.id === next.row.transaction.id &&
  prev.row.transaction.description === next.row.transaction.description &&
  prev.row.transaction.amount === next.row.transaction.amount &&
  prev.row.transaction.type === next.row.transaction.type &&
  prev.row.transaction.date === next.row.transaction.date &&
  prev.row.categoryLabel === next.row.categoryLabel &&
  prev.row.badge === next.row.badge &&
  prev.row.needsCategory === next.row.needsCategory);
