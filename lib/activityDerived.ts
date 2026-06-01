import type { Category, Transaction } from '@/context/DataContext';
import {
  getTransactionCategoryLabel,
  isUncategorizedTransaction,
  transactionNeedsCategory,
} from '@/lib/transactionPresentation';

export type ActivityFilter = 'all' | 'expense' | 'income' | 'uncategorized';

export interface ActivitySection {
  title: string;
  dateKey: string;
  data: ActivityRow[];
}

export interface ActivityRow {
  transaction: Transaction;
  category: Category | null;
  categoryLabel: string;
  amountValue: number;
  badge: string | null;
  needsCategory: boolean;
  searchText: string;
}

export interface ActivityDerivedState {
  sections: ActivitySection[];
  expenseTotal: number;
  transactionCount: number;
  uncategorizedCount: number;
}

export function buildCategoryMap(categories: Category[]) {
  return new Map<number, Category>(categories.map((category) => [category.id, category]));
}

export function deriveActivityState(params: {
  transactions: Transaction[];
  categories: Category[];
  filter: ActivityFilter;
  query: string;
  updatingTransactionIds?: Set<number>;
}) {
  const { transactions, categories, filter, query, updatingTransactionIds } = params;
  const categoryMap = buildCategoryMap(categories);
  const normalizedQuery = query.trim().toLowerCase();
  const grouped = new Map<string, ActivityRow[]>();
  let expenseTotal = 0;
  let transactionCount = 0;
  let uncategorizedCount = 0;

  for (const transaction of transactions) {
    if (filter === 'expense' && transaction.type !== 'expense') continue;
    if (filter === 'income' && transaction.type !== 'income') continue;
    if (filter === 'uncategorized' && !isUncategorizedTransaction(transaction)) continue;

    const category = categoryMap.get(transaction.categoryId ?? -1) ?? null;
    const categoryLabel = getTransactionCategoryLabel(transaction, category);
    const searchText =
      `${transaction.description} ${categoryLabel} ${transaction.date}`.toLowerCase();
    if (normalizedQuery && !searchText.includes(normalizedQuery)) continue;

    const amountValue = Number.parseFloat(transaction.amount || '0');
    const needsCategory = transactionNeedsCategory(transaction);
    const isUpdating = !!transaction.id && updatingTransactionIds?.has(transaction.id);
    const badge = isUpdating ? 'Updating…' : needsCategory ? 'Needs category' : null;
    const dateKey = transaction.date.slice(0, 10);
    const row: ActivityRow = {
      transaction,
      category,
      categoryLabel,
      amountValue: Number.isFinite(amountValue) ? amountValue : 0,
      badge,
      needsCategory,
      searchText,
    };

    const bucket = grouped.get(dateKey);
    if (bucket) {
      bucket.push(row);
    } else {
      grouped.set(dateKey, [row]);
    }

    transactionCount += 1;
    if (transaction.type === 'expense') {
      expenseTotal += row.amountValue;
    }
    if (needsCategory) {
      uncategorizedCount += 1;
    }
  }

  const sections: ActivitySection[] = Array.from(grouped.entries())
    .sort((left, right) => (left[0] < right[0] ? 1 : -1))
    .map(([dateKey, data]) => ({
      title: formatGroupDate(dateKey),
      dateKey,
      data,
    }));

  return {
    sections,
    expenseTotal,
    transactionCount,
    uncategorizedCount,
  } satisfies ActivityDerivedState;
}

export function buildCategorySpendMap(transactions: Transaction[]) {
  const spendMap = new Map<number, number>();

  for (const transaction of transactions) {
    if (transaction.type !== 'expense' || transaction.categoryId == null) {
      continue;
    }

    const amountValue = Number.parseFloat(transaction.amount || '0');
    if (!Number.isFinite(amountValue)) {
      continue;
    }

    spendMap.set(transaction.categoryId, (spendMap.get(transaction.categoryId) || 0) + amountValue);
  }

  return spendMap;
}

export function formatActivityShortDate(dateString: string) {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

export function formatActivityGroupDate(dateKey: string) {
  return formatGroupDate(dateKey);
}

function formatGroupDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}
