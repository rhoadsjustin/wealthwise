import { NativeModules, Platform } from 'react-native';
import type { Category, Transaction } from '@/context/DataContext';

const { BudgetInsightsModule } = NativeModules as {
  BudgetInsightsModule?: {
    trainBudgetModels: (rows: BudgetSnapshot[]) => Promise<BudgetInsightsPayload>;
  };
};

export type BudgetStatus = 'over' | 'under' | 'balanced' | string;

export interface BudgetSnapshot {
  categoryId: number;
  categoryName: string;
  month: string;
  budget: number;
  spent: number;
  transactions: number;
  metadata?: Record<string, any>;
}

export interface BudgetClassification {
  categoryId: number;
  categoryName: string;
  month: string;
  predictedStatus: BudgetStatus;
  actualStatus: BudgetStatus;
  confidence: number;
  spendRatio: number;
  variance: number;
  transactions: number;
  metadata?: Record<string, any>;
}

export interface BudgetRecommendation {
  userId?: string;
  categoryId?: number;
  categoryName: string;
  score: number;
}

export interface BudgetInsightsMetadata {
  trainedAt: string;
  sampleCount: number;
  labels: BudgetStatus[];
  trainingAccuracy: number;
}

export interface BudgetInsightsPayload {
  classifications: BudgetClassification[];
  recommendations: BudgetRecommendation[];
  metadata: BudgetInsightsMetadata;
}

export interface BudgetSnapshotsInput {
  transactions: Transaction[] | null | undefined;
  categories: Category[] | null | undefined;
  monthsBack?: number;
}

export function buildBudgetSnapshots({
  transactions,
  categories,
  monthsBack = 6,
}: BudgetSnapshotsInput): BudgetSnapshot[] {
  if (!transactions?.length || !categories?.length) {
    return [];
  }

  const categoryMap = new Map<number, Category>();
  categories.forEach((cat) => {
    if (typeof cat.id === 'number') {
      categoryMap.set(cat.id, cat);
    }
  });

  const normalizedMonths = buildMonthSequence(monthsBack);
  const monthSet = new Set(normalizedMonths);

  const snapshots = new Map<string, BudgetSnapshot>();

  normalizedMonths.forEach((month) => {
    categoryMap.forEach((category) => {
      const key = snapshotKey(category.id, month);
      const budget = toNumber(category.budget);
      snapshots.set(key, {
        categoryId: category.id,
        categoryName: category.name,
        month,
        budget,
        spent: 0,
        transactions: 0,
        metadata: {
          icon: category.icon,
          color: category.color,
          budgetOriginal: category.budget,
        },
      });
    });
  });

  transactions
    .filter((tx) => tx.type === 'expense' && typeof tx.categoryId === 'number')
    .forEach((tx) => {
      const month = formatMonth(tx.date);
      if (!month || !monthSet.has(month)) return;
      const categoryId = tx.categoryId as number;
      const key = snapshotKey(categoryId, month);
      const snapshot = snapshots.get(key);
      if (!snapshot) return;
      const amount = toNumber(tx.amount);
      if (amount <= 0) return;
      snapshot.spent += amount;
      snapshot.transactions += 1;
      if (snapshot.metadata) {
        snapshot.metadata.lastTransaction = tx.date;
      }
    });

  const result: BudgetSnapshot[] = [];

  snapshots.forEach((snapshot) => {
    const remaining = snapshot.budget - snapshot.spent;
    if (snapshot.metadata) {
      snapshot.metadata.remaining = Number.isFinite(remaining) ? remaining : 0;
      snapshot.metadata.budgetPerTx = snapshot.transactions > 0 ? snapshot.budget / snapshot.transactions : snapshot.budget;
    }
    // Avoid returning empty snapshots for zero budget and zero spend across all months
    if (snapshot.budget > 0 || snapshot.spent > 0) {
      result.push({ ...snapshot });
    }
  });

  return result.sort((a, b) => {
    if (a.month === b.month) {
      return a.categoryId - b.categoryId;
    }
    return a.month.localeCompare(b.month);
  });
}

export async function trainBudgetInsights(snapshots: BudgetSnapshot[]): Promise<BudgetInsightsPayload> {
  if (!snapshots.length) {
    throw new Error('No budget snapshots available for training.');
  }

  if (Platform.OS !== 'ios') {
    throw new Error('Apple on-device training is only supported on iOS.');
  }

  const module = BudgetInsightsModule;
  if (!module?.trainBudgetModels) {
    throw new Error('BudgetInsightsModule is not available. Ensure native build completed.');
  }

  return module.trainBudgetModels(snapshots);
}

function buildMonthSequence(monthsBack: number): string[] {
  const now = new Date();
  const months: string[] = [];
  for (let i = monthsBack - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const formatted = formatMonth(date.toISOString()) || formatByParts(date);
    if (formatted) {
      months.push(formatted);
    }
  }
  return months;
}

function formatMonth(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  return month;
}

function formatByParts(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function snapshotKey(categoryId: number, month: string) {
  return `${categoryId}:${month}`;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value === 'bigint') return Number(value);
  if (value instanceof Number) return value.valueOf();
  if (value instanceof Object && 'toString' in (value as any)) {
    const parsed = parseFloat((value as any).toString());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}
