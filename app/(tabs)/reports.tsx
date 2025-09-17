import { View, ScrollView } from 'react-native';
import FAB from '@/components/FAB';
import { useRouter } from 'expo-router';
import { useAppData } from '../_layout';
import { Skeleton } from '../../components/Skeleton';
import { Transaction } from '../../lib/schema/schema';
import {
  IncomeCard,
  NetIncomeCard,
  SpendingTrendCard,
  CategoryBreakdownCard,
  BudgetPerformanceCard,
  MonthlySummaryCard,
} from '../../components/reports';

export default function ReportsTab() {
  const router = useRouter();
  const { summary, transactions, summaryLoading } = useAppData();

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

  const totalIncome = summary.incomeBaseline || summary.totalIncome || 0;
  const totalExpenses = summary.totalExpenses || 0;
  const plannedSavings = summary.totalSavingsPlanned || 0;
  const actualIncome = summary.actualIncome || totalIncome;
  const netIncome = actualIncome - totalExpenses;
  const netIncomeAfterSavings = summary.netIncomeAfterSavings ?? netIncome - plannedSavings;

  const expensesByMonth =
    transactions
      ?.filter((t: Transaction) => t.type === 'expense')
      .reduce((acc: Record<string, number>, transaction: Transaction) => {
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
          <IncomeCard totalIncome={totalIncome} currentMonth={currentMonth} />
          <NetIncomeCard
            netIncome={netIncome}
            netIncomeAfterSavings={netIncomeAfterSavings}
            plannedSavings={plannedSavings}
            currentMonth={currentMonth}
          />
        </View>

        {/* Monthly Spending Trend */}
        <SpendingTrendCard monthlyData={monthlyData} />

        {/* Category Breakdown */}
        <CategoryBreakdownCard
          categoryBreakdown={summary.categoryBreakdown}
          totalExpenses={summary.totalExpenses}
          incomeBaseline={summary.incomeBaseline}
        />

        {/* Budget Performance */}
        <BudgetPerformanceCard
          totalBudget={summary.totalBudget}
          remainingBudget={summary.remainingBudget}
        />

        {/* Report Summary */}
        <MonthlySummaryCard
          transactions={transactions}
          totalExpenses={totalExpenses}
          categoryBreakdown={summary.categoryBreakdown}
          plannedSavings={plannedSavings}
        />
      </ScrollView>
      <FAB onPress={() => router.push('/add-transaction')} />
    </View>
  );
}
