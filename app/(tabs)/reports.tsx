import { View, Text, ScrollView } from 'react-native';
import FAB from '@/components/FAB';
import { useRouter } from 'expo-router';
import { useAppData } from '../_layout';
import { Card, CardContent } from '../../components/Card';
import { Skeleton } from '../../components/Skeleton';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

export default function ReportsTab() {
  const router = useRouter();
  const { summary, transactions, summaryLoading, user } = useAppData();

  if (summaryLoading || !summary) {
    return (
      <ScrollView className="content-padding">
        <View className="space-y-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </View>
      </ScrollView>
    );
  }

  const currentMonth = new Date().toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const totalIncome =
    transactions
      ?.filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

  const totalExpenses = summary.totalExpenses || 0;
  const netIncome = totalIncome - totalExpenses;

  const expensesByMonth =
    transactions
      ?.filter((t) => t.type === 'expense')
      .reduce((acc: any, transaction) => {
        const month = new Date(transaction.date).toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        });
        acc[month] = (acc[month] || 0) + parseFloat(transaction.amount);
        return acc;
      }, {}) || {};

  const monthlyData = Object.entries(expensesByMonth)
    .slice(-6)
    .map(([month, amount]) => ({ month, amount: amount as number }));

  return (
    <View className="flex-1">
    <ScrollView className="content-padding">
      {/* Summary Cards */}
      <View className="overview-grid mb-6">
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
      </View>

      {/* Monthly Spending Trend */}
      <Card className="card-mobile mb-6">
        <CardContent className="p-4">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-gray-900">Spending Trend</Text>
            <Ionicons name="calendar-outline" size={20} color="#6B7280" />
          </View>

          <View className="space-y-3">
            {monthlyData.map((data, index) => {
              const maxAmount = Math.max(...monthlyData.map((d) => d.amount));
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

      {/* Category Breakdown */}
      <Card className="card-mobile mb-6">
        <CardContent className="p-4">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-gray-900">Category Breakdown</Text>
            <MaterialIcons name="pie-chart" size={20} color="#6B7280" />
          </View>

          <View className="space-y-4">
            {summary.categoryBreakdown
              .sort((a, b) => b.spent - a.spent)
              .slice(0, 5)
              .map((category) => {
                const percentage =
                  summary.totalExpenses > 0 ? (category.spent / summary.totalExpenses) * 100 : 0;

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
                          {percentage.toFixed(1)}% of total
                        </Text>
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

      {/* Budget Performance */}
      <Card className="card-mobile mb-6">
        <CardContent className="p-4">
          <Text className="mb-4 text-lg font-semibold text-gray-900">Budget Performance</Text>

          <View className="space-y-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-medium text-gray-700">Budget Used</Text>
              <Text className="text-sm font-semibold text-gray-900">
                {summary.totalBudget > 0
                  ? (
                      ((summary.totalBudget - summary.remainingBudget) / summary.totalBudget) *
                      100
                    ).toFixed(1)
                  : '0'}
                %
              </Text>
            </View>

            <View className="h-3 rounded-full bg-gray-200">
              <View
                className="h-3 rounded-full"
                style={{
                  width: `${Math.min(
                    summary.totalBudget > 0
                      ? ((summary.totalBudget - summary.remainingBudget) / summary.totalBudget) *
                          100
                      : 0,
                    100
                  )}%`,
                  backgroundColor: summary.remainingBudget < 0 ? '#EF4444' : '#10B981',
                }}
              />
            </View>

            <View className="flex-row justify-between">
              <View>
                <Text className="text-xs text-gray-600">Spent</Text>
                <Text className="text-sm font-semibold text-gray-900">
                  ${(summary.totalBudget - summary.remainingBudget).toFixed(0)}
                </Text>
              </View>
              <View>
                <Text className="text-xs text-gray-600">Remaining</Text>
                <Text
                  className={`text-sm font-semibold ${
                    summary.remainingBudget >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                  ${summary.remainingBudget.toFixed(0)}
                </Text>
              </View>
              <View>
                <Text className="text-xs text-gray-600">Total Budget</Text>
                <Text className="text-sm font-semibold text-gray-900">
                  ${summary.totalBudget.toFixed(0)}
                </Text>
              </View>
            </View>
          </View>
        </CardContent>
      </Card>

      {/* Report Summary */}
      <Card className="card-mobile">
        <CardContent className="p-4">
          <Text className="mb-4 text-lg font-semibold text-gray-900">Monthly Summary</Text>

          <View className="space-y-3">
            <View className="flex-row justify-between">
              <Text className="text-sm text-gray-600">Total Transactions</Text>
              <Text className="text-sm font-semibold text-gray-900">
                {transactions?.length || 0}
              </Text>
            </View>

            <View className="flex-row justify-between">
              <Text className="text-sm text-gray-600">Average Transaction</Text>
              <Text className="text-sm font-semibold text-gray-900">
                $
                {transactions?.length > 0
                  ? (
                      totalExpenses / transactions.filter((t) => t.type === 'expense').length
                    ).toFixed(2)
                  : '0.00'}
              </Text>
            </View>

            <View className="flex-row justify-between">
              <Text className="text-sm text-gray-600">Largest Expense</Text>
              <Text className="text-sm font-semibold text-red-600">
                $
                {transactions
                  ?.filter((t) => t.type === 'expense')
                  .reduce((max, t) => Math.max(max, parseFloat(t.amount)), 0)
                  .toFixed(2) || '0.00'}
              </Text>
            </View>

            <View className="flex-row justify-between">
              <Text className="text-sm text-gray-600">Categories Used</Text>
              <Text className="text-sm font-semibold text-gray-900">
                {summary.categoryBreakdown.filter((c) => c.spent > 0).length}
              </Text>
            </View>
          </View>
        </CardContent>
      </Card>
    </ScrollView>
    <FAB onPress={() => router.push('/add-transaction')} />
    </View>
  );
}
