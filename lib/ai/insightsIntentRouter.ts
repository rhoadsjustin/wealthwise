import type { Category, DashboardSummary, Insight, Transaction } from '@/context/DataContext';
import { formatCurrency } from '@/lib/utils';

type SupportedIntent =
  | 'top-spending-categories'
  | 'where-to-save'
  | 'missing-categories'
  | 'budget-risks'
  | 'healthiest-category';

export interface InsightsIntentRouterInput {
  prompt: string;
  summary: DashboardSummary | null | undefined;
  categories: Category[] | null | undefined;
  transactions: Transaction[] | null | undefined;
  insights: Insight[] | null | undefined;
  latestMonthLabel?: string | null;
}

export interface InsightsIntentResolution {
  intent: SupportedIntent;
  response: string;
}

const missingCategorySuggestions = [
  'Groceries',
  'Dining',
  'Transportation',
  'Healthcare',
  'Entertainment',
  'Travel',
  'Emergency Fund',
  'Home Maintenance',
  'Personal Care',
  'Subscriptions',
];

export function routeInsightsIntent(
  input: InsightsIntentRouterInput
): InsightsIntentResolution | null {
  const normalized = normalize(input.prompt);
  if (!normalized || !input.summary) return null;

  if (
    includesAny(normalized, [
      'top spending',
      'biggest spending',
      'highest spending',
      'top categories',
      'spending categories',
    ])
  ) {
    return {
      intent: 'top-spending-categories',
      response: buildTopSpendingAnswer(input),
    };
  }

  if (
    includesAny(normalized, [
      'save more money',
      'cut spending',
      'reduce spending',
      'where can i save',
      'where should i save',
      'save money',
    ])
  ) {
    return {
      intent: 'where-to-save',
      response: buildWhereToSaveAnswer(input),
    };
  }

  if (
    includesAny(normalized, [
      'missing categories',
      'budget categories am i missing',
      'what categories am i missing',
      'what budget categories should i add',
      'categories should i add',
    ])
  ) {
    return {
      intent: 'missing-categories',
      response: buildMissingCategoriesAnswer(input),
    };
  }

  if (
    includesAny(normalized, [
      'budget risks',
      'at risk',
      'going over budget',
      'over budget',
      'budget pressure',
    ])
  ) {
    return {
      intent: 'budget-risks',
      response: buildBudgetRiskAnswer(input),
    };
  }

  if (
    includesAny(normalized, [
      'healthiest category',
      'best category',
      'most on track',
      'doing best',
      'looks healthiest',
    ])
  ) {
    return {
      intent: 'healthiest-category',
      response: buildHealthiestCategoryAnswer(input),
    };
  }

  return null;
}

function buildTopSpendingAnswer({ summary, latestMonthLabel }: InsightsIntentRouterInput): string {
  const entries = (summary?.categoryBreakdown ?? [])
    .filter((entry) => entry.spent > 0 || entry.budget > 0)
    .sort((left, right) => right.spent - left.spent)
    .slice(0, 5);

  if (!entries.length) {
    return 'I do not have enough category spend data yet to rank your top spending categories.';
  }

  const monthLabel = latestMonthLabel || 'this month';
  const lines = [`Top spending categories for ${monthLabel}:`];
  entries.forEach((entry, index) => {
    lines.push(
      `${index + 1}. ${entry.name}: ${formatCurrency(entry.spent)} of ${formatCurrency(entry.budget)} (${Math.round(entry.percentage)}%)`
    );
  });
  return lines.join('\n');
}

