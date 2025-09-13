import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { queryClient } from '@/lib/queryClient';
import { setDataContext } from '@/lib/api';
import { localStorage } from '@/lib/local-storage';

// Re-export interfaces from api.ts for consistency
export interface DashboardSummary {
  totalIncome: number;
  totalExpenses: number;
  totalBudget: number;
  remainingBudget: number;
  categoryBreakdown: CategoryBreakdown[];
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

interface DataContextType {
  // Data state
  isLoading: boolean;
  isInitialized: boolean;
  currentUserId: number;

  // Dashboard
  getDashboardSummary: () => Promise<DashboardSummary>;
  refreshDashboard: () => Promise<void>;

  // User
  getUserProfile: () => Promise<User>;
  updateUserProfile: (updates: Partial<User>) => Promise<User>;

  // Categories
  getCategories: () => Promise<Category[]>;
  createCategory: (data: Omit<Category, 'id' | 'userId'>) => Promise<Category>;
  updateCategory: (id: number, updates: Partial<Category>) => Promise<Category>;
  deleteCategory: (id: number) => Promise<{ success: boolean }>;
  updateCategoriesBudgets: (budgetCategories: Array<{ name: string; budget: string }>) => Promise<void>;

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

  // Bank Accounts
  getBankAccounts: () => Promise<BankAccount[]>;
  createBankAccount: (
    data: Omit<BankAccount, 'id' | 'userId' | 'createdAt'>
  ) => Promise<BankAccount>;
  updateBankAccount: (id: number, updates: Partial<BankAccount>) => Promise<BankAccount>;
  deleteBankAccount: (id: number) => Promise<{ success: boolean }>;

  // Utility methods
  refreshAllData: () => Promise<void>;
  clearAllData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

interface DataProviderProps {
  children: React.ReactNode;
  userId?: number;
  initialBudgetCategories?: Array<{ name: string; budget: string }> | null;
}

export function DataProvider({ children, userId = 1, initialBudgetCategories = null }: DataProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentUserId] = useState(userId);

  // Development mode flag - set to true to clear and reinitialize data every launch
  const DEVELOPMENT_MODE = true;

