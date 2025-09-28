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

export interface SavingsGoal {
  id?: number;
  userId: number;
  name: string;
  targetAmount: string; // Stored as TEXT for decimal support
  currentAmount: string; // Stored as TEXT for decimal support
  monthlyContribution?: string;
  startDate?: string | null;
  targetDate?: string | null;
  autoDeduct?: boolean;
  notes?: string | null;
  createdAt?: string;
}

export interface SavingsContribution {
  id?: number;
  savingsGoalId: number;
  userId: number;
  amount: string; // Stored as TEXT for decimal support
  contributedOn: string;
  sourceTransactionId?: number | null;
  notes?: string | null;
  createdAt?: string;
}

export interface Bill {
  id?: number;
  userId: number;
  categoryId?: number | null;
  name: string;
  amount: string; // Stored as TEXT for decimal support
  dueDay?: number | null; // Day of month 1-31
  autoPay?: boolean;
  notes?: string | null;
  lastPaidOn?: string | null;
  createdAt?: string;
}

export interface BillPayment {
  id?: number;
  billId: number;
  userId: number;
  amount: string;
  paidOn: string;
  notes?: string | null;
  createdAt?: string;
}

export interface Debt {
  id?: number;
  userId: number;
  name: string;
  totalAmount: string; // Stored as TEXT for decimal support
  currentBalance: string; // Stored as TEXT for decimal support
  interestRate?: string | null; // Percentage as TEXT for precision
  minimumPayment?: string | null;
  dueDay?: number | null;
  categoryId?: number | null;
  notes?: string | null;
  createdAt?: string;
}

export interface DebtPayment {
  id?: number;
  debtId: number;
  userId: number;
  amount: string;
  paidOn: string;
  notes?: string | null;
  categoryId?: number | null;
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

export interface InsertSavingsGoal {
  userId: number;
  name: string;
  targetAmount: string;
  currentAmount?: string;
  monthlyContribution?: string;
  startDate?: string | null;
  targetDate?: string | null;
  autoDeduct?: boolean;
  notes?: string | null;
}

export interface InsertSavingsContribution {
  savingsGoalId: number;
  userId: number;
  amount: string;
  contributedOn: string;
  sourceTransactionId?: number | null;
  notes?: string | null;
}

export interface InsertBill {
  userId: number;
  name: string;
  amount: string;
  categoryId?: number | null;
  dueDay?: number | null;
  autoPay?: boolean;
  notes?: string | null;
  lastPaidOn?: string | null;
}

export interface InsertBillPayment {
  billId: number;
  userId: number;
  amount: string;
  paidOn: string;
  notes?: string | null;
}

export interface InsertDebt {
  userId: number;
  name: string;
  totalAmount: string;
  currentBalance?: string;
  interestRate?: string | null;
  minimumPayment?: string | null;
  dueDay?: number | null;
  categoryId?: number | null;
  notes?: string | null;
}

export interface InsertDebtPayment {
  debtId: number;
  userId: number;
  amount: string;
  paidOn: string;
  notes?: string | null;
  categoryId?: number | null;
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
  | 'settings'
  | 'savingsGoals'
  | 'savingsContributions'
  | 'bills'
  | 'billPayments'
  | 'debts'
  | 'debtPayments';

// Helper type for transaction types
export type TransactionType = 'income' | 'expense';

// Helper type for account types
export type AccountType = 'checking' | 'savings' | 'credit';
