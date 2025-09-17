import React from 'react';
import { View, Text } from 'react-native';
import { Card, CardContent } from './Card';
import { Progress } from './Progress';
import { Button } from './Button';
import { SavingsGoal } from '@/context/DataContext';
import { formatCurrency, formatDate } from '@/lib/utils';

interface SavingsGoalCardProps {
  goal: SavingsGoal;
  onPressFund?: (goal: SavingsGoal) => void;
  onPressEdit?: (goal: SavingsGoal) => void;
}

export const SavingsGoalCard: React.FC<SavingsGoalCardProps> = ({ goal, onPressFund, onPressEdit }) => {
  const target = parseFloat(goal.targetAmount || '0');
  const current = parseFloat(goal.currentAmount || '0');
  const monthlyContribution = parseFloat(goal.monthlyContribution || '0');
  const progress = target > 0 ? Math.min(Math.max((current / target) * 100, 0), 100) : 0;
  const remaining = Math.max(target - current, 0);

  return (
    <Card className="mb-4 bg-app-surface">
      <CardContent className="gap-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-lg font-semibold text-foreground-primary">{goal.name}</Text>
            <Text className="mt-1 text-sm text-foreground-muted">
              Target {formatCurrency(target)} · Saved {formatCurrency(current)}
            </Text>
          </View>
          {goal.autoDeduct && (
            <View className="rounded-full bg-success-100 px-3 py-1">
              <Text className="text-xs font-medium text-success-700">Auto-transfer</Text>
            </View>
          )}
        </View>

        <View>
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-medium text-foreground-secondary">
              {progress.toFixed(0)}%
            </Text>
            <Text className="text-sm text-foreground-muted">
              {remaining > 0 ? `${formatCurrency(remaining)} left` : 'Goal reached'}
            </Text>
          </View>
          <Progress
            value={progress}
            color="#0EA5E9"
            backgroundColor="#E0F2FE"
            height={10}
            animated
          />
        </View>

        <View className="flex-row items-center justify-between">
          <View className="gap-1">
            <Text className="text-xs uppercase tracking-wide text-foreground-muted">Monthly</Text>
            <Text className="text-sm font-semibold text-foreground-primary">
              {formatCurrency(Number.isFinite(monthlyContribution) ? monthlyContribution : 0)}
            </Text>
          </View>
          {goal.targetDate ? (
            <View className="items-end gap-1">
              <Text className="text-xs uppercase tracking-wide text-foreground-muted">Target date</Text>
              <Text className="text-sm font-semibold text-foreground-primary">
                {formatDate(goal.targetDate)}
              </Text>
            </View>
          ) : (
            <View className="items-end gap-1">
              <Text className="text-xs uppercase tracking-wide text-foreground-muted">Status</Text>
              <Text className="text-sm font-semibold text-foreground-primary">
                {remaining > 0 ? 'In progress' : 'Complete'}
              </Text>
            </View>
          )}
        </View>

        <View className="flex-row gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onPress={() => onPressFund?.(goal)}
            title="Fund"
          />
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onPress={() => onPressEdit?.(goal)}
            title="Edit"
          />
        </View>
      </CardContent>
    </Card>
  );
};

export default SavingsGoalCard;
