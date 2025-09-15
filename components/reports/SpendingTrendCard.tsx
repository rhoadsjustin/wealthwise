import { View, Text } from 'react-native';
import { Card, CardContent } from '@/components/Card';
import { Ionicons } from '@expo/vector-icons';

interface MonthlyData {
  month: string;
  amount: number;
}

interface SpendingTrendCardProps {
  monthlyData: MonthlyData[];
}

export function SpendingTrendCard({ monthlyData }: SpendingTrendCardProps) {
  const maxAmount = Math.max(...monthlyData.map((d) => d.amount));

  return (
    <Card className="card-mobile mb-6 bg-info-50 border-info-100">
      <CardContent className="p-4">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-gray-900">Spending Trend</Text>
          <Ionicons name="calendar-outline" size={20} color="#6B7280" />
        </View>

        <View className="space-y-3">
          {monthlyData.map((data, index) => {
            const percentage = maxAmount > 0 ? (data.amount / maxAmount) * 100 : 0;

            return (
              <View key={data.month} className="flex-row items-center justify-between">
                <Text className="w-16 text-sm font-medium text-gray-700">{data.month}</Text>
                <View className="mx-3 flex-1">
                  <View className="h-3 rounded-full bg-gray-200">
                    <View
                      className="bg-budget-primary h-3 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </View>
                </View>
                <Text className="w-20 text-right text-sm font-semibold text-gray-900">
                  ${data.amount.toFixed(0)}
                </Text>
              </View>
            );
          })}
        </View>
      </CardContent>
    </Card>
  );
}
