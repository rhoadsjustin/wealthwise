import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { setDataContext } from '@/lib/api';
import { localStorage } from '@/lib/local-storage';
import type { InsightsMessage as StoredInsightsMessage } from '@/lib/schema/schema';

const debugLog = (...args: unknown[]) => {
  if (__DEV__) {
    console.log(...args);
  }
};

// Re-export interfaces from api.ts for consistency
export interface DashboardSummary {
  totalIncome: number;
  totalExpenses: number;
  totalBudget: number;
  remainingBudget: number;
  totalSavingsPlanned: number;
  totalSavingsProgress: number;
  netIncomeAfterSavings: number;
  incomeBaseline: number;
  incomeRemaining: number;
  actualIncome: number;
  monthlyIncome: number | null;
  categoryBreakdown: CategoryBreakdown[];
  savingsGoals: SavingsGoalSummary[];
  recentTransactions: Transaction[];
}

export interface CategoryBreakdown {
  id: number;
  name: string;
  icon: string;
  color: string;
  budget: number;
  spent: number;
  percentage: number;
  incomeShare: number;
  incomeWarning: boolean;
}

export interface Transaction {
  id: number;
  description: string;
  amount: string;
  type: 'income' | 'expense';
  categoryId: number | null;
  userId: number;
  date: string;
  createdAt: string;
  aiCategorized?: number;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
  budget: string;
  userId: number;
}

export interface SavingsGoal {
  id: number;
  userId: number;
  name: string;
  targetAmount: string;
  currentAmount: string;
  monthlyContribution?: string | null;
  startDate?: string | null;
  targetDate?: string | null;
  autoDeduct?: boolean;
  notes?: string | null;
  createdAt: string;
}

export interface SavingsContribution {
  id: number;
  savingsGoalId: number;
  userId: number;
  amount: string;
  contributedOn: string;
  sourceTransactionId?: number | null;
  notes?: string | null;
  createdAt: string;
}

export interface SavingsGoalSummary {
  id: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  progress: number;
  monthlyContribution: number;
  targetDate?: string | null;
  autoDeduct: boolean;
}

export interface User {
  id: number;
  username: string;
  password: string;
  email: string;
  avatar?: string;
  createdAt: string;
}

export interface Insight {
  id: number;
  userId: number;
  type: 'alert' | 'suggestion' | 'trend';
  title: string;
  description: string;
  category?: string;
  severity: 'info' | 'warning' | 'error';
  createdAt: string;
}

export type InsightsMessage = StoredInsightsMessage;

export interface BankAccount {
  id: number;
  userId: number;
  institutionId: string;
  institutionName: string;
  accountId: string;
  accountName: string;
  accountType: string;
  accountSubtype?: string;
  mask?: string;
  isActive?: boolean;
  lastSyncAt?: string;
  accessToken: string;
  createdAt: string;
}

export interface Bill {
  id: number;
  userId: number;
  categoryId: number | null;
  name: string;
  amount: string;
  dueDay: number | null;
  autoPay: boolean;
  notes?: string | null;
  lastPaidOn?: string | null;
  createdAt: string;
}

export interface BillPayment {
  id: number;
  billId: number;
  userId: number;
  amount: string;
  paidOn: string;
  notes?: string | null;
  createdAt: string;
}

export interface Debt {
  id: number;
  userId: number;
  name: string;
  totalAmount: string;
  currentBalance: string;
  interestRate?: string | null;
  minimumPayment?: string | null;
  dueDay?: number | null;
  categoryId?: number | null;
  notes?: string | null;
  createdAt: string;
}

export interface DebtPayment {
  id: number;
  debtId: number;
  userId: number;
  amount: string;
  paidOn: string;
  notes?: string | null;
  categoryId?: number | null;
  createdAt: string;
}

interface DataContextType {
  // Data state
  isLoading: boolean;
  isInitialized: boolean;
  currentUserId: number;
  dataVersion: number;
  monthlyIncome: number | null;

  // Dashboard
  getDashboardSummary: () => Promise<DashboardSummary>;
  refreshDashboard: () => Promise<void>;
  getMonthlyIncome: () => Promise<number | null>;
  updateMonthlyIncome: (value: number | null) => Promise<void>;

  // User
  getUserProfile: () => Promise<User>;
  updateUserProfile: (updates: Partial<User>) => Promise<User>;

  // Categories
  getCategories: () => Promise<Category[]>;
  createCategory: (data: Omit<Category, 'id' | 'userId'>) => Promise<Category>;
  updateCategory: (id: number, updates: Partial<Category>) => Promise<Category>;
  deleteCategory: (id: number) => Promise<{ success: boolean }>;
  updateCategoriesBudgets: (budgetCategories: { name: string; budget: string }[]) => Promise<void>;

  // Savings goals
  getSavingsGoals: () => Promise<SavingsGoal[]>;
  createSavingsGoal: (data: {
    name: string;
    targetAmount: string;
    monthlyContribution?: string;
    startDate?: string | null;
    targetDate?: string | null;
    autoDeduct?: boolean;
    notes?: string | null;
  }) => Promise<SavingsGoal>;
  updateSavingsGoal: (id: number, updates: Partial<SavingsGoal>) => Promise<SavingsGoal>;
  deleteSavingsGoal: (id: number) => Promise<{ success: boolean }>;
  recordSavingsContribution: (
    goalId: number,
    data: {
      amount: string;
      contributedOn?: string;
      sourceTransactionId?: number | null;
      notes?: string | null;
    }
  ) => Promise<SavingsGoal>;
  getSavingsContributions: (goalId: number) => Promise<SavingsContribution[]>;

  // Transactions
  getTransactions: () => Promise<Transaction[]>;
  createTransaction: (data: {
    description: string;
    amount: string;
    type: 'income' | 'expense';
    categoryId?: number | null;
    date?: string;
  }) => Promise<Transaction>;
  updateTransaction: (id: number, data: Partial<Transaction>) => Promise<Transaction>;
  deleteTransaction: (id: number) => Promise<{ success: boolean }>;

  // Insights
  getInsights: () => Promise<Insight[]>;
  generateInsights: () => Promise<{ insights: Insight[] }>;
  getInsightsThread: () => Promise<InsightsMessage[]>;
  saveInsightsThread: (messages: InsightsMessage[]) => Promise<void>;
  clearInsightsThread: () => Promise<void>;

  // Bank Accounts
  getBankAccounts: () => Promise<BankAccount[]>;
  createBankAccount: (
    data: Omit<BankAccount, 'id' | 'userId' | 'createdAt'>
  ) => Promise<BankAccount>;
  updateBankAccount: (id: number, updates: Partial<BankAccount>) => Promise<BankAccount>;
  deleteBankAccount: (id: number) => Promise<{ success: boolean }>;

  // Bills
  getBills: () => Promise<Bill[]>;
  createBill: (data: {
    name: string;
    amount: string;
    categoryId: number;
    dueDay?: number | null;
    autoPay?: boolean;
    notes?: string | null;
  }) => Promise<Bill>;
  updateBill: (id: number, updates: Partial<Bill>) => Promise<Bill>;
  deleteBill: (id: number) => Promise<{ success: boolean }>;
  markBillPaid: (
    id: number,
    payment?: {
      amount?: string;
      paidOn?: string;
      notes?: string | null;
    }
  ) => Promise<Bill>;
  getBillPayments: (billId: number) => Promise<BillPayment[]>;

  // Debts
  getDebts: () => Promise<Debt[]>;
  createDebt: (data: {
    name: string;
    totalAmount: string;
    currentBalance?: string;
    interestRate?: string | null;
    minimumPayment?: string | null;
    dueDay?: number | null;
    categoryId?: number | null;
    notes?: string | null;
  }) => Promise<Debt>;
  updateDebt: (id: number, updates: Partial<Debt>) => Promise<Debt>;
  deleteDebt: (id: number) => Promise<{ success: boolean }>;
  recordDebtPayment: (
    debtId: number,
    payment: {
      amount: string;
      paidOn?: string;
      notes?: string | null;
      categoryId?: number | null;
    }
  ) => Promise<Debt>;
  getDebtPayments: (debtId: number) => Promise<DebtPayment[]>;

