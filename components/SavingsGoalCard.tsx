import React from 'react';
import { View, Text } from 'react-native';
import { AppText } from '@/components/AppText';
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

export const SavingsGoalCard: React.FC<SavingsGoalCardProps> = ({
  goal,
  onPressFund,
  onPressEdit,
}) => {
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
            <AppText variant="section" className="text-app-text-strong">{goal.name}</AppText>
            <AppText variant="body" className="mt-1 text-app-text-faint">
              Target {formatCurrency(target)} · Saved {formatCurrency(current)}
            </AppText>
          </View>
          {goal.autoDeduct && (
            <View className="rounded-full bg-success-100 px-3 py-1">
              <AppText variant="caption" className="text-success-700">Auto-transfer</AppText>
            </View>
          )}
        </View>

        <View>
          <View className="flex-row items-center justify-between">
            <AppText variant="form-label" className="text-app-text-soft">
              {progress.toFixed(0)}%
            </AppText>
            <AppText variant="body" className="text-app-text-faint">
              {remaining > 0 ? `${formatCurrency(remaining)} left` : 'Goal reached'}
            </AppText>
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
            <AppText variant="label-sm" className="text-app-text-faint">Monthly</AppText>
            <AppText variant="metric" className="text-app-text-strong">
              {formatCurrency(Number.isFinite(monthlyContribution) ? monthlyContribution : 0)}
            </AppText>
          </View>
          {goal.targetDate ? (
            <View className="items-end gap-1">
              <AppText variant="label-sm" className="text-app-text-faint">Target date</AppText>
              <AppText variant="metric" className="text-app-text-strong">{formatDate(goal.targetDate)}</AppText>
            </View>
          ) : (
            <View className="items-end gap-1">
              <AppText variant="label-sm" className="text-app-text-faint">Status</AppText>
              <AppText variant="metric" className="text-app-text-strong">
                {remaining > 0 ? 'In progress' : 'Complete'}
              </AppText>
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
