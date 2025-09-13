import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useData } from '@/context/DataContext';
import type { DashboardSummary, Transaction, Category, User, Insight } from '@/context/DataContext';

// Dashboard hooks
export function useDashboardSummaryQuery() {
  const { getDashboardSummary, isInitialized } = useData();

  return useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: getDashboardSummary,
    staleTime: 30000, // 30 seconds
    refetchOnMount: 'always',
    enabled: isInitialized, // Only run query when DataContext is initialized
  });
}

// User hooks
export function useUserProfileQuery() {
  const { getUserProfile, isInitialized } = useData();

  return useQuery({
    queryKey: ['user-profile'],
    queryFn: getUserProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: isInitialized,
  });
}

export function useUpdateUserProfileMutation() {
  const { updateUserProfile } = useData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUserProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
  });
}

// Transaction hooks
export function useTransactionsQuery() {
  const { getTransactions, isInitialized } = useData();

  return useQuery({
    queryKey: ['transactions'],
    queryFn: getTransactions,
    staleTime: 30000, // 30 seconds
    enabled: isInitialized,
  });
}

export function useCreateTransactionMutation() {
  const { createTransaction } = useData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}

export function useUpdateTransactionMutation() {
  const { updateTransaction } = useData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Transaction> }) =>
      updateTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}

export function useDeleteTransactionMutation() {
  const { deleteTransaction } = useData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}

// Category hooks
export function useCategoriesQuery() {
  const { getCategories, isInitialized } = useData();

  return useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: isInitialized,
  });
}

export function useCreateCategoryMutation() {
  const { createCategory } = useData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}

export function useUpdateCategoryMutation() {
  const { updateCategory } = useData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Category> }) =>
      updateCategory(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}

export function useDeleteCategoryMutation() {
  const { deleteCategory } = useData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}

// Bank accounts hooks
export function useBankAccountsQuery() {
  const { getBankAccounts } = useData();

  return useQuery({
    queryKey: ['bank-accounts'],
    queryFn: getBankAccounts,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useCreateBankAccountMutation() {
  const { createBankAccount } = useData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBankAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
  });
}

export function useUpdateBankAccountMutation() {
  const { updateBankAccount } = useData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<any> }) =>
      updateBankAccount(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
  });
}

export function useDeleteBankAccountMutation() {
  const { deleteBankAccount } = useData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteBankAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
  });
}

// Insight hooks
export function useInsightsQuery() {
  const { getInsights, isInitialized } = useData();

  return useQuery({
    queryKey: ['insights'],
    queryFn: getInsights,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: isInitialized,
  });
}

export function useGenerateInsightsMutation() {
  const { generateInsights } = useData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateInsights,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insights'] });
    },
  });
}

// Utility hooks
export function useRefreshAllDataMutation() {
  const { refreshAllData } = useData();

  return useMutation({
    mutationFn: refreshAllData,
  });
}

export function useClearAllDataMutation() {
  const { clearAllData } = useData();

  return useMutation({
    mutationFn: clearAllData,
  });
}

// Compound hooks for common operations
export function useBudgetData() {
  const dashboardQuery = useDashboardSummaryQuery();
  const transactionsQuery = useTransactionsQuery();
  const categoriesQuery = useCategoriesQuery();
  const insightsQuery = useInsightsQuery();
  const bankAccountsQuery = useBankAccountsQuery();

  return {
    dashboard: dashboardQuery,
    transactions: transactionsQuery,
    categories: categoriesQuery,
    insights: insightsQuery,
    bankAccounts: bankAccountsQuery,
    isLoading: dashboardQuery.isLoading || transactionsQuery.isLoading || categoriesQuery.isLoading,
    isError: dashboardQuery.isError || transactionsQuery.isError || categoriesQuery.isError,
    error: dashboardQuery.error || transactionsQuery.error || categoriesQuery.error,
  };
}

// Hook for optimistic updates
export function useOptimisticTransaction() {
  const queryClient = useQueryClient();

  const addOptimisticTransaction = (newTransaction: Transaction) => {
    queryClient.setQueryData(['transactions'], (old: Transaction[] = []) => [
      ...old,
      newTransaction,
    ]);

    // Also update dashboard optimistically
    queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
  };

  const updateOptimisticTransaction = (id: number, updates: Partial<Transaction>) => {
    queryClient.setQueryData(['transactions'], (old: Transaction[] = []) =>
      old.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );

    queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
  };

  const removeOptimisticTransaction = (id: number) => {
    queryClient.setQueryData(['transactions'], (old: Transaction[] = []) =>
      old.filter((t) => t.id !== id)
    );

    queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
  };

  return {
    addOptimisticTransaction,
    updateOptimisticTransaction,
    removeOptimisticTransaction,
  };
}

// Hook for optimistic categories
export function useOptimisticCategory() {
  const queryClient = useQueryClient();

  const addOptimisticCategory = (newCategory: Category) => {
    queryClient.setQueryData(['categories'], (old: Category[] = []) => [...old, newCategory]);
  };

  const updateOptimisticCategory = (id: number, updates: Partial<Category>) => {
    queryClient.setQueryData(['categories'], (old: Category[] = []) =>
      old.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const removeOptimisticCategory = (id: number) => {
    queryClient.setQueryData(['categories'], (old: Category[] = []) =>
      old.filter((c) => c.id !== id)
    );
  };

  return {
    addOptimisticCategory,
    updateOptimisticCategory,
    removeOptimisticCategory,
  };
}

// Data prefetching hooks
export function usePrefetchBudgetData() {
  const queryClient = useQueryClient();
  const { getDashboardSummary, getTransactions, getCategories } = useData();

  const prefetchAll = async () => {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ['dashboard-summary'],
        queryFn: getDashboardSummary,
        staleTime: 30000,
      }),
      queryClient.prefetchQuery({
        queryKey: ['transactions'],
        queryFn: getTransactions,
        staleTime: 30000,
      }),
      queryClient.prefetchQuery({
        queryKey: ['categories'],
        queryFn: getCategories,
        staleTime: 2 * 60 * 1000,
      }),
    ]);
  };

  return { prefetchAll };
}

// Background sync hooks
export function useBackgroundSync() {
  const { refreshAllData } = useData();
  const queryClient = useQueryClient();

  const syncInBackground = async () => {
    try {
      await refreshAllData();
      return true;
    } catch (error) {
      console.error('Background sync failed:', error);
      return false;
    }
  };

  const invalidateStaleData = () => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const now = Date.now();
        const staleTime = query.options.staleTime ?? 0;
        return now - (query.state.dataUpdatedAt ?? 0) > staleTime;
      },
    });
  };

  return {
    syncInBackground,
    invalidateStaleData,
  };
}
