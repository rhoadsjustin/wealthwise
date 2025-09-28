import {
  DashboardSummary,
  CategoryBreakdown,
  Transaction,
  Category,
  User,
  Insight,
  BankAccount,
  Bill,
  BillPayment,
  Debt,
  DebtPayment,
} from '@/context/DataContext';

// Re-export interfaces for backward compatibility
export type {
  DashboardSummary,
  CategoryBreakdown,
  Transaction,
  Category,
  User,
  Insight,
  BankAccount,
  Bill,
  BillPayment,
  Debt,
  DebtPayment,
};

// Singleton to hold the data context methods
let dataContext: any = null;

// Function to inject the data context (called from the provider)
export function setDataContext(context: any) {
  dataContext = context;
}

// Helper to ensure data context is available
function ensureDataContext() {
  if (!dataContext) {
    throw new Error('Data context not initialized. Make sure to wrap your app with DataProvider.');
  }
  return dataContext;
}

// Legacy API interface that now uses local storage
export const api = {
  // Dashboard
  getDashboardSummary: (): Promise<DashboardSummary> => {
    const context = ensureDataContext();
    return context.getDashboardSummary();
  },

  // User
  getUserProfile: (): Promise<User> => {
    const context = ensureDataContext();
    return context.getUserProfile();
  },

  // Categories
  getCategories: (): Promise<Category[]> => {
    const context = ensureDataContext();
    return context.getCategories();
  },

  createCategory: (data: Omit<Category, 'id' | 'userId'>): Promise<Category> => {
    const context = ensureDataContext();
    return context.createCategory(data);
  },

  updateCategory: (id: number, data: Partial<Category>): Promise<Category> => {
    const context = ensureDataContext();
    return context.updateCategory(id, data);
  },

  deleteCategory: (id: number): Promise<{ success: boolean }> => {
    const context = ensureDataContext();
    return context.deleteCategory(id);
  },

  // Transactions
  getTransactions: (): Promise<Transaction[]> => {
    const context = ensureDataContext();
    return context.getTransactions();
  },

  createTransaction: (data: {
    description: string;
    amount: string;
    type: 'income' | 'expense';
    categoryId?: number;
    date?: string;
  }): Promise<Transaction> => {
    const context = ensureDataContext();
    return context.createTransaction(data);
  },

  updateTransaction: (id: number, data: Partial<Transaction>): Promise<Transaction> => {
    const context = ensureDataContext();
    return context.updateTransaction(id, data);
  },

  deleteTransaction: (id: number): Promise<{ success: boolean }> => {
    const context = ensureDataContext();
    return context.deleteTransaction(id);
  },

  // Insights
  getInsights: (): Promise<Insight[]> => {
    const context = ensureDataContext();
    return context.getInsights();
  },

  generateInsights: (): Promise<{ insights: Insight[] }> => {
    const context = ensureDataContext();
    return context.generateInsights();
  },

  // Bank Accounts (Plaid)
  getBankAccounts: (): Promise<BankAccount[]> => {
    const context = ensureDataContext();
    return context.getBankAccounts();
  },

  createBankAccount: (
    data: Omit<BankAccount, 'id' | 'userId' | 'createdAt'>
  ): Promise<BankAccount> => {
    const context = ensureDataContext();
    return context.createBankAccount(data);
  },

  updateBankAccount: (id: number, data: Partial<BankAccount>): Promise<BankAccount> => {
    const context = ensureDataContext();
    return context.updateBankAccount(id, data);
  },

  deleteBankAccount: (id: number): Promise<{ success: boolean }> => {
    const context = ensureDataContext();
    return context.deleteBankAccount(id);
  },

  // Bills
  getBills: (): Promise<Bill[]> => {
    const context = ensureDataContext();
    return context.getBills();
  },

  createBill: (data: {
    name: string;
    amount: string;
    categoryId: number;
    dueDay?: number | null;
    autoPay?: boolean;
    notes?: string | null;
  }): Promise<Bill> => {
    const context = ensureDataContext();
    return context.createBill(data);
  },

  updateBill: (id: number, data: Partial<Bill>): Promise<Bill> => {
    const context = ensureDataContext();
    return context.updateBill(id, data);
  },

  deleteBill: (id: number): Promise<{ success: boolean }> => {
    const context = ensureDataContext();
    return context.deleteBill(id);
  },

  markBillPaid: (
    id: number,
    payment?: { amount?: string; paidOn?: string; notes?: string | null }
  ): Promise<Bill> => {
    const context = ensureDataContext();
    return context.markBillPaid(id, payment);
  },

  getBillPayments: (billId: number): Promise<BillPayment[]> => {
    const context = ensureDataContext();
    return context.getBillPayments(billId);
  },

  // Debts
  getDebts: (): Promise<Debt[]> => {
    const context = ensureDataContext();
    return context.getDebts();
  },

  createDebt: (data: {
    name: string;
    totalAmount: string;
    currentBalance?: string;
    interestRate?: string | null;
    minimumPayment?: string | null;
    dueDay?: number | null;
    categoryId?: number | null;
    notes?: string | null;
  }): Promise<Debt> => {
    const context = ensureDataContext();
    return context.createDebt(data);
  },

  updateDebt: (id: number, data: Partial<Debt>): Promise<Debt> => {
    const context = ensureDataContext();
    return context.updateDebt(id, data);
  },

  deleteDebt: (id: number): Promise<{ success: boolean }> => {
    const context = ensureDataContext();
    return context.deleteDebt(id);
  },

  recordDebtPayment: (
    debtId: number,
    payment: { amount: string; paidOn?: string; notes?: string | null; categoryId?: number | null }
  ): Promise<Debt> => {
    const context = ensureDataContext();
    return context.recordDebtPayment(debtId, payment);
  },

  getDebtPayments: (debtId: number): Promise<DebtPayment[]> => {
    const context = ensureDataContext();
    return context.getDebtPayments(debtId);
  },
};

