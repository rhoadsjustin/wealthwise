import { View, Text } from 'react-native';
import { Card, CardContent } from '@/components/Card';
import { MaterialIcons } from '@expo/vector-icons';

interface NetIncomeCardProps {
  netIncome: number;
  netIncomeAfterSavings: number;
  plannedSavings: number;
  currentMonth: string;
}

export function NetIncomeCard({
  netIncome,
  netIncomeAfterSavings,
  plannedSavings,
  currentMonth,
}: NetIncomeCardProps) {
  return (
    <Card className="card-mobile">
      <CardContent className="p-4">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-sm font-medium text-gray-800">Net Income Overview</Text>
          <MaterialIcons name="bar-chart" size={16} color="#3B82F6" />
        </View>
        <View className="space-y-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs uppercase tracking-wide text-gray-600">Before savings</Text>
            <Text
              className={`text-base font-semibold ${
                netIncome >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
              ${netIncome.toFixed(2)}
            </Text>
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-xs uppercase tracking-wide text-gray-600">Monthly savings</Text>
            <Text className="text-base font-semibold text-sky-600">
              -${plannedSavings.toFixed(2)}
            </Text>
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-xs uppercase tracking-wide text-gray-600">After savings</Text>
            <Text
              className={`text-lg font-bold ${
                netIncomeAfterSavings >= 0 ? 'text-green-700' : 'text-red-600'
              }`}>
              ${netIncomeAfterSavings.toFixed(2)}
            </Text>
          </View>
        </View>
        <Text className="mt-3 text-xs text-gray-500">Based on activity in {currentMonth}</Text>
      </CardContent>
    </Card>
  );
}
