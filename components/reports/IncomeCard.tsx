import { View, Text } from 'react-native';
import { Card, CardContent } from '@/components/Card';
import { Ionicons } from '@expo/vector-icons';

interface IncomeCardProps {
  totalIncome: number;
  currentMonth: string;
}

export function IncomeCard({ totalIncome, currentMonth }: IncomeCardProps) {
  return (
    <Card className="card-mobile">
      <CardContent className="p-4">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-sm font-medium text-gray-800">Total Income</Text>
          <Ionicons name="trending-up-outline" size={16} color="#10B981" />
        </View>
        <Text className="text-2xl font-bold text-green-600">${totalIncome.toFixed(2)}</Text>
        <Text className="mt-1 text-xs text-gray-600">{currentMonth}</Text>
      </CardContent>
    </Card>
  );
}