// For backward compatibility with query client usage
export async function apiRequest(method: string, url: string, data?: unknown): Promise<Response> {
  // This is a mock implementation that doesn't actually make HTTP requests
  // Instead, it routes to the appropriate local storage methods

  const context = ensureDataContext();

  try {
    let result;

    // Route based on URL and method
    if (url === '/api/dashboard/summary' && method === 'GET') {
      result = await context.getDashboardSummary();
    } else if (url === '/api/user/profile' && method === 'GET') {
      result = await context.getUserProfile();
    } else if (url === '/api/categories' && method === 'GET') {
      result = await context.getCategories();
    } else if (url === '/api/categories' && method === 'POST') {
      result = await context.createCategory(data);
    } else if (url.startsWith('/api/categories/') && method === 'PUT') {
      const id = parseInt(url.split('/').pop() || '0');
      result = await context.updateCategory(id, data);
    } else if (url.startsWith('/api/categories/') && method === 'DELETE') {
      const id = parseInt(url.split('/').pop() || '0');
      result = await context.deleteCategory(id);
    } else if (url === '/api/transactions' && method === 'GET') {
      result = await context.getTransactions();
    } else if (url === '/api/transactions' && method === 'POST') {
      result = await context.createTransaction(data);
    } else if (url.startsWith('/api/transactions/') && method === 'PUT') {
      const id = parseInt(url.split('/').pop() || '0');
      result = await context.updateTransaction(id, data);
    } else if (url.startsWith('/api/transactions/') && method === 'DELETE') {
      const id = parseInt(url.split('/').pop() || '0');
      result = await context.deleteTransaction(id);
    } else if (url === '/api/insights' && method === 'GET') {
      result = await context.getInsights();
    } else if (url === '/api/insights/generate' && method === 'POST') {
      result = await context.generateInsights();
    } else if (url === '/api/plaid/accounts' && method === 'GET') {
      result = await context.getBankAccounts();
    } else if (url === '/api/plaid/accounts' && method === 'POST') {
      result = await context.createBankAccount(data);
    } else if (url.startsWith('/api/plaid/accounts/') && method === 'PUT') {
      const id = parseInt(url.split('/').pop() || '0');
      result = await context.updateBankAccount(id, data);
    } else if (url.startsWith('/api/plaid/accounts/') && method === 'DELETE') {
      const id = parseInt(url.split('/').pop() || '0');
      result = await context.deleteBankAccount(id);
    } else if (url === '/api/bills' && method === 'GET') {
      result = await context.getBills();
    } else if (url === '/api/bills' && method === 'POST') {
      result = await context.createBill(data);
    } else if (url.startsWith('/api/bills/') && method === 'PUT') {
      const parts = url.split('/');
      const id = parseInt(parts[parts.length - 1] || '0');
      result = await context.updateBill(id, data);
    } else if (url.startsWith('/api/bills/') && method === 'DELETE') {
      const id = parseInt(url.split('/').pop() || '0');
      result = await context.deleteBill(id);
    } else if (url.endsWith('/pay') && method === 'POST' && url.startsWith('/api/bills/')) {
      const id = parseInt(url.split('/').slice(-2, -1)[0] || '0');
      result = await context.markBillPaid(id, data);
    } else if (url.endsWith('/payments') && method === 'GET' && url.startsWith('/api/bills/')) {
      const id = parseInt(url.split('/').slice(-2, -1)[0] || '0');
      result = await context.getBillPayments(id);
    } else if (url === '/api/debts' && method === 'GET') {
      result = await context.getDebts();
    } else if (url === '/api/debts' && method === 'POST') {
      result = await context.createDebt(data);
    } else if (url.startsWith('/api/debts/') && method === 'PUT') {
      const parts = url.split('/');
      const id = parseInt(parts[parts.length - 1] || '0');
      result = await context.updateDebt(id, data);
    } else if (url.startsWith('/api/debts/') && method === 'DELETE') {
      const id = parseInt(url.split('/').pop() || '0');
      result = await context.deleteDebt(id);
    } else if (url.endsWith('/payments') && method === 'POST' && url.startsWith('/api/debts/')) {
      const id = parseInt(url.split('/').slice(-2, -1)[0] || '0');
      result = await context.recordDebtPayment(id, data);
    } else if (url.endsWith('/payments') && method === 'GET' && url.startsWith('/api/debts/')) {
      const id = parseInt(url.split('/').slice(-2, -1)[0] || '0');
      result = await context.getDebtPayments(id);
    } else {
      throw new Error(`Unknown API endpoint: ${method} ${url}`);
    }

    // Mock a Response object
    return new Response(JSON.stringify(result), {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('API request failed:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      statusText: 'Internal Server Error',
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
