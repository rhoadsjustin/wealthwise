import { View, Text } from 'react-native';
import { Card, CardContent } from '@/components/Card';
import { Transaction } from '@/lib/schema/schema';

interface MonthlySummaryCardProps {
  transactions: Transaction[] | null;
  totalExpenses: number;
  categoryBreakdown: { id: string; spent: number }[];
  plannedSavings?: number;
}

export function MonthlySummaryCard({
  transactions,
  totalExpenses,
  categoryBreakdown,
  plannedSavings = 0,
}: MonthlySummaryCardProps) {
  const expenseTransactions = transactions?.filter((t) => t.type === 'expense') || [];
  const totalTransactions = transactions?.length || 0;

  const averageTransaction =
    expenseTransactions.length > 0 ? totalExpenses / expenseTransactions.length : 0;

  const largestExpense =
    expenseTransactions.length > 0
      ? expenseTransactions.reduce((max, t) => Math.max(max, parseFloat(t.amount)), 0)
      : 0;

  return (
    <Card className="card-mobile border-secondary-200 bg-secondary-50">
      <CardContent className="p-4">
        <Text className="mb-4 text-lg font-semibold text-gray-900">Monthly Summary</Text>

        <View className="space-y-3">
          <View className="flex-row justify-between">
            <Text className="text-sm text-gray-600">Total Transactions</Text>
            <Text className="text-sm font-semibold text-gray-900">{totalTransactions}</Text>
          </View>

          <View className="flex-row justify-between">
            <Text className="text-sm text-gray-600">Average Transaction</Text>
            <Text className="text-sm font-semibold text-gray-900">
              ${averageTransaction.toFixed(2)}
            </Text>
          </View>

          <View className="flex-row justify-between">
            <Text className="text-sm text-gray-600">Largest Expense</Text>
            <Text className="text-sm font-semibold text-red-600">${largestExpense.toFixed(2)}</Text>
          </View>

          <View className="flex-row justify-between">
            <Text className="text-sm text-gray-600">Planned Savings</Text>
            <Text className="text-sm font-semibold text-sky-600">
              ${plannedSavings.toFixed(2)}
            </Text>
          </View>

          <View className="flex-row justify-between">
            <Text className="text-sm text-gray-600">Categories Used</Text>
            <Text className="text-sm font-semibold text-gray-900">
              {categoryBreakdown.filter((c) => c.spent > 0).length}
            </Text>
          </View>
        </View>
      </CardContent>
    </Card>
  );
}
