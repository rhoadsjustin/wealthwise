import type { Category, DashboardSummary, Insight, Transaction } from '@/context/DataContext';
import { formatCurrency, formatDate } from '@/lib/utils';

type SupportedIntent =
  | 'top-spending-categories'
  | 'where-to-save'
  | 'recent-spending-change'
  | 'missing-categories'
  | 'budget-risks'
  | 'healthiest-category'
  | 'category-budget-why';

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
  const categoryBudgetWhy = buildCategoryBudgetWhyAnswer(input);

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
      'save this month',
      'cut back this month',
      'free up cash',
      'save money',
      'improve my budget',
      'improve budget',
    ])
  ) {
    return {
      intent: 'where-to-save',
      response: buildWhereToSaveAnswer(input),
    };
  }

  if (
    includesAny(normalized, [
      'what changed lately',
      'what changed in my spending',
      'what changed this month',
      'changed lately',
      'changed this month',
      'recent spending',
      'recent activity',
      'latest charges',
    ])
  ) {
    return {
      intent: 'recent-spending-change',
      response: buildRecentSpendingChangeAnswer(input),
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
    !categoryBudgetWhy &&
    includesAny(normalized, [
      'budget risks',
      'at risk',
      'going over budget',
      'over budget',
      'overspent',
      'overspending',
      'budget pressure',
    ]) &&
    !isCategoryBudgetWhyPrompt(normalized)
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

  if (categoryBudgetWhy) {
    return {
      intent: 'category-budget-why',
      response: categoryBudgetWhy,
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
  const lines = [`Top spending in ${monthLabel}:`];
  entries.forEach((entry, index) => {
    lines.push(
      `${index + 1}. ${entry.name} - ${formatCurrency(entry.spent)} of ${formatCurrency(entry.budget)} (${Math.round(entry.percentage)}%)`
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
        `- ${entry.name}: ${formatCurrency(entry.variance)} over after spending ${formatCurrency(entry.spent)} on a ${formatCurrency(entry.budget)} plan.`
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
    lines.push(`- Watch: ${insightHint.description}`);
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
      `- ${uncategorizedExpenses} uncategorized expense${uncategorizedExpenses === 1 ? '' : 's'} still need a better home.`
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

function buildRecentSpendingChangeAnswer({
  summary,
  transactions,
  latestMonthLabel,
}: InsightsIntentRouterInput): string {
  const monthLabel = latestMonthLabel || 'this month';
  const recentExpenses = (transactions ?? [])
    .filter((tx) => tx.type === 'expense' && Number(tx.amount || 0) > 0)
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, 4);

  const pressurePoints = (summary?.categoryBreakdown ?? [])
    .filter((entry) => entry.spent > 0 || entry.budget > 0)
    .map((entry) => ({
      ...entry,
      variance: entry.spent - entry.budget,
    }))
    .sort((left, right) => {
      if (left.variance !== right.variance) return right.variance - left.variance;
      return right.spent - left.spent;
    })
    .slice(0, 2);

  if (!recentExpenses.length && !pressurePoints.length) {
    return 'I do not have enough recent spending data yet to describe what changed lately.';
  }

  const lines = [`What stands out lately in ${monthLabel}:`];

  if (recentExpenses.length) {
    recentExpenses.slice(0, 3).forEach((tx) => {
      lines.push(
        `- ${tx.description}: ${formatCurrency(Number(tx.amount || 0))} on ${formatReadableDate(tx.date)}.`
      );
    });
  }

  if (pressurePoints.length) {
    lines.push(
      `- Pressure is highest in ${pressurePoints
        .map(
          (entry) =>
            `${entry.name} (${formatCurrency(entry.spent)} of ${formatCurrency(entry.budget)}${entry.variance > 0 ? `, over by ${formatCurrency(entry.variance)}` : ''})`
        )
        .join(' and ')}.`
    );
  }

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
  return [
    `Healthiest category in ${monthLabel}: ${best.name}.`,
    `- Spent ${formatCurrency(best.spent)} of ${formatCurrency(best.budget)} (${Math.round(best.percentage)}% used).`,
  ].join('\n');
}

function buildCategoryBudgetWhyAnswer({
  prompt,
  summary,
  categories,
  transactions,
  latestMonthLabel,
}: InsightsIntentRouterInput): string | null {
  const normalizedPrompt = normalize(prompt);
  if (
    !includesAny(normalizedPrompt, [
      'why is',
      'why are',
      'why did',
      'why am i',
      'over budget',
      'over my budget',
      'went over budget',
      'overspent',
      'overspending',
    ])
  ) {
    return null;
  }

  const categoryEntries = summary?.categoryBreakdown ?? [];
  const matchedCategory = findBestCategoryEntryMatch(categoryEntries, normalizedPrompt);

  if (!matchedCategory) {
    return null;
  }

  const budget = matchedCategory.budget;
  const spent = matchedCategory.spent;
  const variance = spent - budget;
  const monthLabel = latestMonthLabel || 'this month';
  const linkedCategory = (categories ?? []).find((category) => category.id === matchedCategory.id);
  const recentTransactions = (transactions ?? [])
    .filter(
      (tx) =>
        tx.type === 'expense' && tx.categoryId === linkedCategory?.id && Number(tx.amount || 0) > 0
    )
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, 3);

  const lines: string[] = [];
  if (variance > 0) {
    lines.push(`${matchedCategory.name} is over budget in ${monthLabel}.`);
    lines.push(
      `- Spent ${formatCurrency(spent)} against a ${formatCurrency(budget)} budget, so it is ${formatCurrency(variance)} over plan.`
    );
  } else {
    lines.push(`${matchedCategory.name} is not over budget in ${monthLabel}.`);
    lines.push(
      `- Spent ${formatCurrency(spent)} of ${formatCurrency(budget)} (${Math.round(matchedCategory.percentage)}% used).`
    );
  }

  if (recentTransactions.length) {
    recentTransactions.forEach((tx, index) => {
      lines.push(
        `${index === 0 ? '- Latest charge' : '- Recent charge'}: ${tx.description} for ${formatCurrency(Number(tx.amount || 0))} on ${formatReadableDate(tx.date)}.`
      );
    });
  }

  if (variance > 0) {
    lines.push(
      `- Next step: raise the budget if this category is flexible, or trim the latest charges first.`
    );
  }

  return lines.join('\n');
}

function includesAny(value: string, terms: string[]): boolean {
  return terms.some((term) => value.includes(term));
}

function isCategoryBudgetWhyPrompt(value: string): boolean {
  return includesAny(value, [
    'why is',
    'why are',
    'why did',
    'why am i',
    'over my budget',
    'went over budget',
  ]);
}

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ');
}

function formatReadableDate(value: string | Date): string {
  try {
    return formatDate(value);
  } catch {
    return String(value);
  }
}

function findBestCategoryEntryMatch<
  T extends {
    name: string;
  },
>(entries: T[], normalizedPrompt: string): T | null {
  let match: T | null = null;

  entries.forEach((entry) => {
    const categoryName = normalize(entry.name);
    if (!categoryName || !normalizedPrompt.includes(categoryName)) return;
    if (!match || categoryName.length > normalize(match.name).length) {
      match = entry;
    }
  });

  return match;
}
