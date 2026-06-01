import type { Category } from '@/context/DataContext';

export interface MonthlyCoachCategory {
  id: number | null;
  name: string;
  spent: number;
  budget: number;
  transactionCount: number;
}

export interface MonthlyCoachInput {
  income: number;
  oneOffIncome: number;
  expenses: number;
  savingsBalance: number;
  categories: MonthlyCoachCategory[];
}

export interface MonthlyCoachSuggestion {
  id: string;
  title: string;
  detail: string;
  tone: 'warning' | 'success' | 'info';
}

export function buildMonthlyCoachSuggestions(input: MonthlyCoachInput): MonthlyCoachSuggestion[] {
  const suggestions: MonthlyCoachSuggestion[] = [];
  const sortedCategories = [...input.categories].sort((a, b) => b.spent - a.spent);
  const overBudget = sortedCategories.find(
    (category) => category.budget > 0 && category.spent > category.budget
  );
  const highShare = sortedCategories.find(
    (category) => input.income > 0 && category.spent / input.income >= 0.18
  );
  const frequent = sortedCategories.find((category) => category.transactionCount >= 6);
  const net = input.income - input.expenses;

  if (overBudget) {
    const overBy = overBudget.spent - overBudget.budget;
    suggestions.push({
      id: `over-${overBudget.id ?? 'uncategorized'}`,
      title: `Cut back in ${overBudget.name}`,
      detail: `${overBudget.name} is ${formatCurrency(overBy)} over plan. Look for one repeat charge or a smaller weekly cap before next month.`,
      tone: 'warning',
    });
  }

  if (highShare && highShare !== overBudget) {
    suggestions.push({
      id: `share-${highShare.id ?? 'uncategorized'}`,
      title: `${highShare.name} is taking a large share`,
      detail: `${highShare.name} used ${Math.round((highShare.spent / input.income) * 100)}% of income. A 10% reduction would free ${formatCurrency(highShare.spent * 0.1)}.`,
      tone: 'warning',
    });
  }

  if (frequent && frequent !== overBudget && frequent !== highShare) {
    suggestions.push({
      id: `frequency-${frequent.id ?? 'uncategorized'}`,
      title: `Review repeat ${frequent.name} spending`,
      detail: `${frequent.transactionCount} transactions landed here this month. Check for subscriptions, convenience purchases, or smaller recurring leaks.`,
      tone: 'info',
    });
  }

  if (input.oneOffIncome > 0) {
    suggestions.push({
      id: 'one-off-income',
      title: 'Separate one-off income',
      detail: `${formatCurrency(input.oneOffIncome)} looks like one-time income. Consider sending part of it to savings before raising regular spending.`,
      tone: 'info',
    });
  }

  if (net > 0) {
    suggestions.push({
      id: 'positive-net',
      title: 'Protect the month surplus',
      detail: `${formatCurrency(net)} remains after expenses. Move a clear amount to savings while the month is ahead.`,
      tone: 'success',
    });
  } else if (input.income > 0) {
    suggestions.push({
      id: 'negative-net',
      title: 'Month is running negative',
      detail: `Expenses are ${formatCurrency(Math.abs(net))} above income. Start with the top category before cutting across everything.`,
      tone: 'warning',
    });
  }

  if (input.savingsBalance <= 0) {
    suggestions.push({
      id: 'savings-start',
      title: 'Set a savings baseline',
      detail:
        'Add savings account totals so monthly snapshots can track whether cash reserves are actually moving.',
      tone: 'info',
    });
  }

  return dedupeSuggestions(suggestions).slice(0, 4);
}

export function categoryBudgetLookup(categories: Category[]) {
  const map = new Map<number, number>();
  categories.forEach((category) => {
    const budget = Number.parseFloat(category.budget || '0');
    map.set(category.id, Number.isFinite(budget) ? budget : 0);
  });
  return map;
}

function dedupeSuggestions(suggestions: MonthlyCoachSuggestion[]) {
  const seen = new Set<string>();
  return suggestions.filter((suggestion) => {
    if (seen.has(suggestion.id)) return false;
    seen.add(suggestion.id);
    return true;
  });
}

function formatCurrency(value: number) {
  if (!Number.isFinite(value)) return '$0';
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}
