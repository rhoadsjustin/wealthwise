import type { Category, DashboardSummary, Insight, Transaction } from '@/context/DataContext';
import type { AssistantContextDoc } from '@/lib/ai/insightsAssistantContext';
import { formatCurrency, formatDate } from '@/lib/utils';

export interface FinanceAssistantContextData {
  summary: DashboardSummary | null | undefined;
  categories?: Category[] | null | undefined;
  transactions: Transaction[] | null | undefined;
  insights?: Insight[] | null | undefined;
  budgetDocs?: AssistantContextDoc[] | null | undefined;
}

export interface FinanceAssistantContextSection {
  tag: 'summary' | 'categories' | 'recent_transactions' | 'signals';
  content: string;
}

export interface FinanceAssistantContextPayload {
  sections: FinanceAssistantContextSection[];
  taggedText: string;
}

export interface BudgetToolArguments {
  scope: 'summary' | 'category' | 'topCategories' | 'transactions';
  month?: string;
  categoryName?: string;
  limit?: number;
  includeTransactions?: boolean;
  includeTrends?: boolean;
}

export interface BudgetToolResult {
  text: string;
  payload: Record<string, unknown>;
}

type CategorySnapshot = {
  id: number;
  name: string;
  budget: number;
  spent: number;
  percentage: number | null | undefined;
};

export function buildFinanceAssistantContext({
  summary,
  transactions,
  insights,
  budgetDocs,
}: FinanceAssistantContextData): FinanceAssistantContextPayload {
  if (!summary) {
    return { sections: [], taggedText: '' };
  }

  const sections: FinanceAssistantContextSection[] = [];
  const summaryLine = buildSummaryLine(summary);
  if (summaryLine) {
    sections.push({ tag: 'summary', content: summaryLine });
  }

  const categoriesLine = buildCategoriesLine(summary);
  if (categoriesLine) {
    sections.push({ tag: 'categories', content: categoriesLine });
  }

  const recentTransactionsLine = buildRecentTransactionsLine(
    summary.recentTransactions ?? transactions ?? []
  );
  if (recentTransactionsLine) {
    sections.push({ tag: 'recent_transactions', content: recentTransactionsLine });
  }

  const signalsLine = buildSignalsLine(insights, budgetDocs);
  if (signalsLine) {
    sections.push({ tag: 'signals', content: signalsLine });
  }

  return {
    sections,
    taggedText: sections
      .map((section) => `<${section.tag}>${section.content}</${section.tag}>`)
      .join('\n\n'),
  };
}

export function buildFinanceAssistantSystemPrompt(taggedContext: string): string {
  return `You are a helpful personal finance assistant running on-device.

Use only the financial context below.
Prefer the current month unless the user specifies a timeframe.
Show currency as $X,XXX.XX.
Format dates like "May 25, 2026" or "May 2026".
For the mobile chat UI, keep answers visually compact:
- Start with one short takeaway line when helpful.
- Prefer 2-4 short bullet points over paragraphs.
- Keep each bullet to one sentence when possible.
Answer in plain language with short sentences or bullets.
Do not repeat raw source text, ids, tags, or context fragments.
If the context is missing a key detail, ask one short follow-up question.

Financial context:
${taggedContext}`;
}

export function resolveBudgetToolRequest(
  args: BudgetToolArguments,
  context: Pick<FinanceAssistantContextData, 'summary' | 'categories' | 'transactions'>
): BudgetToolResult {
  const categoriesList = Array.isArray(context.categories) ? context.categories : [];
  const transactionsList = Array.isArray(context.transactions) ? context.transactions : [];
  const { summary } = context;
  const targetMonth = args.month ?? selectDefaultMonth(transactionsList);
  const selectedMonth = targetMonth ?? currentMonth();

  switch (args.scope) {
    case 'summary':
      return buildSummaryResult(summary, categoriesList, transactionsList, selectedMonth, args);
    case 'category':
      return buildCategoryResult(summary, categoriesList, transactionsList, selectedMonth, args);
    case 'topCategories':
      return buildTopCategoriesResult(
        summary,
        categoriesList,
        transactionsList,
        selectedMonth,
        args
      );
    case 'transactions':
      return buildTransactionsResult(
        summary,
        categoriesList,
        transactionsList,
        selectedMonth,
        args
      );
    default:
      return {
        text: 'The tool request could not be processed. Provide a valid scope such as "summary", "category", "topCategories", or "transactions".',
        payload: { ok: false, reason: 'invalid_scope', args },
      };
  }
}

export function dedupeFinanceMonths(transactions: Transaction[]): string[] {
  const set = new Set<string>();
  transactions.forEach((tx) => {
    const month = normalizeMonth(tx.date);
    if (month) set.add(month);
  });
  return Array.from(set).sort();
}