  // Utility methods
  refreshAllData: () => Promise<void>;
  clearAllData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

interface DataProviderProps {
  children: React.ReactNode;
  userId?: number;
  initialBudgetCategories?: { name: string; budget: string }[] | null;
}

export function DataProvider({
  children,
  userId = 1,
  initialBudgetCategories = null,
}: DataProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentUserId] = useState(userId);
  const [dataVersion, setDataVersion] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState<number | null>(null);
  const bumpVersion = useCallback(() => setDataVersion((v) => v + 1), []);

  // Development/demo seed flag (set via EXPO_PUBLIC_SEED_DEMO="true|1" for local/dev)
  // Defaults to false for TestFlight/production to avoid seeding demo data
  const DEVELOPMENT_MODE =
    (typeof process !== 'undefined' &&
      typeof process.env !== 'undefined' &&
      (process.env.EXPO_PUBLIC_SEED_DEMO === 'true' ||
        process.env.EXPO_PUBLIC_SEED_DEMO === '1')) ||
    false;

  const normalizeSavingsGoal = useCallback((goal: any): SavingsGoal => {
    if (!goal) {
      throw new Error('Invalid savings goal record');
    }

    return {
      id: goal.id,
      userId: goal.userId,
      name: goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      monthlyContribution: goal.monthlyContribution ?? null,
      startDate: goal.startDate ?? null,
      targetDate: goal.targetDate ?? null,
      notes: goal.notes ?? null,
      autoDeduct: goal.autoDeduct === 1 || goal.autoDeduct === true,
      createdAt: goal.createdAt ?? new Date().toISOString(),
    };
  }, []);

  const normalizeSavingsContribution = useCallback((contribution: any): SavingsContribution => {
    if (!contribution) {
      throw new Error('Invalid savings contribution record');
    }

    return {
      id: contribution.id,
      savingsGoalId: contribution.savingsGoalId,
      userId: contribution.userId,
      amount: contribution.amount,
      contributedOn: contribution.contributedOn,
      sourceTransactionId:
        contribution.sourceTransactionId === null || contribution.sourceTransactionId === undefined
          ? null
          : contribution.sourceTransactionId,
      notes: contribution.notes ?? null,
      createdAt: contribution.createdAt ?? new Date().toISOString(),
    };
  }, []);

  const normalizeBill = useCallback((bill: any): Bill => {
    if (!bill) {
      throw new Error('Invalid bill record');
    }

    const dueDayValue =
      bill.dueDay === null || bill.dueDay === undefined ? null : Number(bill.dueDay);

    return {
      id: bill.id,
      userId: bill.userId,
      categoryId: bill.categoryId ?? null,
      name: bill.name,
      amount: bill.amount,
      dueDay: Number.isFinite(dueDayValue) ? dueDayValue : null,
      autoPay: bill.autoPay === 1 || bill.autoPay === true,
      notes: bill.notes ?? null,
      lastPaidOn: bill.lastPaidOn ?? null,
      createdAt: bill.createdAt ?? new Date().toISOString(),
    };
  }, []);

  const normalizeBillPayment = useCallback((payment: any): BillPayment => {
    if (!payment) {
      throw new Error('Invalid bill payment record');
    }

    return {
      id: payment.id,
      billId: payment.billId,
      userId: payment.userId,
      amount: payment.amount,
      paidOn: payment.paidOn,
      notes: payment.notes ?? null,
      createdAt: payment.createdAt ?? new Date().toISOString(),
    };
  }, []);

  const normalizeDebt = useCallback((debt: any): Debt => {
    if (!debt) {
      throw new Error('Invalid debt record');
    }

    const dueDayValue =
      debt.dueDay === null || debt.dueDay === undefined ? null : Number(debt.dueDay);

    return {
      id: debt.id,
      userId: debt.userId,
      name: debt.name,
      totalAmount: debt.totalAmount,
      currentBalance: debt.currentBalance ?? debt.totalAmount,
      interestRate: debt.interestRate ?? null,
      minimumPayment: debt.minimumPayment ?? null,
      dueDay: Number.isFinite(dueDayValue) ? dueDayValue : null,
      categoryId: debt.categoryId ?? null,
      notes: debt.notes ?? null,
      createdAt: debt.createdAt ?? new Date().toISOString(),
    };
  }, []);

  const normalizeDebtPayment = useCallback((payment: any): DebtPayment => {
    if (!payment) {
      throw new Error('Invalid debt payment record');
    }

    return {
      id: payment.id,
      debtId: payment.debtId,
      userId: payment.userId,
      amount: payment.amount,
      paidOn: payment.paidOn,
      notes: payment.notes ?? null,
      categoryId: payment.categoryId ?? null,
      createdAt: payment.createdAt ?? new Date().toISOString(),
    };
  }, []);