function buildWhereToSaveAnswer({
  summary,
  insights,
  latestMonthLabel,
}: InsightsIntentRouterInput): string {
  const entries = (summary?.categoryBreakdown ?? [])
    .filter((entry) => entry.budget > 0 || entry.spent > 0)
    .map((entry) => ({
      ...entry,
      variance: entry.spent - entry.budget,
    }))
    .sort((left, right) => {
      if (left.variance !== right.variance) return right.variance - left.variance;
      return right.spent - left.spent;
    });

  const overBudget = entries.filter((entry) => entry.variance > 0).slice(0, 2);
  const highSpend = entries.filter((entry) => entry.spent > 0).slice(0, 3);
  const monthLabel = latestMonthLabel || 'this month';

  if (!highSpend.length) {
    return 'I do not have enough spending data yet to identify savings opportunities.';
  }

  const lines: string[] = [];
  lines.push(`Best places to save in ${monthLabel}:`);

  if (overBudget.length) {
    overBudget.forEach((entry) => {
      lines.push(
        `- ${entry.name}: over budget by ${formatCurrency(entry.variance)} after spending ${formatCurrency(entry.spent)} against ${formatCurrency(entry.budget)}.`
      );
    });
  } else {
    highSpend.slice(0, 2).forEach((entry) => {
      lines.push(
        `- ${entry.name}: one of your highest-spend categories at ${formatCurrency(entry.spent)} (${Math.round(entry.percentage)}% of budget).`
      );
    });
  }

  const insightHint = (insights ?? []).find((insight) =>
    /budget|spend|saving/i.test(`${insight.title} ${insight.description}`)
  );
  if (insightHint) {
    lines.push(`- Watch for this signal: ${insightHint.description}`);
  }

  return lines.join('\n');
}

function buildMissingCategoriesAnswer({
  categories,
  transactions,
}: InsightsIntentRouterInput): string {
  const existing = new Set((categories ?? []).map((category) => normalize(category.name)));
  const suggestions = missingCategorySuggestions
    .filter((name) => !existing.has(normalize(name)))
    .slice(0, 5);

  const uncategorizedExpenses = (transactions ?? []).filter(
    (tx) => tx.type === 'expense' && (tx.categoryId == null || tx.categoryId === 0)
  ).length;

  if (!suggestions.length && uncategorizedExpenses === 0) {
    return 'Your current category list already covers the common essentials. I would only add new categories if you want finer control over a specific spending area.';
  }

  const lines: string[] = [];
  lines.push('Budget categories worth considering next:');
  suggestions.forEach((name) => {
    lines.push(`- ${name}`);
  });

  if (uncategorizedExpenses > 0) {
    lines.push(
      `You also have ${uncategorizedExpenses} uncategorized expense${uncategorizedExpenses === 1 ? '' : 's'}, which is a sign you may need one or two more targeted categories.`
    );
  }

  return lines.join('\n');
}

function buildBudgetRiskAnswer({ summary, latestMonthLabel }: InsightsIntentRouterInput): string {
  const entries = (summary?.categoryBreakdown ?? [])
    .filter((entry) => entry.budget > 0 || entry.spent > 0)
    .sort((left, right) => {
      const leftVariance = left.spent - left.budget;
      const rightVariance = right.spent - right.budget;
      if (leftVariance !== rightVariance) return rightVariance - leftVariance;
      return right.percentage - left.percentage;
    })
    .slice(0, 3);

  if (!entries.length) {
    return 'I do not have enough budget data yet to rank your current risks.';
  }

  const monthLabel = latestMonthLabel || 'this month';
  const lines = [`Biggest budget risks for ${monthLabel}:`];
  entries.forEach((entry) => {
    const variance = entry.spent - entry.budget;
    lines.push(
      `- ${entry.name}: ${formatCurrency(entry.spent)} of ${formatCurrency(entry.budget)} used (${Math.round(entry.percentage)}%)${variance > 0 ? `, over by ${formatCurrency(variance)}` : ''}.`
    );
  });
  return lines.join('\n');
}

function buildHealthiestCategoryAnswer({
  summary,
  latestMonthLabel,
}: InsightsIntentRouterInput): string {
  const entries = (summary?.categoryBreakdown ?? [])
    .filter((entry) => entry.budget > 0)
    .map((entry) => ({
      ...entry,
      distance: Math.abs(85 - entry.percentage),
    }))
    .sort((left, right) => {
      if (left.distance !== right.distance) return left.distance - right.distance;
      return right.budget - left.budget;
    });

  const best = entries[0];
  if (!best) {
    return 'I do not have enough budgeted categories yet to identify the healthiest one.';
  }

  const monthLabel = latestMonthLabel || 'this month';
  return `${best.name} looks healthiest in ${monthLabel}: ${formatCurrency(best.spent)} spent against ${formatCurrency(best.budget)}, which is ${Math.round(best.percentage)}% of budget.`;
}

function includesAny(value: string, terms: string[]): boolean {
  return terms.some((term) => value.includes(term));
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}
