// Base entity interfaces
export interface User {
  id?: number;
  username: string;
  password: string;
  email: string;
  avatar?: string | null;
  createdAt?: string;
}

export interface Category {
  id?: number;
  name: string;
  icon: string;
  color: string;
  budget: string; // SQLite stores as TEXT
  userId: number;
}

export interface Transaction {
  id?: number;
  description: string;
  amount: string; // SQLite stores decimals as TEXT
  type: 'income' | 'expense';
  categoryId?: number | null;
  userId: number;
  date: string; // SQLite stores timestamps as TEXT
  aiCategorized?: boolean;
  createdAt?: string;
}

export interface Budget {
  id?: number;
  userId: number;
  categoryId: number;
  amount: string; // SQLite stores decimals as TEXT
  period: 'weekly' | 'monthly' | 'yearly';
  createdAt?: string;
}

export interface Insight {
  id?: number;
  userId: number;
  type: 'alert' | 'suggestion' | 'trend';
  title: string;
  description: string;
  category?: string;
  severity: 'info' | 'warning' | 'error';
  createdAt?: string;
}

export interface BankAccount {
  id?: number;
  userId: number;
  institutionId: string;
  institutionName: string;
  accountId: string;
  accountName: string;
  accountType: 'checking' | 'savings' | 'credit';
  accountSubtype?: string;
  mask?: string;
  isActive?: boolean;
  lastSyncAt?: string;
  accessToken: string;
  createdAt?: string;
}

export interface SyncHistory {
  id?: number;
  bankAccountId: number;
  syncedAt?: string;
  transactionsImported?: number;
  status: 'success' | 'error' | 'partial';
  errorMessage?: string;
}

export interface Achievement {
  id?: number;
  userId?: number;
  type: string; // budget_keeper, streak_master, saver, etc.
  title: string;
  description: string;
  icon: string;
  points?: number;
  unlockedAt?: string;
  metadata?: string; // JSON string for additional data
}

export interface UserStats {
  id?: number;
  userId: number;
  totalPoints?: number;
  level?: number;
  currentStreak?: number;
  longestStreak?: number;
  lastActivityDate?: string;
  budgetKeptDays?: number;
  savingsGoalsMet?: number;
  challengesCompleted?: number;
  updatedAt?: string;
}

export interface Challenge {
  id?: number;
  userId?: number;
  type: 'daily' | 'weekly' | 'monthly';
  title: string;
  description: string;
  target: number; // target value (amount, days, etc.)
  progress?: number;
  points?: number;
  status?: 'active' | 'completed' | 'expired';
  expiresAt: string;
  completedAt?: string;
  createdAt?: string;
}

// Insert types (for creating new items - omit id and auto-generated fields)
export interface InsertUser {
  username: string;
  password: string;
  email: string;
  avatar?: string | null;
}

export interface InsertCategory {
  name: string;
  icon: string;
  color: string;
  budget?: string;
  userId: number;
}

export interface InsertTransaction {
  description: string;
  amount: string;
  type: 'income' | 'expense';
  categoryId?: number | null;
  userId: number;
  date: string;
}

export interface InsertBudget {
  userId: number;
  categoryId: number;
  amount: string;
  period?: 'weekly' | 'monthly' | 'yearly';
}

export interface InsertInsight {
  userId: number;
  type: 'alert' | 'suggestion' | 'trend';
  title: string;
  description: string;
  category?: string;
  severity?: 'info' | 'warning' | 'error';
}

export interface InsertBankAccount {
  userId: number;
  institutionId: string;
  institutionName: string;
  accountId: string;
  accountName: string;
  accountType: 'checking' | 'savings' | 'credit';
  accountSubtype?: string;
  mask?: string;
  isActive?: boolean;
  accessToken: string;
}

export interface InsertSyncHistory {
  bankAccountId: number;
  transactionsImported?: number;
  status: 'success' | 'error' | 'partial';
  errorMessage?: string;
}

export interface InsertAchievement {
  userId?: number;
  type: string;
  title: string;
  description: string;
  icon: string;
  points?: number;
  metadata?: string;
}

export interface InsertUserStats {
  userId: number;
  totalPoints?: number;
  level?: number;
  currentStreak?: number;
  longestStreak?: number;
  lastActivityDate?: string;
  budgetKeptDays?: number;
  savingsGoalsMet?: number;
  challengesCompleted?: number;
}

export interface InsertChallenge {
  userId?: number;
  type: 'daily' | 'weekly' | 'monthly';
  title: string;
  description: string;
  target: number;
  progress?: number;
  points?: number;
  status?: 'active' | 'completed' | 'expired';
  expiresAt: string;
}

// Dashboard summary type
export interface CategoryBreakdownItem {
  id: number;
  name: string;
  icon: string;
  color: string;
  budget: number;
  spent: number;
  percentage: number;
}

export interface DashboardSummary {
  totalExpenses: number;
  totalIncome: number;
  totalBudget: number;
  remainingBudget: number;
  categoryBreakdown: CategoryBreakdownItem[];
}

// Helper type for table names
export type TableName =
  | 'transactions'
  | 'categories'
  | 'insights'
  | 'bankAccounts'
  | 'user'
  | 'settings';

// Helper type for transaction types
export type TransactionType = 'income' | 'expense';

// Helper type for account types
export type AccountType = 'checking' | 'savings' | 'credit';
