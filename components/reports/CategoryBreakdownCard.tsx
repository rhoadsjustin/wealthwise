import { View, Text } from 'react-native';
import { Card, CardContent } from '@/components/Card';
import { MaterialIcons } from '@expo/vector-icons';

interface CategoryBreakdownItem {
  id: string;
  name: string;
  spent: number;
  color: string;
  incomeShare?: number;
  incomeWarning?: boolean;
}

interface CategoryBreakdownCardProps {
  categoryBreakdown: CategoryBreakdownItem[];
  totalExpenses: number;
  incomeBaseline?: number;
}

export function CategoryBreakdownCard({
  categoryBreakdown,
  totalExpenses,
  incomeBaseline,
}: CategoryBreakdownCardProps) {
  return (
    <Card className="card-mobile mb-6 border-success-100 bg-success-50">
      <CardContent className="p-4">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-gray-900">Category Breakdown</Text>
          <MaterialIcons name="pie-chart" size={20} color="#6B7280" />
        </View>

        <View className="space-y-4">
          {categoryBreakdown
            .sort((a, b) => b.spent - a.spent)
            .slice(0, 5)
            .map((category) => {
              const percentage = totalExpenses > 0 ? (category.spent / totalExpenses) * 100 : 0;
              const incomeShare =
                category.incomeShare ??
                (incomeBaseline && incomeBaseline > 0 ? category.spent / incomeBaseline : 0);
              const incomeWarning = Boolean(category.incomeWarning) || incomeShare >= 0.3;

              return (
                <View key={category.id} className="flex-row items-center justify-between">
                  <View className="flex-1 flex-row items-center">
                    <View
                      className="mr-3 h-4 w-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
                        {category.name}
                      </Text>
                      <Text className="text-xs text-gray-600">
                        {percentage.toFixed(1)}% of spending · {(incomeShare * 100).toFixed(1)}% of
                        income
                      </Text>
                      {incomeWarning && (
                        <Text className="mt-1 text-xs font-semibold text-red-600">
                          High income usage
                        </Text>
                      )}
                    </View>
                  </View>
                  <Text className="ml-3 text-sm font-semibold text-gray-900">
                    ${category.spent.toFixed(0)}
                  </Text>
                </View>
              );
            })}
        </View>
      </CardContent>
    </Card>
  );
}