  // Initialize local storage on mount
  useEffect(() => {
    const initializeDemoData = async () => {
      debugLog('🔄 Initializing demo data...');
      const demoCategories: Omit<Category, 'id'>[] = [
        {
          name: 'Housing',
          icon: '🏠',
          color: '#8BC34A',
          budget: '1500',
          userId: currentUserId,
        },
        {
          name: 'Utilities',
          icon: '💡',
          color: '#FFA07A',
          budget: '250',
          userId: currentUserId,
        },
        {
          name: 'Insurance',
          icon: '🛡️',
          color: '#795548',
          budget: '200',
          userId: currentUserId,
        },
        {
          name: 'Cell Phone',
          icon: '📱',
          color: '#673AB7',
          budget: '80',
          userId: currentUserId,
        },
        {
          name: 'Gas',
          icon: '⛽',
          color: '#FF9800',
          budget: '200',
          userId: currentUserId,
        },
      ];

      debugLog(`📁 Creating ${demoCategories.length} demo categories...`);
      for (const category of demoCategories) {
        const newCategory = {
          ...category,
          // Don't pre-generate ID, let the database handle it
        };
        debugLog('💾 Saving category:', newCategory.name);
        await localStorage.saveItem('categories', newCategory);
      }
      debugLog('✅ Demo categories created');

      // Verify categories were saved
      const savedCategories = await localStorage.getItems<Category>('categories', currentUserId);
      debugLog('🔍 Verified saved categories:', savedCategories.length);
      const categoryLookup = new Map(
        savedCategories.map((category) => [category.name, category.id])
      );

      // Also check all categories in the table (debug)
      const allCategories = await localStorage.getAllItems<Category>('categories');
      debugLog('🔍 All categories in database:', allCategories.length);

      // Add some demo transactions
      const demoTransactions: Omit<Transaction, 'id'>[] = [
        {
          description: 'Grocery shopping',
          amount: '85.50',
          type: 'expense' as const,
          categoryId: null,
          userId: currentUserId,
          date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          description: 'Salary payment',
          amount: '3500.00',
          type: 'income' as const,
          categoryId: null,
          userId: currentUserId,
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          description: 'Coffee and lunch',
          amount: '24.75',
          type: 'expense' as const,
          categoryId: null,
          userId: currentUserId,
          date: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
        },
      ];

      debugLog(`💰 Creating ${demoTransactions.length} demo transactions...`);
      for (const transaction of demoTransactions) {
        const newTransaction = {
          ...transaction,
          // Don't pre-generate ID, let the database handle it
        };
        debugLog('💾 Saving transaction:', newTransaction.description);
        await localStorage.saveItem('transactions', newTransaction);
      }
      debugLog('✅ Demo transactions created');

      // Verify transactions were saved
      const savedTransactions = await localStorage.getItems<Transaction>(
        'transactions',
        currentUserId
      );
      debugLog('🔍 Verified saved transactions:', savedTransactions.length);

      // Also check all transactions in the table (debug)
      const allTransactions = await localStorage.getAllItems<Transaction>('transactions');
      debugLog('🔍 All transactions in database:', allTransactions.length);

      // Add some demo bank accounts
      const demoBankAccounts: Omit<BankAccount, 'id'>[] = [
        {
          userId: currentUserId,
          institutionId: 'ins_1',
          institutionName: 'Chase Bank',
          accountId: 'acc_checking_1',
          accountName: 'Chase Total Checking',
          accountType: 'checking',
          accountSubtype: 'checking',
          mask: '1234',
          isActive: true,
          lastSyncAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          accessToken: 'demo_access_token_1',
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          userId: currentUserId,
          institutionId: 'ins_2',
          institutionName: 'Wells Fargo',
          accountId: 'acc_savings_1',
          accountName: 'WF Way2Save Savings',
          accountType: 'savings',
          accountSubtype: 'savings',
          mask: '5678',
          isActive: true,
          lastSyncAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          accessToken: 'demo_access_token_2',
          createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];

      debugLog(`🏦 Creating ${demoBankAccounts.length} demo bank accounts...`);
      for (const bankAccount of demoBankAccounts) {
        const newBankAccount = {
          ...bankAccount,
          // Don't pre-generate ID, let the database handle it
        };
        await localStorage.saveItem('bankAccounts', newBankAccount);
      }
      debugLog('✅ Demo bank accounts created');

      const demoSavingsGoals: Omit<SavingsGoal, 'id'>[] = [
        {
          userId: currentUserId,
          name: 'Emergency Fund',
          targetAmount: '5000',
          currentAmount: '1200',
          monthlyContribution: '250',
          startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          targetDate: new Date(Date.now() + 10 * 30 * 24 * 60 * 60 * 1000).toISOString(),
          autoDeduct: true,
          notes: 'Build cushion for unexpected expenses.',
          createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          userId: currentUserId,
          name: 'Vacation',
          targetAmount: '3000',
          currentAmount: '800',
          monthlyContribution: '150',
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          targetDate: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString(),
          autoDeduct: false,
          notes: 'Summer getaway fund.',
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];

      for (const goal of demoSavingsGoals) {
        await localStorage.saveItem('savingsGoals', {
          ...goal,
          autoDeduct: goal.autoDeduct ? 1 : 0,
        });
      }

      const savedGoals = await localStorage.getItems('savingsGoals', currentUserId);
      debugLog('💰 Demo savings goals created:', savedGoals.length);

      const demoBills = [
        {
          name: 'Rent',
          amount: '1500',
          categoryName: 'Housing',
          dueDay: 1,
          autoPay: true,
          notes: 'Auto-draft on the 1st.',
        },
        {
          name: 'Electric',
          amount: '120.45',
          categoryName: 'Utilities',
          dueDay: 12,
          autoPay: false,
          notes: 'Average monthly bill.',
        },
      ];

      for (const bill of demoBills) {
        await localStorage.saveItem('bills', {
          userId: currentUserId,
          name: bill.name,
          amount: bill.amount,
          categoryId: categoryLookup.get(bill.categoryName) ?? null,
          dueDay: bill.dueDay,
          autoPay: bill.autoPay ? 1 : 0,
          notes: bill.notes,
          lastPaidOn: null,
          createdAt: new Date().toISOString(),
        });
      }

      type StoredBillRecord = Omit<Bill, 'autoPay'> & { autoPay: number | boolean };
      const savedBills = await localStorage.getItems<StoredBillRecord>('bills', currentUserId);
      debugLog('📄 Demo bills created:', savedBills.length);

      if (savedBills.length > 0) {
        const firstBill = savedBills[0];
        const paidOn = new Date().toISOString().split('T')[0];
        await localStorage.saveItem('billPayments', {
          billId: firstBill.id,
          userId: currentUserId,
          amount: firstBill.amount,
          paidOn,
          notes: 'Demo payment entry',
        });
        const seededAutoPay = firstBill.autoPay === 1 || firstBill.autoPay === true ? 1 : 0;
        await localStorage.saveItem('bills', {
          ...firstBill,
          lastPaidOn: paidOn,
          autoPay: seededAutoPay,
        });
      }

      const demoDebts = [
        {
          name: 'Credit Card',
          totalAmount: '2400',
          currentBalance: '1800',
          interestRate: '19.99',
          minimumPayment: '80',
          dueDay: 21,
          categoryName: 'Insurance',
          notes: 'Focus on paying down aggressively.',
        },
        {
          name: 'Student Loan',
          totalAmount: '15000',
          currentBalance: '12500',
          interestRate: '4.25',
          minimumPayment: '150',
          dueDay: 5,
          categoryName: 'Gas',
          notes: 'Eligible for autopay discount.',
        },
      ];

      for (const debt of demoDebts) {
        await localStorage.saveItem('debts', {
          userId: currentUserId,
          name: debt.name,
          totalAmount: debt.totalAmount,
          currentBalance: debt.currentBalance,
          interestRate: debt.interestRate,
          minimumPayment: debt.minimumPayment,
          dueDay: debt.dueDay,
          categoryId: categoryLookup.get(debt.categoryName) ?? null,
          notes: debt.notes,
          createdAt: new Date().toISOString(),
        });
      }

      type StoredDebtRecord = Debt & { categoryId?: number | null };
      const savedDebts = await localStorage.getItems<StoredDebtRecord>('debts', currentUserId);
      debugLog('📉 Demo debts created:', savedDebts.length);

      if (savedDebts.length > 0) {
        const firstDebt = savedDebts[0];
        const paidOn = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        await localStorage.saveItem('debtPayments', {
          debtId: firstDebt.id,
          userId: currentUserId,
          amount: '200',
          paidOn,
          notes: 'Demo payment',
          categoryId: firstDebt.categoryId ?? null,
        });
        const reducedBalance = Math.max(parseFloat(firstDebt.currentBalance) - 200, 0).toFixed(2);
        await localStorage.saveItem('debts', {
          ...firstDebt,
          currentBalance: reducedBalance,
        });
      }

      debugLog('🎉 All demo data initialization complete!');
    };
    // Seed only starter categories (no transactions/accounts) for production/real users
    const initializeStarterCategories = async () => {
      debugLog('🔄 Initializing starter categories...');
      const starterCategories: Omit<Category, 'id'>[] = [
        { name: 'Housing', icon: '🏠', color: '#8BC34A', budget: '0', userId: currentUserId },
        { name: 'Utilities', icon: '💡', color: '#FFA07A', budget: '0', userId: currentUserId },
        { name: 'Insurance', icon: '🛡️', color: '#795548', budget: '0', userId: currentUserId },
        { name: 'Cell Phone', icon: '📱', color: '#673AB7', budget: '0', userId: currentUserId },
        { name: 'Gas', icon: '⛽', color: '#FF9800', budget: '0', userId: currentUserId },
      ];

      for (const category of starterCategories) {
        await localStorage.saveItem('categories', category);
      }
      debugLog('✅ Starter categories created');

      const savedCategories = await localStorage.getItems<Category>('categories', currentUserId);
      debugLog('🔍 Verified saved starter categories:', savedCategories.length);
    };
    const initializeStorage = async () => {
      try {
        debugLog('🔄 Initializing local storage...');
        await localStorage.init();
        debugLog('✅ Local storage initialized');

        // Test database connection
        try {
          const testResult = await localStorage.query(
            "SELECT name FROM sqlite_master WHERE type='table'"
          );
          debugLog(
            '🔍 Tables in database:',
            testResult.map((row: any) => row.name)
          );
        } catch (error) {
          console.error('❌ Error checking database tables:', error);
        }

        if (DEVELOPMENT_MODE) {
          // DEVELOPMENT MODE: Clear all existing data and reinitialize
          debugLog('🔧 Development mode: Clearing all data and reinitializing...');

          // Clear all data stores
          await Promise.all([
            localStorage.clearStore('user'),
            localStorage.clearStore('categories'),
            localStorage.clearStore('transactions'),
            localStorage.clearStore('insights'),
            localStorage.clearStore('bankAccounts'),
            localStorage.clearStore('savingsGoals'),
            localStorage.clearStore('savingsContributions'),
            localStorage.clearStore('bills'),
            localStorage.clearStore('billPayments'),
            localStorage.clearStore('debts'),
            localStorage.clearStore('debtPayments'),
          ]);

          // No query cache to clear (react-query removed)

          // Create local user (let DB assign ID)
          const localUserNoId: Omit<User, 'id'> = {
            username: 'local_user',
            password: 'local_password',
            email: 'local@example.com',
            createdAt: new Date().toISOString(),
          } as any;
          await localStorage.saveItem('user', localUserNoId as any);

          // Always reinitialize demo data
          await initializeDemoData();

          debugLog('✅ Demo data reinitialized successfully');
        } else {
          // PRODUCTION MODE: Only initialize minimal data if none exists
          debugLog('🚀 Production mode: Checking for existing data...');

          // Check if we have a user, if not create a demo user
          const existingUser = await localStorage.getItem('user', currentUserId);
          if (!existingUser) {
            const localUserNoId: Omit<User, 'id'> = {
              username: 'local_user',
              password: 'local_password',
              email: 'local@example.com',
              createdAt: new Date().toISOString(),
            } as any;
            await localStorage.saveItem('user', localUserNoId as any);
          }

          // Initialize with starter categories only if no data exists
          const existingCategories = await localStorage.getItems('categories', currentUserId);
          if (existingCategories.length === 0) {
            debugLog('No existing categories found — initializing starter categories');
            await initializeStarterCategories();
          } else {
            debugLog(`📊 Found ${existingCategories.length} existing categories`);
          }
        }

        setIsInitialized(true);

        try {
          const storedIncome = await localStorage.getSetting('monthlyIncome');
          if (storedIncome !== null && storedIncome !== undefined && storedIncome !== '') {
            const parsed = parseFloat(storedIncome);
            if (!Number.isNaN(parsed)) {
              setMonthlyIncome(parsed);
            }
          }
        } catch (incomeError) {
          console.warn('Failed to load stored monthly income:', incomeError);
        }
      } catch (error) {
        console.error('Failed to initialize data storage:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeStorage();
  }, [currentUserId, DEVELOPMENT_MODE]);

  const calculateDashboardSummary = useCallback(
    async (
      transactions: Transaction[],
      categories: Category[],
      savingsGoals: SavingsGoal[]
    ): Promise<DashboardSummary> => {
      const actualIncome = transactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const totalExpenses = transactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const totalBudget = categories.reduce((sum, c) => sum + parseFloat(c.budget), 0);

      const baselineIncome = monthlyIncome ?? actualIncome;

      const totalSavingsPlanned = savingsGoals.reduce((sum, goal) => {
        const monthlyContribution = parseFloat(goal.monthlyContribution ?? '0');
        return sum + (Number.isFinite(monthlyContribution) ? monthlyContribution : 0);
      }, 0);

      const totalSavingsProgress = savingsGoals.reduce((sum, goal) => {
        const current = parseFloat(goal.currentAmount ?? '0');
        return sum + (Number.isFinite(current) ? current : 0);
      }, 0);

      const netIncomeAfterSavings = baselineIncome - totalSavingsPlanned;

      const remainingBudget = totalBudget - totalExpenses;
      const incomeRemaining = baselineIncome - totalExpenses;

      // Calculate category breakdown
      const categoryBreakdown: CategoryBreakdown[] = categories.map((category) => {
        const spent = transactions
          .filter((t) => t.categoryId === category.id && t.type === 'expense')
          .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        const budget = parseFloat(category.budget);
        const percentage = budget > 0 ? (spent / budget) * 100 : 0;
        const incomeShare = baselineIncome > 0 ? spent / baselineIncome : 0;
        const incomeWarning = incomeShare >= 0.25;

        return {
          id: category.id,
          name: category.name,
          icon: category.icon,
          color: category.color,
          budget,
          spent,
          percentage,
          incomeShare,
          incomeWarning,
        };
      });

      const savingsGoalSummaries: SavingsGoalSummary[] = savingsGoals.map((goal) => {
        const targetAmount = parseFloat(goal.targetAmount ?? '0');
        const currentAmount = parseFloat(goal.currentAmount ?? '0');
        const monthlyContribution = parseFloat(goal.monthlyContribution ?? '0');
        const progress = targetAmount > 0 ? currentAmount / targetAmount : 0;

        return {
          id: goal.id,
          name: goal.name,
          targetAmount: Number.isFinite(targetAmount) ? targetAmount : 0,
          currentAmount: Number.isFinite(currentAmount) ? currentAmount : 0,
          progress: Number.isFinite(progress) ? Math.min(Math.max(progress, 0), 1) : 0,
          monthlyContribution: Number.isFinite(monthlyContribution) ? monthlyContribution : 0,
          targetDate: goal.targetDate ?? null,
          autoDeduct: Boolean(goal.autoDeduct),
        };
      });

      // Get recent transactions (last 10)
      const recentTransactions = transactions
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);

      return {
        totalIncome: baselineIncome,
        totalExpenses,
        totalBudget,
        remainingBudget,
        totalSavingsPlanned,
        totalSavingsProgress,
        netIncomeAfterSavings,
        incomeBaseline: baselineIncome,
        incomeRemaining,
        actualIncome,
        monthlyIncome: monthlyIncome ?? null,
        categoryBreakdown,
        savingsGoals: savingsGoalSummaries,
        recentTransactions,
      };
    },
    [monthlyIncome]
  );

  // Dashboard methods
  const getDashboardSummary = useCallback(async (): Promise<DashboardSummary> => {
    debugLog('🔍 getDashboardSummary called for userId:', currentUserId);

    try {
      const [transactions, categories, savingsGoalsRaw] = await Promise.all([
        localStorage.getItems<Transaction>('transactions', currentUserId),
        localStorage.getItems<Category>('categories', currentUserId),
        localStorage.getItems<any>('savingsGoals', currentUserId),
      ]);

      debugLog('📊 Data loaded:', {
        transactionCount: transactions.length,
        categoryCount: categories.length,
        savingsGoalCount: savingsGoalsRaw.length,
        transactions: transactions.slice(0, 2), // Log first 2 for debugging
        categories: categories.slice(0, 2), // Log first 2 for debugging
      });

      const savingsGoals = savingsGoalsRaw.map((goal: any) => normalizeSavingsGoal(goal));

      return calculateDashboardSummary(transactions, categories, savingsGoals);
    } catch (error) {
      console.error('❌ Error in getDashboardSummary:', error);
      throw error;
    }
  }, [currentUserId, calculateDashboardSummary, normalizeSavingsGoal]);

  const refreshDashboard = useCallback(async (): Promise<void> => {
    // No-op since we no longer use a query cache
    return Promise.resolve();
  }, []);

  // User methods
  const getUserProfile = useCallback(async (): Promise<User> => {
    // Attempt to get by configured ID
    let user = await localStorage.getItem<User>('user', currentUserId);
    if (user) return user;

    // Fallback: return first user if present
    const all = await localStorage.getAllItems<User>('user');
    if (all.length > 0) return all[0] as User;

    // As a last resort, create a local user
    const localUserNoId: Omit<User, 'id'> = {
      username: 'local_user',
      password: 'local_password',
      email: 'local@example.com',
      createdAt: new Date().toISOString(),
    } as any;
    const created = await localStorage.saveItem('user', localUserNoId as any);
    return created as User;
  }, [currentUserId]);

  const updateUserProfile = useCallback(
    async (updates: Partial<User>): Promise<User> => {
      const existing = await getUserProfile();
      const updated = { ...existing, ...updates };
      await localStorage.saveItem('user', updated);
      bumpVersion();
      return updated;
    },
    [getUserProfile, bumpVersion]
  );

  // Category methods
  const getCategories = useCallback(async (): Promise<Category[]> => {
    debugLog('🏷️ getCategories called for userId:', currentUserId);
    try {
      const categories = await localStorage.getItems<Category>('categories', currentUserId);
      debugLog('✅ Categories loaded:', categories.length, 'items');
      return categories;
    } catch (error) {
      console.error('❌ Error in getCategories:', error);
      throw error;
    }
  }, [currentUserId]);

  const createCategory = useCallback(
    async (data: Omit<Category, 'id' | 'userId'>): Promise<Category> => {
      // Prevent duplicate categories by name (case-insensitive) per user
      const existingForUser = await localStorage.getItems<Category>('categories', currentUserId);
      const normalizedName = data.name.trim().toLowerCase();
      const dup = existingForUser.find((c) => c.name.trim().toLowerCase() === normalizedName);
      if (dup) {
        throw new Error('CATEGORY_ALREADY_EXISTS');
      }

      const newCategory: Omit<Category, 'id'> = {
        ...data,
        userId: currentUserId,
      };

      const savedCategory = await localStorage.saveItem('categories', newCategory);
      bumpVersion();

      return savedCategory;
    },
    [currentUserId, bumpVersion]
  );

  const updateCategory = useCallback(
    async (id: number, updates: Partial<Category>): Promise<Category> => {
      const existing = await localStorage.getItem<Category>('categories', id);
      if (!existing) {
        throw new Error('Category not found');
      }

      const updated = { ...existing, ...updates };
      await localStorage.saveItem('categories', updated);
      bumpVersion();

      return updated;
    },
    [bumpVersion]
  );

  const deleteCategory = useCallback(
    async (id: number): Promise<{ success: boolean }> => {
      const bills = await localStorage.getItems<any>('bills', currentUserId);
      const debts = await localStorage.getItems<any>('debts', currentUserId);

      for (const bill of bills) {
        if (bill.categoryId === id) {
          await localStorage.saveItem('bills', {
            ...bill,
            categoryId: null,
          });
        }
      }

      for (const debt of debts) {
        if (debt.categoryId === id) {
          await localStorage.saveItem('debts', {
            ...debt,
            categoryId: null,
          });
        }
      }

      await localStorage.deleteItem('categories', id);
      bumpVersion();
      return { success: true };
    },
    [bumpVersion, currentUserId]
  );

  const updateCategoriesBudgets = useCallback(
    async (budgetCategories: { name: string; budget: string }[]): Promise<void> => {
      const categories = await getCategories();

      for (const budgetCategory of budgetCategories) {
        const category = categories.find((cat) => cat.name === budgetCategory.name);
        if (category) {
          await updateCategory(category.id, { budget: budgetCategory.budget });
        }
      }
    },
    [getCategories, updateCategory]
  );

  const getMonthlyIncome = useCallback(async (): Promise<number | null> => {
    try {
      const stored = await localStorage.getSetting('monthlyIncome');
      if (stored === null || stored === undefined || stored === '') {
        setMonthlyIncome(null);
        return null;
      }
      const parsed = parseFloat(stored);
      if (Number.isNaN(parsed)) {
        setMonthlyIncome(null);
        return null;
      }
      setMonthlyIncome(parsed);
      return parsed;
    } catch (error) {
      console.warn('Failed to get monthly income:', error);
      return null;
    }
  }, []);

  const updateMonthlyIncome = useCallback(
    async (value: number | null): Promise<void> => {
      try {
        if (value === null) {
          await localStorage.setSetting('monthlyIncome', null);
          setMonthlyIncome(null);
        } else {
          const normalized = Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
          await localStorage.setSetting('monthlyIncome', normalized);
          setMonthlyIncome(normalized);
        }
        bumpVersion();
      } catch (error) {
        console.error('Failed to update monthly income:', error);
        throw error;
      }
    },
    [bumpVersion]
  );

  // Savings goal methods
  const getSavingsGoals = useCallback(async (): Promise<SavingsGoal[]> => {
    const results = await localStorage.getItems<any>('savingsGoals', currentUserId);
    const normalized = results.map((goal: any) => normalizeSavingsGoal(goal));
    return normalized.sort((a, b) => {
      const dateA = a.targetDate ? new Date(a.targetDate).getTime() : Infinity;
      const dateB = b.targetDate ? new Date(b.targetDate).getTime() : Infinity;
      return dateA - dateB;
    });
  }, [currentUserId, normalizeSavingsGoal]);

  const createSavingsGoal = useCallback(
    async (data: {
      name: string;
      targetAmount: string;
      monthlyContribution?: string;
      startDate?: string | null;
      targetDate?: string | null;
      autoDeduct?: boolean;
      notes?: string | null;
    }): Promise<SavingsGoal> => {
      const newGoal = {
        userId: currentUserId,
        name: data.name,
        targetAmount: data.targetAmount,
        currentAmount: '0',
        monthlyContribution: data.monthlyContribution ?? null,
        startDate: data.startDate ?? null,
        targetDate: data.targetDate ?? null,
        notes: data.notes ?? null,
        autoDeduct: data.autoDeduct ? 1 : 0,
        createdAt: new Date().toISOString(),
      };

      const saved = await localStorage.saveItem('savingsGoals', newGoal as any);
      bumpVersion();
      return normalizeSavingsGoal(saved);
    },
    [bumpVersion, currentUserId, normalizeSavingsGoal]
  );

  const updateSavingsGoal = useCallback(
    async (id: number, updates: Partial<SavingsGoal>): Promise<SavingsGoal> => {
      const existing = await localStorage.getItem<any>('savingsGoals', id);
      if (!existing) {
        throw new Error('Savings goal not found');
      }

      const currentGoal = normalizeSavingsGoal(existing);
      const nextGoal: SavingsGoal = {
        ...currentGoal,
        ...updates,
      };

      const record = {
        ...existing,
        name: nextGoal.name,
        targetAmount: nextGoal.targetAmount,
        currentAmount: nextGoal.currentAmount,
        monthlyContribution: nextGoal.monthlyContribution ?? null,
        startDate: nextGoal.startDate ?? null,
        targetDate: nextGoal.targetDate ?? null,
        notes: nextGoal.notes ?? null,
        autoDeduct: nextGoal.autoDeduct ? 1 : 0,
      };

      const saved = await localStorage.saveItem('savingsGoals', record);
      bumpVersion();
      return normalizeSavingsGoal(saved);
    },
    [bumpVersion, normalizeSavingsGoal]
  );

  const deleteSavingsGoal = useCallback(
    async (id: number): Promise<{ success: boolean }> => {
      const contributions = await localStorage.getItems<any>('savingsContributions', currentUserId);
      for (const contribution of contributions) {
        if (contribution.savingsGoalId === id && contribution.id) {
          await localStorage.deleteItem('savingsContributions', contribution.id);
        }
      }

      await localStorage.deleteItem('savingsGoals', id);
      bumpVersion();
      return { success: true };
    },
    [bumpVersion, currentUserId]
  );

  const recordSavingsContribution = useCallback(
    async (
      goalId: number,
      data: {
        amount: string;
        contributedOn?: string;
        sourceTransactionId?: number | null;
        notes?: string | null;
      }
    ): Promise<SavingsGoal> => {
      const goalRecord = await localStorage.getItem<any>('savingsGoals', goalId);
      if (!goalRecord) {
        throw new Error('Savings goal not found');
      }

      const normalizedGoal = normalizeSavingsGoal(goalRecord);
      const amountValue = parseFloat(data.amount);
      if (!Number.isFinite(amountValue)) {
        throw new Error('Invalid contribution amount');
      }

      const newCurrent = (parseFloat(normalizedGoal.currentAmount ?? '0') + amountValue).toFixed(2);

      await localStorage.saveItem('savingsContributions', {
        savingsGoalId: goalId,
        userId: currentUserId,
        amount: data.amount,
        contributedOn: data.contributedOn ?? new Date().toISOString().split('T')[0],
        sourceTransactionId: data.sourceTransactionId ?? null,
        notes: data.notes ?? null,
      });

      const updatedRecord = {
        ...goalRecord,
        currentAmount: newCurrent,
      };

      const saved = await localStorage.saveItem('savingsGoals', updatedRecord);
      bumpVersion();
      return normalizeSavingsGoal(saved);
    },
    [bumpVersion, currentUserId, normalizeSavingsGoal]
  );

  const getSavingsContributions = useCallback(
    async (goalId: number): Promise<SavingsContribution[]> => {
      const results = await localStorage.getItems<any>('savingsContributions', currentUserId);
      return results
        .filter((item) => item.savingsGoalId === goalId)
        .map((item) => normalizeSavingsContribution(item))
        .sort((a, b) => new Date(b.contributedOn).getTime() - new Date(a.contributedOn).getTime());
    },
    [currentUserId, normalizeSavingsContribution]
  );

  // Bill methods
  const getBills = useCallback(async (): Promise<Bill[]> => {
    const records = await localStorage.getItems<any>('bills', currentUserId);
    return records
      .map((record) => normalizeBill(record))
      .sort((a, b) => {
        const aValue = a.dueDay ?? 32;
        const bValue = b.dueDay ?? 32;
        return aValue - bValue;
      });
  }, [currentUserId, normalizeBill]);

  const createBill = useCallback(
    async (data: {
      name: string;
      amount: string;
      categoryId: number;
      dueDay?: number | null;
      autoPay?: boolean;
      notes?: string | null;
    }): Promise<Bill> => {
      const normalizedDueDay =
        data.dueDay === undefined || data.dueDay === null
          ? null
          : Math.min(Math.max(Math.round(data.dueDay), 1), 31);

      const newBill = {
        userId: currentUserId,
        name: data.name,
        amount: data.amount,
        categoryId: data.categoryId ?? null,
        dueDay: normalizedDueDay,
        autoPay: data.autoPay ? 1 : 0,
        notes: data.notes ?? null,
        lastPaidOn: null,
        createdAt: new Date().toISOString(),
      };

      const saved = await localStorage.saveItem('bills', newBill);
      bumpVersion();
      return normalizeBill(saved);
    },
    [bumpVersion, currentUserId, normalizeBill]
  );

  const updateBill = useCallback(
    async (id: number, updates: Partial<Bill>): Promise<Bill> => {
      const existing = await localStorage.getItem<any>('bills', id);
      if (!existing) {
        throw new Error('Bill not found');
      }

      const normalizedDueDay =
        updates.dueDay === undefined || updates.dueDay === null
          ? existing.dueDay
          : Math.min(Math.max(Math.round(updates.dueDay), 1), 31);

      const updatedRecord = {
        ...existing,
        ...updates,
        dueDay: normalizedDueDay,
        autoPay: updates.autoPay === undefined ? existing.autoPay : updates.autoPay ? 1 : 0,
        notes: updates.notes === undefined ? existing.notes : updates.notes,
      };

      const saved = await localStorage.saveItem('bills', updatedRecord);
      bumpVersion();
      return normalizeBill(saved);
    },
    [bumpVersion, normalizeBill]
  );

  const deleteBill = useCallback(
    async (id: number): Promise<{ success: boolean }> => {
      const payments = await localStorage.getItems<any>('billPayments', currentUserId);
      const related = payments.filter((payment) => payment.billId === id);
      for (const payment of related) {
        if (payment.id) {
          await localStorage.deleteItem('billPayments', payment.id);
        }
      }

      await localStorage.deleteItem('bills', id);
      bumpVersion();
      return { success: true };
    },
    [bumpVersion, currentUserId]
  );

  const markBillPaid = useCallback(
    async (
      id: number,
      payment?: {
        amount?: string;
        paidOn?: string;
        notes?: string | null;
      }
    ): Promise<Bill> => {
      const existing = await localStorage.getItem<any>('bills', id);
      if (!existing) {
        throw new Error('Bill not found');
      }

      const amount = payment?.amount ?? existing.amount;
      const paidOn = payment?.paidOn ?? new Date().toISOString().split('T')[0];

      await localStorage.saveItem('billPayments', {
        billId: id,
        userId: currentUserId,
        amount,
        paidOn,
        notes: payment?.notes ?? null,
      });

      const updatedRecord = {
        ...existing,
        lastPaidOn: paidOn,
      };

      const autoPayValue = existing.autoPay === 1 || existing.autoPay === true ? 1 : 0;

      await localStorage.saveItem('bills', {
        ...updatedRecord,
        autoPay: autoPayValue,
      });

      if (existing.categoryId) {
        const expenseTransaction = {
          description: `${existing.name} bill`,
          amount,
          type: 'expense' as const,
          categoryId: existing.categoryId,
          userId: currentUserId,
          date: paidOn,
          createdAt: new Date().toISOString(),
        };

        try {
          await localStorage.saveItem('transactions', expenseTransaction);
        } catch (error) {
          console.warn('Failed to record bill payment transaction', error);
        }
      }

      bumpVersion();
      return normalizeBill({ ...updatedRecord, autoPay: autoPayValue });
    },
    [bumpVersion, currentUserId, normalizeBill]
  );

  const getBillPayments = useCallback(
    async (billId: number): Promise<BillPayment[]> => {
      const results = await localStorage.getItems<any>('billPayments', currentUserId);
      return results
        .filter((item) => item.billId === billId)
        .map((item) => normalizeBillPayment(item))
        .sort((a, b) => new Date(b.paidOn).getTime() - new Date(a.paidOn).getTime());
    },
    [currentUserId, normalizeBillPayment]
  );

  // Debt methods
  const getDebts = useCallback(async (): Promise<Debt[]> => {
    const records = await localStorage.getItems<any>('debts', currentUserId);
    return records
      .map((record) => normalizeDebt(record))
      .sort((a, b) => {
        const aBalance = parseFloat(a.currentBalance ?? '0');
        const bBalance = parseFloat(b.currentBalance ?? '0');
        return bBalance - aBalance;
      });
  }, [currentUserId, normalizeDebt]);

  const createDebt = useCallback(
    async (data: {
      name: string;
      totalAmount: string;
      currentBalance?: string;
      interestRate?: string | null;
      minimumPayment?: string | null;
      dueDay?: number | null;
      categoryId?: number | null;
      notes?: string | null;
    }): Promise<Debt> => {
      const normalizedDueDay =
        data.dueDay === undefined || data.dueDay === null
          ? null
          : Math.min(Math.max(Math.round(data.dueDay), 1), 31);

      const currentBalance = data.currentBalance ?? data.totalAmount;

      const newDebt = {
        userId: currentUserId,
        name: data.name,
        totalAmount: data.totalAmount,
        currentBalance,
        interestRate: data.interestRate ?? null,
        minimumPayment: data.minimumPayment ?? null,
        dueDay: normalizedDueDay,
        categoryId: data.categoryId ?? null,
        notes: data.notes ?? null,
        createdAt: new Date().toISOString(),
      };

      const saved = await localStorage.saveItem('debts', newDebt);
      bumpVersion();
      return normalizeDebt(saved);
    },
    [bumpVersion, currentUserId, normalizeDebt]
  );

  const updateDebt = useCallback(
    async (id: number, updates: Partial<Debt>): Promise<Debt> => {
      const existing = await localStorage.getItem<any>('debts', id);
      if (!existing) {
        throw new Error('Debt not found');
      }

      const normalizedDueDay =
        updates.dueDay === undefined || updates.dueDay === null
          ? existing.dueDay
          : Math.min(Math.max(Math.round(updates.dueDay), 1), 31);

      const updatedRecord = {
        ...existing,
        ...updates,
        dueDay: normalizedDueDay,
        interestRate:
          updates.interestRate === undefined ? existing.interestRate : updates.interestRate,
        minimumPayment:
          updates.minimumPayment === undefined ? existing.minimumPayment : updates.minimumPayment,
        categoryId: updates.categoryId === undefined ? existing.categoryId : updates.categoryId,
        notes: updates.notes === undefined ? existing.notes : updates.notes,
      };

      const saved = await localStorage.saveItem('debts', updatedRecord);
      bumpVersion();
      return normalizeDebt(saved);
    },
    [bumpVersion, normalizeDebt]
  );

  const deleteDebt = useCallback(
    async (id: number): Promise<{ success: boolean }> => {
      const payments = await localStorage.getItems<any>('debtPayments', currentUserId);
      const related = payments.filter((payment) => payment.debtId === id);
      for (const payment of related) {
        if (payment.id) {
          await localStorage.deleteItem('debtPayments', payment.id);
        }
      }

      await localStorage.deleteItem('debts', id);
      bumpVersion();
      return { success: true };
    },
    [bumpVersion, currentUserId]
  );

  const recordDebtPayment = useCallback(
    async (
      debtId: number,
      payment: {
        amount: string;
        paidOn?: string;
        notes?: string | null;
        categoryId?: number | null;
      }
    ): Promise<Debt> => {
      const existing = await localStorage.getItem<any>('debts', debtId);
      if (!existing) {
        throw new Error('Debt not found');
      }

      const amountValue = parseFloat(payment.amount);
      if (!Number.isFinite(amountValue) || amountValue <= 0) {
        throw new Error('Payment amount must be greater than zero');
      }

      const currentBalanceValue = parseFloat(
        existing.currentBalance ?? existing.totalAmount ?? '0'
      );
      const newBalance = Math.max(currentBalanceValue - amountValue, 0);

      const paymentDate = payment.paidOn ?? new Date().toISOString().split('T')[0];

      await localStorage.saveItem('debtPayments', {
        debtId,
        userId: currentUserId,
        amount: payment.amount,
        paidOn: paymentDate,
        notes: payment.notes ?? null,
        categoryId: payment.categoryId ?? null,
      });

      const updatedRecord = {
        ...existing,
        currentBalance: newBalance.toFixed(2),
      };

      await localStorage.saveItem('debts', updatedRecord);

      const expenseTransaction = {
        description: `${existing.name} payment`,
        amount: payment.amount,
        type: 'expense' as const,
        categoryId: payment.categoryId ?? null,
        userId: currentUserId,
        date: paymentDate,
        createdAt: new Date().toISOString(),
      };
      try {
        await localStorage.saveItem('transactions', expenseTransaction);
      } catch (error) {
        console.warn('Failed to record debt payment transaction', error);
      }

      bumpVersion();
      return normalizeDebt(updatedRecord);
    },
    [bumpVersion, currentUserId, normalizeDebt]
  );

  const getDebtPayments = useCallback(
    async (debtId: number): Promise<DebtPayment[]> => {
      const results = await localStorage.getItems<any>('debtPayments', currentUserId);
      return results
        .filter((item) => item.debtId === debtId)
        .map((item) => normalizeDebtPayment(item))
        .sort((a, b) => new Date(b.paidOn).getTime() - new Date(a.paidOn).getTime());
    },
    [currentUserId, normalizeDebtPayment]
  );

  // Transaction methods
  const getTransactions = useCallback(async (): Promise<Transaction[]> => {
    debugLog('💰 getTransactions called for userId:', currentUserId);
    try {
      const transactions = await localStorage.getItems<Transaction>('transactions', currentUserId);
      debugLog('✅ Transactions loaded:', transactions.length, 'items');
      return transactions;
    } catch (error) {
      console.error('❌ Error in getTransactions:', error);
      throw error;
    }
  }, [currentUserId]);

  const createTransaction = useCallback(
    async (data: {
      description: string;
      amount: string;
      type: 'income' | 'expense';
      categoryId?: number | null;
      date?: string;
    }): Promise<Transaction> => {
      let assignedCategory: number | null = data.categoryId ?? null;
      if (!assignedCategory && data.type === 'expense') {
        try {
          const cats = await localStorage.getItems<Category>('categories', currentUserId);
          const { suggestCategory } = await import('@/lib/ai/categorizer');
          const suggestion = await suggestCategory({ description: data.description }, cats as any);
          if (suggestion.categoryId && suggestion.confidence >= 0.7) {
            assignedCategory = suggestion.categoryId;
          }
        } catch {}
      }

      const newTransaction: Omit<Transaction, 'id'> = {
        description: data.description,
        amount: data.amount,
        type: data.type,
        categoryId: assignedCategory,
        userId: currentUserId,
        date: data.date || new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
      };

      const savedTransaction = await localStorage.saveItem('transactions', newTransaction);
      bumpVersion();

      return savedTransaction;
    },
    [currentUserId, bumpVersion]
  );

  const updateTransaction = useCallback(
    async (id: number, data: Partial<Transaction>): Promise<Transaction> => {
      const existing = await localStorage.getItem<Transaction>('transactions', id);
      if (!existing) {
        throw new Error('Transaction not found');
      }

      const updated = { ...existing, ...data };
      await localStorage.saveItem('transactions', updated);
      if (data.categoryId != null && data.categoryId !== existing.categoryId) {
        try {
          const cats = await localStorage.getItems<Category>('categories', currentUserId);
          const cat = cats.find((c) => c.id === data.categoryId);
          if (cat) {
            const { recordFeedback } = await import('@/lib/ai/categorizer');
            await recordFeedback(existing.description, cat.id, cat.name);
          }
        } catch {}
      }
      bumpVersion();

      return updated;
    },
    [bumpVersion, currentUserId]
  );

  const deleteTransaction = useCallback(
    async (id: number): Promise<{ success: boolean }> => {
      await localStorage.deleteItem('transactions', id);
      bumpVersion();
      return { success: true };
    },
    [bumpVersion]
  );

  // Insight methods
  const getInsights = useCallback(async (): Promise<Insight[]> => {
    return localStorage.getItems<Insight>('insights', currentUserId);
  }, [currentUserId]);

  const getInsightsThread = useCallback(async (): Promise<InsightsMessage[]> => {
    const messages = await localStorage.getInsightsThread();
    return messages.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }, []);

  const saveInsightsThread = useCallback(async (messages: InsightsMessage[]): Promise<void> => {
    const normalized = messages.map((message) => ({
      ...message,
      createdAt: message.createdAt || new Date().toISOString(),
    }));
    await localStorage.saveInsightsThread(normalized);
  }, []);

  const clearInsightsThread = useCallback(async (): Promise<void> => {
    await localStorage.clearInsightsThread();
  }, []);

  const generateInsights = useCallback(async (): Promise<{ insights: Insight[] }> => {
    const [transactions, categories, savingsGoalsRaw] = await Promise.all([
      getTransactions(),
      getCategories(),
      getSavingsGoals(),
    ]);

    const savingsGoals = savingsGoalsRaw.map((goal) => normalizeSavingsGoal(goal));

    const insights: Insight[] = [];

    // Generate spending insights
    const totalExpenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const totalBudget = categories.reduce((sum, c) => sum + parseFloat(c.budget), 0);

    if (totalExpenses > totalBudget * 0.8) {
      insights.push({
        id: Date.now() + Math.random(),
        userId: currentUserId,
        type: 'alert',
        title: 'Budget Warning',
        description: `You've spent ${((totalExpenses / totalBudget) * 100).toFixed(1)}% of your total budget this month.`,
        severity: totalExpenses > totalBudget ? 'error' : 'warning',
        createdAt: new Date().toISOString(),
      });
    }

    // Check category overspending
    for (const category of categories) {
      const spent = transactions
        .filter((t) => t.categoryId === category.id && t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const budget = parseFloat(category.budget);
      if (spent > budget * 0.9) {
        insights.push({
          id: Date.now() + Math.random(),
          userId: currentUserId,
          type: 'alert',
          title: `${category.name} Budget Alert`,
          description: `You've spent $${spent.toFixed(2)} of your $${budget.toFixed(2)} ${category.name} budget.`,
          category: category.name,
          severity: spent > budget ? 'error' : 'warning',
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Positive insights
    const thisMonthTransactions = transactions.filter((t) => {
      const transactionDate = new Date(t.date);
      const now = new Date();
      return (
        transactionDate.getMonth() === now.getMonth() &&
        transactionDate.getFullYear() === now.getFullYear()
      );
    });

    const thisMonthIncome = thisMonthTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const thisMonthExpenses = thisMonthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    if (thisMonthIncome > thisMonthExpenses) {
      insights.push({
        id: Date.now() + Math.random(),
        userId: currentUserId,
        type: 'suggestion',
        title: 'Great Job Saving!',
        description: `You saved $${(thisMonthIncome - thisMonthExpenses).toFixed(2)} this month. Consider investing or adding to your emergency fund.`,
        severity: 'info',
        createdAt: new Date().toISOString(),
      });
    }

    if (savingsGoals.length > 0) {
      const totalSavingsPlanned = savingsGoals.reduce((sum, goal) => {
        const monthly = parseFloat(goal.monthlyContribution ?? '0');
        return sum + (Number.isFinite(monthly) ? monthly : 0);
      }, 0);

      if (totalSavingsPlanned > 0) {
        insights.push({
          id: Date.now() + Math.random(),
          userId: currentUserId,
          type: 'trend',
          title: 'Savings Plan Active',
          description: `You're reserving $${totalSavingsPlanned.toFixed(
            2
          )} each month toward your goals.`,
          severity: 'info',
          createdAt: new Date().toISOString(),
        });
      }

      savingsGoals.forEach((goal) => {
        const target = parseFloat(goal.targetAmount ?? '0');
        const current = parseFloat(goal.currentAmount ?? '0');
        if (target > 0 && current / target >= 0.85) {
          insights.push({
            id: Date.now() + Math.random(),
            userId: currentUserId,
            type: 'suggestion',
            title: `${goal.name} is almost complete`,
            description: `Only $${Math.max(target - current, 0).toFixed(
              2
            )} left to reach this savings goal.`,
            severity: 'info',
            createdAt: new Date().toISOString(),
          });
        }
      });
    }

    // Save insights to storage
    for (const insight of insights) {
      await localStorage.saveItem('insights', insight);
    }
    bumpVersion();

    return { insights };
  }, [
    currentUserId,
    getTransactions,
    getCategories,
    getSavingsGoals,
    normalizeSavingsGoal,
    bumpVersion,
  ]);

  // Bank Account methods
  const getBankAccounts = useCallback(async (): Promise<BankAccount[]> => {
    return localStorage.getItems<BankAccount>('bankAccounts', currentUserId);
  }, [currentUserId]);

  const createBankAccount = useCallback(
    async (data: Omit<BankAccount, 'id' | 'userId' | 'createdAt'>): Promise<BankAccount> => {
      const newBankAccount: BankAccount = {
        ...data,
        id: Math.floor(Date.now() + Math.random() * 1000),
        userId: currentUserId,
        createdAt: new Date().toISOString(),
      };

      await localStorage.saveItem('bankAccounts', newBankAccount);
      bumpVersion();

      return newBankAccount;
    },
    [currentUserId, bumpVersion]
  );

  const updateBankAccount = useCallback(
    async (id: number, updates: Partial<BankAccount>): Promise<BankAccount> => {
      const existing = await localStorage.getItem<BankAccount>('bankAccounts', id);
      if (!existing) {
        throw new Error('Bank account not found');
      }

      const updated = { ...existing, ...updates };
      await localStorage.saveItem('bankAccounts', updated);
      bumpVersion();

      return updated;
    },
    [bumpVersion]
  );

  const deleteBankAccount = useCallback(
    async (id: number): Promise<{ success: boolean }> => {
      await localStorage.deleteItem('bankAccounts', id);
      bumpVersion();
      return { success: true };
    },
    [bumpVersion]
  );

  // Utility methods
  const refreshAllData = useCallback(async (): Promise<void> => {
    // No-op without query cache; components can call getters to refresh
    return Promise.resolve();
  }, []);

  const clearAllData = useCallback(async (): Promise<void> => {
    await Promise.all([
      localStorage.clearStore('transactions'),
      localStorage.clearStore('categories'),
      localStorage.clearStore('insights'),
      localStorage.clearStore('bankAccounts'),
      localStorage.clearStore('savingsGoals'),
      localStorage.clearStore('savingsContributions'),
      localStorage.clearStore('bills'),
      localStorage.clearStore('billPayments'),
      localStorage.clearStore('debts'),
      localStorage.clearStore('debtPayments'),
    ]);
    await localStorage.setSetting('monthlyIncome', null);
    await localStorage.clearInsightsThread();
    setMonthlyIncome(null);
    // Note: clearAllData functionality simplified for development
    debugLog('Data cleared');
  }, []);

  // Set up the API compatibility layer
  useEffect(() => {
    if (isInitialized) {
      setDataContext({
        getDashboardSummary,
        getUserProfile,
        updateUserProfile,
        getCategories,
        createCategory,
        updateCategory,
        deleteCategory,
        getMonthlyIncome,
        updateMonthlyIncome,
        getSavingsGoals,
        createSavingsGoal,
        updateSavingsGoal,
        deleteSavingsGoal,
        recordSavingsContribution,
        getSavingsContributions,
        getTransactions,
        createTransaction,
        updateTransaction,
        deleteTransaction,
        getInsights,
        generateInsights,
        getInsightsThread,
        saveInsightsThread,
        clearInsightsThread,
        getBankAccounts,
        createBankAccount,
        updateBankAccount,
        deleteBankAccount,
        getBills,
        createBill,
        updateBill,
        deleteBill,
        markBillPaid,
        getBillPayments,
        getDebts,
        createDebt,
        updateDebt,
        deleteDebt,
        recordDebtPayment,
        getDebtPayments,
        refreshAllData,
        clearAllData,
      });
    }
  }, [
    isInitialized,
    getDashboardSummary,
    getUserProfile,
    updateUserProfile,
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    getMonthlyIncome,
    updateMonthlyIncome,
    getSavingsGoals,
    createSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    recordSavingsContribution,
    getSavingsContributions,
    getTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    getInsights,
    generateInsights,
    getInsightsThread,
    saveInsightsThread,
    clearInsightsThread,
    getBankAccounts,
    createBankAccount,
    updateBankAccount,
    deleteBankAccount,
    getBills,
    createBill,
    updateBill,
    deleteBill,
    markBillPaid,
    getBillPayments,
    getDebts,
    createDebt,
    updateDebt,
    deleteDebt,
    recordDebtPayment,
    getDebtPayments,
    refreshAllData,
    refreshDashboard,
    clearAllData,
  ]);

  const contextValue: DataContextType = {
    isLoading,
    isInitialized,
    currentUserId,
    dataVersion,
    monthlyIncome,

    // Dashboard
    getDashboardSummary,
    refreshDashboard,
    getMonthlyIncome,
    updateMonthlyIncome,

    // User
    getUserProfile,
    updateUserProfile,

    // Categories
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    updateCategoriesBudgets,

    // Savings goals
    getSavingsGoals,
    createSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    recordSavingsContribution,
    getSavingsContributions,

    // Transactions
    getTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,

    // Insights
    getInsights,
    generateInsights,
    getInsightsThread,
    saveInsightsThread,
    clearInsightsThread,

    // Bank Accounts
    getBankAccounts,
    createBankAccount,
    updateBankAccount,
    deleteBankAccount,

    // Bills
    getBills,
    createBill,
    updateBill,
    deleteBill,
    markBillPaid,
    getBillPayments,

    // Debts
    getDebts,
    createDebt,
    updateDebt,
    deleteDebt,
    recordDebtPayment,
    getDebtPayments,

    // Utility methods
    refreshAllData,
    clearAllData,
  };

  // Apply initial budget categories if provided and after initialization
  useEffect(() => {
    const applyInitialBudgets = async () => {
      if (isInitialized && initialBudgetCategories && initialBudgetCategories.length > 0) {
        try {
          debugLog('🎯 Applying initial budget categories from onboarding...');
          await updateCategoriesBudgets(initialBudgetCategories);
          debugLog('✅ Initial budget categories applied successfully');
        } catch (error) {
          console.error('❌ Failed to apply initial budget categories:', error);
        }
      }
    };

    applyInitialBudgets();
  }, [isInitialized, initialBudgetCategories, updateCategoriesBudgets]);

  return <DataContext.Provider value={contextValue}>{children}</DataContext.Provider>;
}

export function useData(): DataContextType {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}

// Convenience hooks for specific data types
export function useDashboard() {
  const { getDashboardSummary, refreshDashboard } = useData();
  return { getDashboardSummary, refreshDashboard };
}

export function useTransactions() {
  const { getTransactions, createTransaction, updateTransaction, deleteTransaction } = useData();

  return {
    getTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  };
}

export function useCategories() {
  const { getCategories, createCategory, updateCategory, deleteCategory } = useData();

  return {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}

export function useInsights() {
  const { getInsights, generateInsights } = useData();
  return { getInsights, generateInsights };
}

export function useSavings() {
  const {
    getSavingsGoals,
    createSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    recordSavingsContribution,
    getSavingsContributions,
  } = useData();

  return {
    getSavingsGoals,
    createSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    recordSavingsContribution,
    getSavingsContributions,
  };
}

export function useBills() {
  const { getBills, createBill, updateBill, deleteBill, markBillPaid, getBillPayments } = useData();

  return {
    getBills,
    createBill,
    updateBill,
    deleteBill,
    markBillPaid,
    getBillPayments,
  };
}

export function useDebts() {
  const { getDebts, createDebt, updateDebt, deleteDebt, recordDebtPayment, getDebtPayments } =
    useData();

  return {
    getDebts,
    createDebt,
    updateDebt,
    deleteDebt,
    recordDebtPayment,
    getDebtPayments,
  };
}
