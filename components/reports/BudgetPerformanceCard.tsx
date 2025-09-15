import { View, Text } from 'react-native';
import { Card, CardContent } from '@/components/Card';

interface BudgetPerformanceCardProps {
  totalBudget: number;
  remainingBudget: number;
}

export function BudgetPerformanceCard({ totalBudget, remainingBudget }: BudgetPerformanceCardProps) {
  const budgetUsedPercentage = totalBudget > 0
    ? ((totalBudget - remainingBudget) / totalBudget) * 100
    : 0;

  const spent = totalBudget - remainingBudget;

  return (
    <Card className="card-mobile mb-6">
      <CardContent className="p-4">
        <Text className="mb-4 text-lg font-semibold text-gray-900">Budget Performance</Text>

        <View className="space-y-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-medium text-gray-700">Budget Used</Text>
            <Text className="text-sm font-semibold text-gray-900">
              {budgetUsedPercentage.toFixed(1)}%
            </Text>
          </View>

          <View className="h-3 rounded-full bg-gray-200">
            <View
              className="h-3 rounded-full"
              style={{
                width: `${Math.min(budgetUsedPercentage, 100)}%`,
                backgroundColor: remainingBudget < 0 ? '#EF4444' : '#10B981',
              }}
            />
          </View>

          <View className="flex-row justify-between">
            <View>
              <Text className="text-xs text-gray-600">Spent</Text>
              <Text className="text-sm font-semibold text-gray-900">
                ${spent.toFixed(0)}
              </Text>
            </View>
            <View>
              <Text className="text-xs text-gray-600">Remaining</Text>
              <Text
                className={`text-sm font-semibold ${
                  remainingBudget >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                ${remainingBudget.toFixed(0)}
              </Text>
            </View>
            <View>
              <Text className="text-xs text-gray-600">Total Budget</Text>
              <Text className="text-sm font-semibold text-gray-900">
                ${totalBudget.toFixed(0)}
              </Text>
            </View>
          </View>
        </View>
      </CardContent>
    </Card>
  );
}
