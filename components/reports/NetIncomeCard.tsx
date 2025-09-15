import { View, Text } from 'react-native';
import { Card, CardContent } from '@/components/Card';
import { MaterialIcons } from '@expo/vector-icons';

interface NetIncomeCardProps {
  netIncome: number;
  currentMonth: string;
}

export function NetIncomeCard({ netIncome, currentMonth }: NetIncomeCardProps) {
  return (
    <Card className="card-mobile">
      <CardContent className="p-4">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-sm font-medium text-gray-800">Net Income</Text>
          <MaterialIcons name="bar-chart" size={16} color="#3B82F6" />
        </View>
        <Text
          className={`text-2xl font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          ${netIncome.toFixed(2)}
        </Text>
        <Text className="mt-1 text-xs text-gray-600">
          {netIncome >= 0 ? '↗ Positive' : '↘ Negative'}
        </Text>
      </CardContent>
    </Card>
  );
}