export function normalizeMonth(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const date = typeof value === 'string' ? new Date(value) : value;
  if (!date || Number.isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

function buildSummaryLine(summary: DashboardSummary): string {
  return `Financial summary: income baseline ${formatCurrency(
    summary.incomeBaseline || summary.totalIncome || 0
  )}, recurring net income ${formatCurrency(summary.recurringNetIncome || 0)}, one-off income ${formatCurrency(
    summary.oneOffIncome || 0
  )}, estimated taxes ${formatCurrency(summary.recurringTaxWithheld || 0)}, expenses ${formatCurrency(
    summary.totalExpenses || 0
  )}, total budget ${formatCurrency(summary.totalBudget || 0)}, remaining budget ${formatCurrency(
    summary.remainingBudget || 0
  )}, savings account balance ${formatCurrency(
    summary.totalSavingsBalance || 0
  )}, net income after savings ${formatCurrency(summary.netIncomeAfterSavings || 0)}.`;
}

function buildCategoriesLine(summary: DashboardSummary): string {
  const topBreakdown = (summary.categoryBreakdown ?? []).slice(0, 4);
  if (!topBreakdown.length) return '';

  return `Top categories: ${topBreakdown
    .map(
      (entry) =>
        `${entry.name} spent ${formatCurrency(entry.spent)} of ${formatCurrency(entry.budget)} budget (${entry.percentage}%).`
    )
    .join(' ')}`;
}

function buildRecentTransactionsLine(transactions: Transaction[]): string {
  const recentTransactions = transactions.slice(0, 5);
  if (!recentTransactions.length) return '';

  return `Recent transactions: ${recentTransactions
    .map(
      (tx) =>
        `${tx.description} ${formatCurrency(Number(tx.amount || 0))} on ${formatReadableDate(tx.date)}.`
    )
    .join(' ')}`;
}

function buildSignalsLine(
  insights: Insight[] | null | undefined,
  budgetDocs: AssistantContextDoc[] | null | undefined
): string {
  const lines: string[] = [];
  const currentInsights = (insights ?? []).slice(0, 3);
  if (currentInsights.length) {
    lines.push(
      `Current insights: ${currentInsights
        .map((insight) => `${insight.title}: ${insight.description}`)
        .join(' ')}`
    );
  }

  if (budgetDocs?.length) {
    lines.push(`Budget signals: ${budgetDocs.map((doc) => doc.content).join(' ')}`);
  }

  return lines.join(' ');
}

function currentMonth(): string {
  return normalizeMonth(new Date()) ?? 'unknown';
}

function selectDefaultMonth(transactions: Transaction[]): string | null {
  if (!transactions.length) return normalizeMonth(new Date());
  const sorted = [...transactions].sort((a, b) => (a.date > b.date ? -1 : 1));
  for (const tx of sorted) {
    const month = normalizeMonth(tx.date);
    if (month) return month;
  }
  return normalizeMonth(new Date());
}

function buildSummaryResult(
  summary: DashboardSummary | null | undefined,
  categories: Category[],
  transactions: Transaction[],
  month: string,
  args: BudgetToolArguments
): BudgetToolResult {
  const totalBudget = safeNumber(summary?.totalBudget);
  const totalExpenses = safeNumber(summary?.totalExpenses);
  const totalIncome = safeNumber(summary?.totalIncome ?? summary?.actualIncome);
  const remainingBudget = safeNumber(summary?.remainingBudget ?? totalBudget - totalExpenses);
  const savingsBalance = safeNumber(summary?.totalSavingsBalance);

  const topBreakdown: CategorySnapshot[] = Array.isArray(summary?.categoryBreakdown)
    ? summary.categoryBreakdown.slice(0, clampLimit(args.limit)).map((item) => ({
        id: item.id,
        name: item.name,
        budget: safeNumber(item.budget),
        spent: safeNumber(item.spent),
        percentage: safeNumber(item.percentage),
      }))
    : buildCategorySnapshotFromTransactions(categories, transactions, month, args.limit);

  const lines: string[] = [];
  lines.push(`Budget summary for ${monthLabel(month)}:`);
  lines.push(`- Total budget: ${formatCurrency(totalBudget)}`);
  lines.push(`- Total expenses: ${formatCurrency(totalExpenses)}`);
  if (Number.isFinite(totalIncome)) {
    lines.push(`- Total income: ${formatCurrency(totalIncome)}`);
  }
  lines.push(`- Remaining budget: ${formatCurrency(remainingBudget)}`);
  lines.push(`- Savings account balance: ${formatCurrency(savingsBalance)}`);

  if (topBreakdown.length > 0) {
    lines.push('Top categories by spend:');
    topBreakdown.forEach((entry, index) => {
      const variance = entry.spent - entry.budget;
      const varianceLabel =
        variance === 0
          ? '$0.00'
          : `${variance > 0 ? '+' : ''}${formatCurrency(Math.abs(variance))}`;
      lines.push(
        `${index + 1}. ${entry.name}: ${formatCurrency(entry.spent)} of ${formatCurrency(entry.budget)} (${Math.round(entry.percentage ?? 0)}%), variance ${varianceLabel}`
      );
    });
  }

  return {
    text: lines.join('\n'),
    payload: {
      scope: 'summary',
      month,
      totals: {
        budget: totalBudget,
        expenses: totalExpenses,
        income: totalIncome,
        remaining: remainingBudget,
        savingsBalance,
      },
      topCategories: topBreakdown,
    },
  };
}

function buildCategoryResult(
  summary: DashboardSummary | null | undefined,
  categories: Category[],
  transactions: Transaction[],
  month: string,
  args: BudgetToolArguments
): BudgetToolResult {
  const requestedName = args.categoryName?.trim();
  if (!requestedName) {
    return {
      text: 'Provide a categoryName to inspect a specific category.',
      payload: { ok: false, reason: 'missing_category', args },
    };
  }

  const matched = matchCategory(categories, requestedName);
  if (!matched) {
    return {
      text: `No category named "${requestedName}" was found.`,
      payload: { ok: false, reason: 'unknown_category', args },
    };
  }

  const breakdownEntry = Array.isArray(summary?.categoryBreakdown)
    ? summary.categoryBreakdown.find(
        (item) => normalizeText(item.name) === normalizeText(matched.name)
      )
    : null;

  const relevantTransactions = filterTransactions(transactions, month, matched.id);
  const spentFromTransactions = relevantTransactions.reduce(
    (acc, tx) => acc + safeNumber(tx.amount),
    0
  );

  const budget = safeNumber(breakdownEntry?.budget ?? matched.budget);
  const spent = safeNumber(breakdownEntry?.spent ?? spentFromTransactions);
  const remaining = budget - spent;
  const percentage = budget > 0 ? (spent / budget) * 100 : 0;

  const sampleTransactions = args.includeTransactions
    ? relevantTransactions.slice(0, clampLimit(args.limit) || 5).map((tx) => ({
        id: tx.id,
        date: tx.date,
        description: tx.description,
        amount: safeNumber(tx.amount),
      }))
    : [];

  const lines: string[] = [];
  lines.push(
    `${matched.name} in ${monthLabel(month)}: ${formatCurrency(spent)} spent of ${formatCurrency(
      budget
    )} (${Math.round(percentage)}% used).`
  );
  lines.push(`- Remaining budget: ${formatCurrency(remaining)}.`);

  if (args.includeTransactions && sampleTransactions.length > 0) {
    lines.push('- Recent transactions:');
    sampleTransactions.forEach((tx) => {
      lines.push(
        `  - ${tx.description ?? 'No description'} for ${formatCurrency(tx.amount)} on ${formatReadableDate(tx.date)}`
      );
    });
  }

  return {
    text: lines.join('\n'),
    payload: {
      scope: 'category',
      month,
      category: {
        id: matched.id,
        name: matched.name,
        budget,
        spent,
        remaining,
        percentage,
      },
      transactions: sampleTransactions,
    },
  };
}

function buildTopCategoriesResult(
  summary: DashboardSummary | null | undefined,
  categories: Category[],
  transactions: Transaction[],
  month: string,
  args: BudgetToolArguments
): BudgetToolResult {
  const limit = clampLimit(args.limit);
  const entries: CategorySnapshot[] = Array.isArray(summary?.categoryBreakdown)
    ? summary.categoryBreakdown
        .map((item) => ({
          id: item.id,
          name: item.name,
          budget: safeNumber(item.budget),
          spent: safeNumber(item.spent),
          percentage: safeNumber(item.percentage),
        }))
        .sort((a, b) => b.spent - a.spent)
    : buildCategorySnapshotFromTransactions(categories, transactions, month, limit);

  const top = entries.slice(0, limit || 5);

  if (!top.length) {
    return {
      text: 'No category spend data is available yet.',
      payload: { scope: 'topCategories', month, categories: [] },
    };
  }

  const lines: string[] = [];
  lines.push(`Top ${top.length} categories for ${monthLabel(month)}:`);
  top.forEach((entry, index) => {
    lines.push(
      `${index + 1}. ${entry.name}: ${formatCurrency(entry.spent)} of ${formatCurrency(entry.budget)} (${Math.round(entry.percentage ?? 0)}%)`
    );
  });

  return {
    text: lines.join('\n'),
    payload: { scope: 'topCategories', month, categories: top },
  };
}

function buildTransactionsResult(
  _summary: DashboardSummary | null | undefined,
  categories: Category[],
  transactions: Transaction[],
  month: string,
  args: BudgetToolArguments
): BudgetToolResult {
  const filtered = filterTransactions(
    transactions,
    month,
    args.categoryName ? matchCategory(categories, args.categoryName)?.id : undefined
  );
  const limit = clampLimit(args.limit) || 5;
  const top = filtered.slice(0, limit);

  if (!top.length) {
    return {
      text: `No transactions found for ${args.categoryName ?? 'the selected filters'} in ${monthLabel(month)}.`,
      payload: { scope: 'transactions', month, transactions: [] },
    };
  }

  const lines: string[] = [];
  lines.push(
    `Recent ${top.length} transactions${args.categoryName ? ` for ${args.categoryName}` : ''} in ${monthLabel(month)}:`
  );
  top.forEach((tx) => {
    lines.push(
      `- ${tx.description ?? 'No description'} for ${formatCurrency(safeNumber(tx.amount))} on ${formatReadableDate(tx.date)}`
    );
  });

  return {
    text: lines.join('\n'),
    payload: {
      scope: 'transactions',
      month,
      transactions: top.map((tx) => ({
        id: tx.id,
        date: tx.date,
        description: tx.description,
        amount: safeNumber(tx.amount),
        categoryId: tx.categoryId,
      })),
    },
  };
}

function buildCategorySnapshotFromTransactions(
  categories: Category[],
  transactions: Transaction[],
  month: string,
  limit?: number
): CategorySnapshot[] {
  const limitValue = clampLimit(limit) || undefined;
  const perCategory = new Map<number, { name: string; budget: number; spent: number }>();
  const categoryById = new Map<number, Category>();
  categories.forEach((category) => {
    if (typeof category?.id === 'number') {
      categoryById.set(category.id, category);
      perCategory.set(category.id, {
        name: category.name,
        budget: safeNumber(category.budget),
        spent: 0,
      });
    }
  });

  const filtered = filterTransactions(transactions, month);
  filtered.forEach((tx) => {
    if (tx.type !== 'expense') return;
    const categoryId = typeof tx.categoryId === 'number' ? tx.categoryId : undefined;
    if (!categoryId) return;
    const entry = perCategory.get(categoryId);
    if (!entry) {
      const fallbackCategory = categoryById.get(categoryId);
      perCategory.set(categoryId, {
        name: fallbackCategory?.name ?? `Category ${categoryId}`,
        budget: safeNumber(fallbackCategory?.budget),
        spent: safeNumber(tx.amount),
      });
      return;
    }
    entry.spent += safeNumber(tx.amount);
  });

  const result = Array.from(perCategory.entries()).map(([id, entry]) => ({
    id,
    name: entry.name,
    budget: entry.budget,
    spent: entry.spent,
    percentage: entry.budget > 0 ? (entry.spent / entry.budget) * 100 : null,
  }));

  result.sort((a, b) => b.spent - a.spent);
  return typeof limitValue === 'number' ? result.slice(0, limitValue) : result;
}

function filterTransactions(
  transactions: Transaction[],
  month: string,
  categoryId?: number
): Transaction[] {
  return transactions
    .filter((tx) => {
      if (tx.type !== 'expense') return false;
      const txMonth = normalizeMonth(tx.date);
      if (month && txMonth !== month) return false;
      if (typeof categoryId === 'number') {
        return (tx.categoryId ?? null) === categoryId;
      }
      return true;
    })
    .sort((a, b) => (a.date > b.date ? -1 : 1));
}

function matchCategory(categories: Category[], query: string): Category | null {
  const normalized = normalizeText(query);
  if (!normalized) return null;
  let exact: Category | null = null;
  let partial: Category | null = null;

  categories.forEach((category) => {
    if (!category?.name) return;
    const name = normalizeText(category.name);
    if (name === normalized) {
      exact = category;
    } else if (!partial && name.includes(normalized)) {
      partial = category;
    }
  });

  return exact ?? partial;
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function clampLimit(value?: number | null): number | undefined {
  if (typeof value !== 'number') return undefined;
  if (!Number.isFinite(value)) return undefined;
  return Math.min(Math.max(Math.round(value), 1), 10);
}

function safeNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value === 'bigint') return Number(value);
  if (value instanceof Number) {
    const parsed = value.valueOf();
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function monthLabel(month: string): string {
  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) return month;
  const formatter = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long' });
  const date = new Date(Date.UTC(year, monthIndex, 1));
  if (Number.isNaN(date.getTime())) return month;
  return formatter.format(date);
}

function formatReadableDate(value: string | Date): string {
  try {
    return formatDate(value);
  } catch {
    return String(value);
  }
}