  // Initialize local storage on mount
  useEffect(() => {
    const initializeDemoData = async () => {
      console.log('🔄 Initializing demo data...');
      const demoCategories: Omit<Category, 'id'>[] = [
        {
          name: 'Food & Dining',
          icon: '🍽️',
          color: '#FF6B6B',
          budget: '500',
          userId: currentUserId,
        },
        {
          name: 'Groceries',
          icon: '🛒',
          color: '#4CAF50',
          budget: '400',
          userId: currentUserId,
        },
        {
          name: 'Transportation',
          icon: '🚗',
          color: '#4ECDC4',
          budget: '300',
          userId: currentUserId,
        },
        {
          name: 'Gas & Fuel',
          icon: '⛽',
          color: '#FF9800',
          budget: '200',
          userId: currentUserId,
        },
        {
          name: 'Entertainment',
          icon: '🎬',
          color: '#45B7D1',
          budget: '200',
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
          name: 'Healthcare',
          icon: '🏥',
          color: '#E91E63',
          budget: '300',
          userId: currentUserId,
        },
        {
          name: 'Shopping',
          icon: '🛍️',
          color: '#9C27B0',
          budget: '300',
          userId: currentUserId,
        },
        {
          name: 'Personal Care',
          icon: '💅',
          color: '#F44336',
          budget: '150',
          userId: currentUserId,
        },
        {
          name: 'Education',
          icon: '📚',
          color: '#3F51B5',
          budget: '200',
          userId: currentUserId,
        },
        {
          name: 'Travel',
          icon: '✈️',
          color: '#00BCD4',
          budget: '500',
          userId: currentUserId,
        },
        {
          name: 'Home & Garden',
          icon: '🏠',
          color: '#8BC34A',
          budget: '250',
          userId: currentUserId,
        },
        {
          name: 'Technology',
          icon: '💻',
          color: '#607D8B',
          budget: '300',
          userId: currentUserId,
        },
        {
          name: 'Fitness & Sports',
          icon: '🏋️',
          color: '#FF5722',
          budget: '100',
          userId: currentUserId,
        },
        {
          name: 'Insurance',
          icon: '🛡️',
          color: '#795548',
          budget: '400',
          userId: currentUserId,
        },
        {
          name: 'Subscriptions',
          icon: '📱',
          color: '#673AB7',
          budget: '150',
          userId: currentUserId,
        },
        {
          name: 'Gifts & Donations',
          icon: '🎁',
          color: '#E91E63',
          budget: '200',
          userId: currentUserId,
        },
        {
          name: 'Pet Care',
          icon: '🐕',
          color: '#FF9800',
          budget: '150',
          userId: currentUserId,
        },
        {
          name: 'Other',
          icon: '📋',
          color: '#9E9E9E',
          budget: '100',
          userId: currentUserId,
        },
      ];

      console.log(`📁 Creating ${demoCategories.length} demo categories...`);
      for (const category of demoCategories) {
        const newCategory = {
          ...category,
          // Don't pre-generate ID, let the database handle it
        };
        console.log('💾 Saving category:', newCategory.name);
        await localStorage.saveItem('categories', newCategory);
      }
      console.log('✅ Demo categories created');

      // Verify categories were saved
      const savedCategories = await localStorage.getItems<Category>('categories', currentUserId);
      console.log('🔍 Verified saved categories:', savedCategories.length);
      
      // Also check all categories in the table (debug)
      const allCategories = await localStorage.getAllItems<Category>('categories');
      console.log('🔍 All categories in database:', allCategories.length);

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

      console.log(`💰 Creating ${demoTransactions.length} demo transactions...`);
      for (const transaction of demoTransactions) {
        const newTransaction = {
          ...transaction,
          // Don't pre-generate ID, let the database handle it
        };
        console.log('💾 Saving transaction:', newTransaction.description);
        await localStorage.saveItem('transactions', newTransaction);
      }
      console.log('✅ Demo transactions created');

      // Verify transactions were saved
      const savedTransactions = await localStorage.getItems<Transaction>('transactions', currentUserId);
      console.log('🔍 Verified saved transactions:', savedTransactions.length);
      
      // Also check all transactions in the table (debug)
      const allTransactions = await localStorage.getAllItems<Transaction>('transactions');
      console.log('🔍 All transactions in database:', allTransactions.length);

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

      console.log(`🏦 Creating ${demoBankAccounts.length} demo bank accounts...`);
      for (const bankAccount of demoBankAccounts) {
        const newBankAccount = {
          ...bankAccount,
          // Don't pre-generate ID, let the database handle it
        };
        await localStorage.saveItem('bankAccounts', newBankAccount);
      }
      console.log('✅ Demo bank accounts created');
      console.log('🎉 All demo data initialization complete!');
    };
    const initializeStorage = async () => {
      try {
        console.log('🔄 Initializing local storage...');
        await localStorage.init();
        console.log('✅ Local storage initialized');

        // Test database connection
        try {
          const testResult = await localStorage.query("SELECT name FROM sqlite_master WHERE type='table'");
          console.log('🔍 Tables in database:', testResult.map((row: any) => row.name));
        } catch (error) {
          console.error('❌ Error checking database tables:', error);
        }

        if (DEVELOPMENT_MODE) {
          // DEVELOPMENT MODE: Clear all existing data and reinitialize
          console.log('🔧 Development mode: Clearing all data and reinitializing...');

          // Clear all data stores
          await Promise.all([
            localStorage.clearStore('user'),
            localStorage.clearStore('categories'),
            localStorage.clearStore('transactions'),
            localStorage.clearStore('insights'),
            localStorage.clearStore('bankAccounts'),
          ]);

          // Clear react-query cache
          queryClient.clear();

          // Create demo user
          const demoUser: User = {
            id: currentUserId,
            username: 'demo_user',
            password: 'demo_password',
            email: 'demo@example.com',
            createdAt: new Date().toISOString(),
          };
          await localStorage.saveItem('user', demoUser);

          // Always reinitialize demo data
          await initializeDemoData();

          console.log('✅ Demo data reinitialized successfully');
        } else {
          // PRODUCTION MODE: Only initialize if no data exists
          console.log('🚀 Production mode: Checking for existing data...');

          // Check if we have a user, if not create a demo user
          const existingUser = await localStorage.getItem('user', currentUserId);
          if (!existingUser) {
            const demoUser: User = {
              id: currentUserId,
              username: 'demo_user',
              password: 'demo_password',
              email: 'demo@example.com',
              createdAt: new Date().toISOString(),
            };
            await localStorage.saveItem('user', demoUser);
          }

          // Initialize with some demo data if no data exists
          const existingCategories = await localStorage.getItems('categories', currentUserId);
          if (existingCategories.length === 0) {
            console.log('No existing categories found initializing demo data');
            await initializeDemoData();
          } else {
            console.log(`📊 Found ${existingCategories.length} existing categories`);
          }
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize data storage:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeStorage();
  }, [currentUserId, DEVELOPMENT_MODE]);

  const calculateDashboardSummary = useCallback(
    async (transactions: Transaction[], categories: Category[]): Promise<DashboardSummary> => {
      const totalIncome = transactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const totalExpenses = transactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const totalBudget = categories.reduce((sum, c) => sum + parseFloat(c.budget), 0);

      const remainingBudget = totalBudget - totalExpenses;

      // Calculate category breakdown
      const categoryBreakdown: CategoryBreakdown[] = categories.map((category) => {
        const spent = transactions
          .filter((t) => t.categoryId === category.id && t.type === 'expense')
          .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        const budget = parseFloat(category.budget);
        const percentage = budget > 0 ? (spent / budget) * 100 : 0;

        return {
          id: category.id,
          name: category.name,
          icon: category.icon,
          color: category.color,
          budget,
          spent,
          percentage,
        };
      });

      // Get recent transactions (last 10)
      const recentTransactions = transactions
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);

      return {
        totalIncome,
        totalExpenses,
        totalBudget,
        remainingBudget,
        categoryBreakdown,
        recentTransactions,
      };
    },
    []
  );

  // Dashboard methods
  const getDashboardSummary = useCallback(async (): Promise<DashboardSummary> => {
    console.log('🔍 getDashboardSummary called for userId:', currentUserId);
    
    try {
      const [transactions, categories] = await Promise.all([
        localStorage.getItems<Transaction>('transactions', currentUserId),
        localStorage.getItems<Category>('categories', currentUserId),
      ]);

      console.log('📊 Data loaded:', {
        transactionCount: transactions.length,
        categoryCount: categories.length,
        transactions: transactions.slice(0, 2), // Log first 2 for debugging
        categories: categories.slice(0, 2), // Log first 2 for debugging
      });

      return calculateDashboardSummary(transactions, categories);
    } catch (error) {
      console.error('❌ Error in getDashboardSummary:', error);
      throw error;
    }
  }, [currentUserId, calculateDashboardSummary]);

  const refreshDashboard = useCallback(async (): Promise<void> => {
    queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
  }, []);

  // User methods
  const getUserProfile = useCallback(async (): Promise<User> => {
    const user = await localStorage.getItem<User>('user', currentUserId);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }, [currentUserId]);

  const updateUserProfile = useCallback(
    async (updates: Partial<User>): Promise<User> => {
      const existing = await getUserProfile();
      const updated = { ...existing, ...updates };
      await localStorage.saveItem('user', updated);
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      return updated;
    },
    [getUserProfile]
  );

  // Category methods
  const getCategories = useCallback(async (): Promise<Category[]> => {
    console.log('🏷️ getCategories called for userId:', currentUserId);
    try {
      const categories = await localStorage.getItems<Category>('categories', currentUserId);
      console.log('✅ Categories loaded:', categories.length, 'items');
      return categories;
    } catch (error) {
      console.error('❌ Error in getCategories:', error);
      throw error;
    }
  }, [currentUserId]);

  const createCategory = useCallback(
    async (data: Omit<Category, 'id' | 'userId'>): Promise<Category> => {
      const newCategory: Omit<Category, 'id'> = {
        ...data,
        userId: currentUserId,
      };

      const savedCategory = await localStorage.saveItem('categories', newCategory);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });

      return savedCategory;
    },
    [currentUserId]
  );

