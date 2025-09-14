import React from 'react';
import { View, Text } from 'react-native';
import { Card, CardContent } from './Card';
import { Progress } from './Progress';
import { Category } from '../context/DataContext';

interface CategoryStatsProps {
  category: Category;
  spent: number;
  className?: string;
}

interface CategoryStatsCardProps {
  categories: Category[];
  transactions: {
    id: number;
    amount: string;
    type: 'income' | 'expense';
    categoryId: number | null;
  }[];
  className?: string;
}

function CategoryStats({ category, spent, className }: CategoryStatsProps) {
  const budget = parseFloat(category.budget);
  const spentAmount = spent;
  const percentage = budget > 0 ? (spentAmount / budget) * 100 : 0;
  const remaining = Math.max(0, budget - spentAmount);
  const isOverBudget = spentAmount > budget;

  const getProgressColor = () => {
    if (percentage <= 50) return '#22C55E'; // Green
    if (percentage <= 80) return '#F59E0B'; // Yellow
    return '#EF4444'; // Red
  };

  return (
    <Card variant="default" padding="md" className={`bg-secondary-50 ${className}`}>
      <CardContent className="p-4">
        <View className="mb-3 flex-row items-center">
          <View
            className="mr-3 h-10 w-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: category.color + '20' }}>
            <Text className="text-base">{category.icon}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-app-text text-base font-semibold">{category.name}</Text>
            <Text className="text-app-text-secondary text-xs">
              ${spentAmount.toFixed(2)} of ${budget.toFixed(2)}
            </Text>
          </View>
          <View className="items-end">
            <Text
              className={`text-sm font-semibold ${isOverBudget ? 'text-financial-negative' : 'text-financial-positive'}`}>
              {isOverBudget ? '+' : ''}${Math.abs(spentAmount - budget).toFixed(2)}
            </Text>
            <Text className="text-app-text-muted text-xs">
              {isOverBudget ? 'over' : 'remaining'}
            </Text>
          </View>
        </View>

        <View className="mb-2">
          <Progress
            value={Math.min(percentage, 100)}
            height={6}
            color={getProgressColor()}
            backgroundColor="#E5E7EB"
          />
        </View>

        <View className="flex-row items-center justify-between">
          <Text className="text-app-text-secondary text-xs">{percentage.toFixed(1)}% used</Text>
          <Text
            className={`text-xs font-medium ${isOverBudget ? 'text-financial-negative' : 'text-app-text-secondary'}`}>
            {isOverBudget ? 'Over budget' : `$${remaining.toFixed(2)} left`}
          </Text>
        </View>
      </CardContent>
    </Card>
  );
}

export default function CategoryStatsCard({
  categories,
  transactions,
  className,
}: CategoryStatsCardProps) {
  // Calculate spending per category
  const categorySpending = React.useMemo(() => {
    const spending: Record<number, number> = {};

    transactions
      .filter((t) => t.type === 'expense' && t.categoryId)
      .forEach((transaction) => {
        const categoryId = transaction.categoryId!;
        const amount = parseFloat(transaction.amount);
        spending[categoryId] = (spending[categoryId] || 0) + amount;
      });

    return spending;
  }, [transactions]);

  // Filter categories that have either spending or budget
  const relevantCategories = categories.filter((category) => {
    const spent = categorySpending[category.id] || 0;
    const budget = parseFloat(category.budget);
    return spent > 0 || budget > 0;
  });

  // Sort by percentage used (highest first) or by spending if no budget
  const sortedCategories = relevantCategories.sort((a, b) => {
    const spentA = categorySpending[a.id] || 0;
    const spentB = categorySpending[b.id] || 0;
    const budgetA = parseFloat(a.budget);
    const budgetB = parseFloat(b.budget);

    const percentageA = budgetA > 0 ? (spentA / budgetA) * 100 : spentA;
    const percentageB = budgetB > 0 ? (spentB / budgetB) * 100 : spentB;

    return percentageB - percentageA;
  });

  if (sortedCategories.length === 0) {
    return (
      <Card variant="elevated" className={`card-mobile bg-secondary-50 ${className}`}>
        <CardContent className="p-6">
          <Text className="text-app-text mb-2 text-lg font-semibold">Category Overview</Text>
          <View className="items-center py-8">
            <Text className="text-app-text-secondary text-center">
              No spending data available for categories
            </Text>
            <Text className="text-app-text-muted mt-1 text-center text-sm">
              Start adding transactions to see your category breakdown
            </Text>
          </View>
        </CardContent>
      </Card>
    );
  }

  const totalBudget = categories.reduce((sum, cat) => sum + parseFloat(cat.budget), 0);
  const totalSpent = Object.values(categorySpending).reduce((sum, amount) => sum + amount, 0);

  return (
    <Card variant="elevated" className={`card-mobile bg-secondary-50 ${className}`}>
      <CardContent className="p-6">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-app-text text-lg font-semibold">Category Overview</Text>
          <View className="items-end">
            <Text className="text-app-text text-sm font-semibold">
              ${totalSpent.toFixed(2)} / ${totalBudget.toFixed(2)}
            </Text>
            <Text className="text-app-text-secondary text-xs">Total spent</Text>
          </View>
        </View>

        <View className="gap-3">
          {sortedCategories.slice(0, 6).map((category) => (
            <CategoryStats
              key={category.id}
              category={category}
              spent={categorySpending[category.id] || 0}
            />
          ))}
        </View>

        {sortedCategories.length > 6 && (
          <View className="mt-4 items-center">
            <Text className="text-app-text-muted text-sm">
              +{sortedCategories.length - 6} more categories
            </Text>
          </View>
        )}
      </CardContent>
    </Card>
  );
}

export { CategoryStats };
