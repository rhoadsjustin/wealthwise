import type {
  Bill,
  DashboardSummary,
  Debt,
  Insight,
  InsightsMessage,
  IncomeSource,
  Category,
  SavingsAccount,
  SavingsGoal,
  Transaction,
} from '@/context/DataContext';

export const DEMO_MODE_ENABLED_KEY = 'demoModeEnabled';
export const DEMO_MODE_SCALE_KEY = 'demoModeScale';

const CURRENCY_PATTERN = /\$-?\d[\d,]*(?:\.\d{1,2})?/g;

export function generateDemoModeScale() {
  let scale = 0.68 + Math.random() * 0.8;

  if (Math.abs(scale - 1) < 0.08) {
    scale += scale < 1 ? -0.12 : 0.12;
  }

  return Number(scale.toFixed(2));
}

function maskNumber(value: number, scale: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number((value * scale).toFixed(2));
}

function maskNumericString(value: string | null | undefined, scale: number) {
  if (!value) {
    return value ?? '';
  }

  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) {
    return value;
  }

  return maskNumber(numeric, scale).toFixed(2);
}

function formatMaskedCurrency(source: string, scale: number) {
  const numeric = Number.parseFloat(source.replace(/[$,]/g, ''));
  if (!Number.isFinite(numeric)) {
    return source;
  }

  const masked = maskNumber(numeric, scale);
  const decimals = source.includes('.') ? (source.split('.').pop()?.length ?? 2) : 0;

  return `$${masked.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function maskCurrencyText(text: string, scale: number) {
  return text.replace(CURRENCY_PATTERN, (match) => formatMaskedCurrency(match, scale));
}

export function maskTransactions(transactions: Transaction[], scale: number): Transaction[] {
  return transactions.map((transaction) => ({
    ...transaction,
    amount: maskNumericString(transaction.amount, scale),
  }));
}

export function maskCategories(categories: Category[], scale: number): Category[] {
  return categories.map((category) => ({
    ...category,
    budget: maskNumericString(category.budget, scale),
  }));
}

export function maskSavingsGoals(goals: SavingsGoal[], scale: number): SavingsGoal[] {
  return goals.map((goal) => ({
    ...goal,
    targetAmount: maskNumericString(goal.targetAmount, scale),
    currentAmount: maskNumericString(goal.currentAmount, scale),
    monthlyContribution: goal.monthlyContribution
      ? maskNumericString(goal.monthlyContribution, scale)
      : (goal.monthlyContribution ?? null),
  }));
}

export function maskSavingsAccounts(accounts: SavingsAccount[], scale: number): SavingsAccount[] {
  return accounts.map((account) => ({
    ...account,
    balance: maskNumericString(account.balance, scale),
  }));
}

export function maskIncomeSources(sources: IncomeSource[], scale: number): IncomeSource[] {
  return sources.map((source) => ({
    ...source,
    grossAmount: maskNumericString(source.grossAmount, scale),
    netAmount: maskNumericString(source.netAmount, scale),
    taxAmount: source.taxAmount ? maskNumericString(source.taxAmount, scale) : source.taxAmount,
    deductionAmount: source.deductionAmount
      ? maskNumericString(source.deductionAmount, scale)
      : source.deductionAmount,
  }));
}

export function maskBills(bills: Bill[], scale: number): Bill[] {
  return bills.map((bill) => ({
    ...bill,
    amount: maskNumericString(bill.amount, scale),
  }));
}

export function maskDebts(debts: Debt[], scale: number): Debt[] {
  return debts.map((debt) => ({
    ...debt,
    totalAmount: maskNumericString(debt.totalAmount, scale),
    currentBalance: maskNumericString(debt.currentBalance, scale),
    minimumPayment: debt.minimumPayment
      ? maskNumericString(debt.minimumPayment, scale)
      : (debt.minimumPayment ?? null),
  }));
}

export function maskInsights(insights: Insight[], scale: number): Insight[] {
  return insights.map((insight) => ({
    ...insight,
    title: maskCurrencyText(insight.title, scale),
    description: maskCurrencyText(insight.description, scale),
  }));
}

export function maskInsightsMessages(
  messages: InsightsMessage[],
  scale: number
): InsightsMessage[] {
  return messages.map((message) => ({
    ...message,
    content: maskCurrencyText(message.content, scale),
  }));
}

export function maskDashboardSummary(summary: DashboardSummary, scale: number): DashboardSummary {
  return {
    ...summary,
    totalIncome: maskNumber(summary.totalIncome, scale),
    totalExpenses: maskNumber(summary.totalExpenses, scale),
    totalBudget: maskNumber(summary.totalBudget, scale),
    remainingBudget: maskNumber(summary.remainingBudget, scale),
    totalSavingsPlanned: maskNumber(summary.totalSavingsPlanned, scale),
    totalSavingsProgress: maskNumber(summary.totalSavingsProgress, scale),
    totalSavingsBalance: maskNumber(summary.totalSavingsBalance, scale),
    netIncomeAfterSavings: maskNumber(summary.netIncomeAfterSavings, scale),
    incomeBaseline: maskNumber(summary.incomeBaseline, scale),
    incomeRemaining: maskNumber(summary.incomeRemaining, scale),
    actualIncome: maskNumber(summary.actualIncome, scale),
    recurringGrossIncome: maskNumber(summary.recurringGrossIncome, scale),
    recurringNetIncome: maskNumber(summary.recurringNetIncome, scale),
    recurringTaxWithheld: maskNumber(summary.recurringTaxWithheld, scale),
    recurringDeductions: maskNumber(summary.recurringDeductions, scale),
    oneOffIncome: maskNumber(summary.oneOffIncome, scale),
    monthlyIncome: summary.monthlyIncome === null ? null : maskNumber(summary.monthlyIncome, scale),
    categoryBreakdown: summary.categoryBreakdown.map((category) => ({
      ...category,
      budget: maskNumber(category.budget, scale),
      spent: maskNumber(category.spent, scale),
    })),
    savingsGoals: summary.savingsGoals.map((goal) => ({
      ...goal,
      targetAmount: maskNumber(goal.targetAmount, scale),
      currentAmount: maskNumber(goal.currentAmount, scale),
      monthlyContribution: maskNumber(goal.monthlyContribution, scale),
    })),
    savingsAccounts: summary.savingsAccounts.map((account) => ({
      ...account,
      balance: maskNumber(account.balance, scale),
    })),
    recentTransactions: maskTransactions(summary.recentTransactions, scale),
  };
}