  const updateCategory = useCallback(
    async (id: number, updates: Partial<Category>): Promise<Category> => {
      const existing = await localStorage.getItem<Category>('categories', id);
      if (!existing) {
        throw new Error('Category not found');
      }

      const updated = { ...existing, ...updates };
      await localStorage.saveItem('categories', updated);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });

      return updated;
    },
    []
  );

  const deleteCategory = useCallback(async (id: number): Promise<{ success: boolean }> => {
    await localStorage.deleteItem('categories', id);
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    return { success: true };
  }, []);

  const updateCategoriesBudgets = useCallback(
    async (budgetCategories: Array<{ name: string; budget: string }>): Promise<void> => {
      const categories = await getCategories();
      
      for (const budgetCategory of budgetCategories) {
        const category = categories.find(cat => cat.name === budgetCategory.name);
        if (category) {
          await updateCategory(category.id, { budget: budgetCategory.budget });
        }
      }
    },
    [getCategories, updateCategory]
  );

  // Transaction methods
  const getTransactions = useCallback(async (): Promise<Transaction[]> => {
    console.log('💰 getTransactions called for userId:', currentUserId);
    try {
      const transactions = await localStorage.getItems<Transaction>('transactions', currentUserId);
      console.log('✅ Transactions loaded:', transactions.length, 'items');
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
      const newTransaction: Omit<Transaction, 'id'> = {
        description: data.description,
        amount: data.amount,
        type: data.type,
        categoryId: data.categoryId || null,
        userId: currentUserId,
        date: data.date || new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
      };

      const savedTransaction = await localStorage.saveItem('transactions', newTransaction);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });

      return savedTransaction;
    },
    [currentUserId]
  );

  const updateTransaction = useCallback(
    async (id: number, data: Partial<Transaction>): Promise<Transaction> => {
      const existing = await localStorage.getItem<Transaction>('transactions', id);
      if (!existing) {
        throw new Error('Transaction not found');
      }

      const updated = { ...existing, ...data };
      await localStorage.saveItem('transactions', updated);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });

      return updated;
    },
    []
  );

  const deleteTransaction = useCallback(async (id: number): Promise<{ success: boolean }> => {
    await localStorage.deleteItem('transactions', id);
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    return { success: true };
  }, []);

  // Insight methods
  const getInsights = useCallback(async (): Promise<Insight[]> => {
    return localStorage.getItems<Insight>('insights', currentUserId);
  }, [currentUserId]);

  const generateInsights = useCallback(async (): Promise<{ insights: Insight[] }> => {
    const [transactions, categories] = await Promise.all([getTransactions(), getCategories()]);

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

    // Save insights to storage
    for (const insight of insights) {
      await localStorage.saveItem('insights', insight);
    }

    queryClient.invalidateQueries({ queryKey: ['insights'] });

    return { insights };
  }, [currentUserId, getTransactions, getCategories]);

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
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });

      return newBankAccount;
    },
    [currentUserId]
  );

  const updateBankAccount = useCallback(
    async (id: number, updates: Partial<BankAccount>): Promise<BankAccount> => {
      const existing = await localStorage.getItem<BankAccount>('bankAccounts', id);
      if (!existing) {
        throw new Error('Bank account not found');
      }

      const updated = { ...existing, ...updates };
      await localStorage.saveItem('bankAccounts', updated);
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });

      return updated;
    },
    []
  );

  const deleteBankAccount = useCallback(async (id: number): Promise<{ success: boolean }> => {
    await localStorage.deleteItem('bankAccounts', id);
    queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    return { success: true };
  }, []);

  // Utility methods
  const refreshAllData = useCallback(async (): Promise<void> => {
    queryClient.invalidateQueries();
  }, []);

  const clearAllData = useCallback(async (): Promise<void> => {
    await Promise.all([
      localStorage.clearStore('transactions'),
      localStorage.clearStore('categories'),
      localStorage.clearStore('insights'),
      localStorage.clearStore('bankAccounts'),
    ]);
    queryClient.clear();

    // Note: clearAllData functionality temporarily simplified for development
    console.log('Data cleared');
    queryClient.invalidateQueries();
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
        getTransactions,
        createTransaction,
        updateTransaction,
        deleteTransaction,
        getInsights,
        generateInsights,
        getBankAccounts,
        createBankAccount,
        updateBankAccount,
        deleteBankAccount,
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
    getTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    getInsights,
    generateInsights,
    getBankAccounts,
    createBankAccount,
    updateBankAccount,
    deleteBankAccount,
    refreshAllData,
    refreshDashboard,
    clearAllData,
  ]);

  const contextValue: DataContextType = {
    isLoading,
    isInitialized,
    currentUserId,

    // Dashboard
    getDashboardSummary,
    refreshDashboard,

    // User
    getUserProfile,
    updateUserProfile,

    // Categories
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    updateCategoriesBudgets,

    // Transactions
    getTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,

    // Insights
    getInsights,
    generateInsights,

    // Bank Accounts
    getBankAccounts,
    createBankAccount,
    updateBankAccount,
    deleteBankAccount,

    // Utility methods
    refreshAllData,
    clearAllData,
  };

  // Apply initial budget categories if provided and after initialization
  useEffect(() => {
    const applyInitialBudgets = async () => {
      if (isInitialized && initialBudgetCategories && initialBudgetCategories.length > 0) {
        try {
          console.log('🎯 Applying initial budget categories from onboarding...');
          await updateCategoriesBudgets(initialBudgetCategories);
          console.log('✅ Initial budget categories applied successfully');
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
