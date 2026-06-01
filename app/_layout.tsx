import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar, View } from 'react-native';
import { AuthProvider } from '../context/useAuth';
import {
  DataProvider,
  useData,
  Bill,
  Debt,
  Category,
  DashboardSummary,
  Insight,
  IncomeSource,
  SavingsGoal,
  SavingsAccount,
  Transaction,
  User,
} from '../context/DataContext';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ToastProvider } from '../context/ToastContext';
import { Toaster } from '../components/Toaster';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { VectorStoreProvider } from '@/context/RAGContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { indexCategoryDocs } from '@/lib/ai/categorizer';
import { initializeExecutorch } from '@/lib/ai/executorchInit';
import { buildCategorySpendMap } from '@/lib/activityDerived';
import {
  maskBills,
  maskCategories,
  maskDashboardSummary,
  maskDebts,
  maskIncomeSources,
  maskInsights,
  maskSavingsAccounts,
  maskSavingsGoals,
  maskTransactions,
} from '@/lib/demoMode';
import { vexo } from 'vexo-analytics';

if (!__DEV__) {
  vexo('7eeb416e-f5a5-4742-b75d-31939f29182d');
}

// Create context for sharing data across tabs
interface AppDataContextType {
  summary: DashboardSummary | null;
  insights: Insight[];
  user: User | null;
  transactions: Transaction[];
  categories: Category[];
  savingsGoals: SavingsGoal[];
  savingsAccounts: SavingsAccount[];
  incomeSources: IncomeSource[];
  bills: Bill[];
  debts: Debt[];
  monthlyIncome: number | null;
  isDemoMode: boolean;
  summaryLoading: boolean;
  insightsLoading: boolean;
  activityLoading: boolean;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
  refreshAppData: () => Promise<void>;
  refreshSummaryData: () => Promise<void>;
  refreshActivityData: () => Promise<void>;
  refreshCategoryData: () => Promise<void>;
  updateMonthlyIncome: (value: number | null) => Promise<void>;
}

interface ActivityDataContextType {
  transactions: Transaction[];
  categories: Category[];
  isDemoMode: boolean;
  activityLoading: boolean;
  refreshActivityData: () => Promise<void>;
}

interface CategoryDataContextType {
  categories: Category[];
  transactions: Transaction[];
  categorySpendMap: Map<number, number>;
  categoryLoading: boolean;
  refreshCategoryData: () => Promise<void>;
}

interface SummaryDataContextType {
  summary: DashboardSummary | null;
  user: User | null;
  savingsGoals: SavingsGoal[];
  savingsAccounts: SavingsAccount[];
  incomeSources: IncomeSource[];
  bills: Bill[];
  debts: Debt[];
  monthlyIncome: number | null;
  isDemoMode: boolean;
  summaryLoading: boolean;
  refreshSummaryData: () => Promise<void>;
  updateMonthlyIncome: (value: number | null) => Promise<void>;
}

interface InsightsDataContextType {
  insights: Insight[];
  isDemoMode: boolean;
  insightsLoading: boolean;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);
const ActivityDataContext = createContext<ActivityDataContextType | undefined>(undefined);
const CategoryDataContext = createContext<CategoryDataContextType | undefined>(undefined);
const SummaryDataContext = createContext<SummaryDataContextType | undefined>(undefined);
const InsightsDataContext = createContext<InsightsDataContextType | undefined>(undefined);

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppData must be used within AppDataProvider');
  }
  return context;
};

export const useActivityData = () => {
  const context = useContext(ActivityDataContext);
  if (context === undefined) {
    throw new Error('useActivityData must be used within AppDataProvider');
  }
  return context;
};

export const useCategoryData = () => {
  const context = useContext(CategoryDataContext);
  if (context === undefined) {
    throw new Error('useCategoryData must be used within AppDataProvider');
  }
  return context;
};

export const useSummaryData = () => {
  const context = useContext(SummaryDataContext);
  if (context === undefined) {
    throw new Error('useSummaryData must be used within AppDataProvider');
  }
  return context;
};

export const useInsightsData = () => {
  const context = useContext(InsightsDataContext);
  if (context === undefined) {
    throw new Error('useInsightsData must be used within AppDataProvider');
  }
  return context;
};

function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const {
    isInitialized,
    dataVersion,
    getDashboardSummary,
    getInsights,
    getUserProfile,
    getTransactions,
    getCategories,
    getSavingsGoals,
    getSavingsAccounts,
    getIncomeSources,
    getBills,
    getDebts,
    monthlyIncome: contextMonthlyIncome,
    isDemoMode,
    demoModeScale,
    updateMonthlyIncome,
    getMonthlyIncome,
  } = useData();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [savingsAccounts, setSavingsAccounts] = useState<SavingsAccount[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(false);
  const [insightsLoading, setInsightsLoading] = useState<boolean>(false);
  const [activityLoading, setActivityLoading] = useState<boolean>(false);

  const loadActivityData = useCallback(async () => {
    const [txs, cats] = await Promise.all([getTransactions(), getCategories()]);
    setTransactions(txs);
    setCategories(cats);
    try {
      await indexCategoryDocs(cats);
    } catch {}
  }, [getTransactions, getCategories]);

  const loadSummaryData = useCallback(async () => {
    const [nextSummary, nextUser, goals, accounts, sources, billList, debtList] = await Promise.all(
      [
        getDashboardSummary(),
        getUserProfile(),
        getSavingsGoals(),
        getSavingsAccounts(),
        getIncomeSources(),
        getBills(),
        getDebts(),
      ]
    );

    setSummary(nextSummary);
    setUser(nextUser);
    setSavingsGoals(goals);
    setSavingsAccounts(accounts);
    setIncomeSources(sources);
    setBills(billList);
    setDebts(debtList);
  }, [
    getDashboardSummary,
    getUserProfile,
    getSavingsGoals,
    getSavingsAccounts,
    getIncomeSources,
    getBills,
    getDebts,
  ]);

  useEffect(() => {
    if (!isInitialized) return;

    let mounted = true;

    const load = async () => {
      try {
        setSummaryLoading(true);
        setActivityLoading(true);
        const [activityResult, summaryResult] = await Promise.allSettled([
          Promise.all([getTransactions(), getCategories()]),
          Promise.all([
            getDashboardSummary(),
            getUserProfile(),
            getSavingsGoals(),
            getSavingsAccounts(),
            getIncomeSources(),
            getBills(),
            getDebts(),
          ]),
        ]);
        if (!mounted) return;

        if (activityResult.status === 'fulfilled') {
          const [txs, cats] = activityResult.value;
          setTransactions(txs);
          setCategories(cats);
          try {
            await indexCategoryDocs(cats);
          } catch {}
        }

        if (summaryResult.status === 'fulfilled') {
          const [s, u, goals, accounts, sources, billList, debtList] = summaryResult.value;
          setSummary(s);
          setUser(u);
          setSavingsGoals(goals);
          setSavingsAccounts(accounts);
          setIncomeSources(sources);
          setBills(billList);
          setDebts(debtList);
        }
      } catch (e) {
        console.warn('Failed to load app data:', e);
        if (!mounted) return;
        setSummary({
          totalIncome: 0,
          totalExpenses: 0,
          totalBudget: 0,
          remainingBudget: 0,
          incomeBaseline: 0,
          incomeRemaining: 0,
          actualIncome: 0,
          monthlyIncome: null,
          categoryBreakdown: [],
          totalSavingsPlanned: 0,
          totalSavingsProgress: 0,
          totalSavingsBalance: 0,
          netIncomeAfterSavings: 0,
          recurringGrossIncome: 0,
          recurringNetIncome: 0,
          recurringTaxWithheld: 0,
          recurringDeductions: 0,
          oneOffIncome: 0,
          savingsGoals: [],
          savingsAccounts: [],
          recentTransactions: [],
        } as any);
        setUser(null);
        setTransactions([]);
        setCategories([]);
        setSavingsGoals([]);
        setSavingsAccounts([]);
        setIncomeSources([]);
        setBills([]);
        setDebts([]);
      } finally {
        if (mounted) setSummaryLoading(false);
        if (mounted) setActivityLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [
    isInitialized,
    getDashboardSummary,
    getUserProfile,
    getTransactions,
    getCategories,
    getSavingsGoals,
    getSavingsAccounts,
    getIncomeSources,
    getBills,
    getDebts,
  ]);

  useEffect(() => {
    if (!isInitialized) return;
    getMonthlyIncome();
  }, [isInitialized, getMonthlyIncome]);

  useEffect(() => {
    if (!isInitialized) return;
    let mounted = true;
    const loadInsights = async () => {
      try {
        setInsightsLoading(true);
        const ins = await getInsights();
        if (!mounted) return;
        setInsights(ins);
      } catch (e) {
        console.warn('Failed to load insights:', e);
        if (!mounted) return;
        setInsights([]);
      } finally {
        if (mounted) setInsightsLoading(false);
      }
    };
    loadInsights();
    return () => {
      mounted = false;
    };
  }, [isInitialized, dataVersion, getInsights]);

  const refreshSummaryData = useCallback(async () => {
    if (!isInitialized) return;
    setSummaryLoading(true);
    try {
      await loadSummaryData();
    } catch (e) {
      console.warn('Summary refresh failed:', e);
    } finally {
      setSummaryLoading(false);
    }
  }, [isInitialized, loadSummaryData]);

  const refreshActivityData = useCallback(async () => {
    if (!isInitialized) return;
    setActivityLoading(true);
    try {
      await loadActivityData();
    } catch (e) {
      console.warn('Activity refresh failed:', e);
    } finally {
      setActivityLoading(false);
    }
  }, [isInitialized, loadActivityData]);

  const refreshCategoryData = useCallback(async () => {
    await refreshActivityData();
  }, [refreshActivityData]);

  const refreshAppData = useCallback(async () => {
    if (!isInitialized) return;
    setSummaryLoading(true);
    setActivityLoading(true);
    try {
      await Promise.all([loadSummaryData(), loadActivityData()]);
    } catch (e) {
      console.warn('Manual refresh failed:', e);
    } finally {
      setSummaryLoading(false);
      setActivityLoading(false);
    }
  }, [isInitialized, loadActivityData, loadSummaryData]);

  const displayedSummary = useMemo(
    () =>
      isDemoMode && summary && demoModeScale
        ? maskDashboardSummary(summary, demoModeScale)
        : summary,
    [demoModeScale, isDemoMode, summary]
  );
  const displayedInsights = useMemo(
    () => (isDemoMode && demoModeScale ? maskInsights(insights, demoModeScale) : insights),
    [demoModeScale, insights, isDemoMode]
  );
  const displayedTransactions = useMemo(
    () =>
      isDemoMode && demoModeScale ? maskTransactions(transactions, demoModeScale) : transactions,
    [demoModeScale, isDemoMode, transactions]
  );
  const displayedCategories = useMemo(
    () => (isDemoMode && demoModeScale ? maskCategories(categories, demoModeScale) : categories),
    [categories, demoModeScale, isDemoMode]
  );
  const displayedSavingsGoals = useMemo(
    () =>
      isDemoMode && demoModeScale ? maskSavingsGoals(savingsGoals, demoModeScale) : savingsGoals,
    [demoModeScale, isDemoMode, savingsGoals]
  );
  const displayedSavingsAccounts = useMemo(
    () =>
      isDemoMode && demoModeScale
        ? maskSavingsAccounts(savingsAccounts, demoModeScale)
        : savingsAccounts,
    [demoModeScale, isDemoMode, savingsAccounts]
  );
  const displayedIncomeSources = useMemo(
    () =>
      isDemoMode && demoModeScale ? maskIncomeSources(incomeSources, demoModeScale) : incomeSources,
    [demoModeScale, incomeSources, isDemoMode]
  );
  const displayedBills = useMemo(
    () => (isDemoMode && demoModeScale ? maskBills(bills, demoModeScale) : bills),
    [bills, demoModeScale, isDemoMode]
  );
  const displayedDebts = useMemo(
    () => (isDemoMode && demoModeScale ? maskDebts(debts, demoModeScale) : debts),
    [debts, demoModeScale, isDemoMode]
  );

  const categorySpendMap = useMemo(
    () => buildCategorySpendMap(displayedTransactions),
    [displayedTransactions]
  );

  const contextValue: AppDataContextType = useMemo(
    () => ({
      summary: displayedSummary,
      insights: displayedInsights,
      user,
      transactions: displayedTransactions,
      categories: displayedCategories,
      savingsGoals: displayedSavingsGoals,
      savingsAccounts: displayedSavingsAccounts,
      incomeSources: displayedIncomeSources,
      bills: displayedBills,
      debts: displayedDebts,
      monthlyIncome: displayedSummary?.monthlyIncome ?? contextMonthlyIncome ?? null,
      isDemoMode,
      summaryLoading,
      insightsLoading,
      activityLoading,
      isAddModalOpen,
      setIsAddModalOpen,
      refreshAppData,
      refreshSummaryData,
      refreshActivityData,
      refreshCategoryData,
      updateMonthlyIncome,
    }),
    [
      displayedSummary,
      displayedInsights,
      user,
      displayedTransactions,
      displayedCategories,
      displayedSavingsGoals,
      displayedSavingsAccounts,
      displayedIncomeSources,
      displayedBills,
      displayedDebts,
      contextMonthlyIncome,
      isDemoMode,
      summaryLoading,
      insightsLoading,
      activityLoading,
      isAddModalOpen,
      refreshAppData,
      refreshSummaryData,
      refreshActivityData,
      refreshCategoryData,
      updateMonthlyIncome,
    ]
  );
  const activityContextValue = useMemo<ActivityDataContextType>(
    () => ({
      transactions: displayedTransactions,
      categories: displayedCategories,
      isDemoMode,
      activityLoading,
      refreshActivityData,
    }),
    [displayedTransactions, displayedCategories, isDemoMode, activityLoading, refreshActivityData]
  );

  const categoryContextValue = useMemo<CategoryDataContextType>(
    () => ({
      categories: displayedCategories,
      transactions: displayedTransactions,
      categorySpendMap,
      categoryLoading: activityLoading,
      refreshCategoryData,
    }),
    [
      displayedCategories,
      displayedTransactions,
      categorySpendMap,
      activityLoading,
      refreshCategoryData,
    ]
  );

  const summaryContextValue = useMemo<SummaryDataContextType>(
    () => ({
      summary: displayedSummary,
      user,
      savingsGoals: displayedSavingsGoals,
      savingsAccounts: displayedSavingsAccounts,
      incomeSources: displayedIncomeSources,
      bills: displayedBills,
      debts: displayedDebts,
      monthlyIncome: displayedSummary?.monthlyIncome ?? contextMonthlyIncome ?? null,
      isDemoMode,
      summaryLoading,
      refreshSummaryData,
      updateMonthlyIncome,
    }),
    [
      displayedSummary,
      user,
      displayedSavingsGoals,
      displayedSavingsAccounts,
      displayedIncomeSources,
      displayedBills,
      displayedDebts,
      contextMonthlyIncome,
      isDemoMode,
      summaryLoading,
      refreshSummaryData,
      updateMonthlyIncome,
    ]
  );

  const insightsContextValue = useMemo<InsightsDataContextType>(
    () => ({
      insights: displayedInsights,
      isDemoMode,
      insightsLoading,
    }),
    [displayedInsights, isDemoMode, insightsLoading]
  );

  return (
    <AppDataContext.Provider value={contextValue}>
      <SummaryDataContext.Provider value={summaryContextValue}>
        <InsightsDataContext.Provider value={insightsContextValue}>
          <ActivityDataContext.Provider value={activityContextValue}>
            <CategoryDataContext.Provider value={categoryContextValue}>
              {children}
            </CategoryDataContext.Provider>
          </ActivityDataContext.Provider>
        </InsightsDataContext.Provider>
      </SummaryDataContext.Provider>
    </AppDataContext.Provider>
  );
}

function AppContent() {
  useEffect(() => {
    void initializeExecutorch();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#050816' }}>
      <StatusBar barStyle="light-content" backgroundColor="#050816" translucent={false} />
      <DataProvider userId={1} initialBudgetCategories={null}>
        <AppDataProvider>
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: '#050816',
              },
              headerTitleStyle: {
                fontSize: 18,
                fontWeight: '700',
                color: '#F8FAFC',
              },
              headerTintColor: '#59F7A5',
              contentStyle: {
                backgroundColor: '#050816',
              },
            }}>
            <Stack.Screen
              name="(tabs)"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="budget-setup" options={{ headerShown: false }} />
            <Stack.Screen name="auth" options={{ headerShown: false }} />
            <Stack.Screen
              name="profile"
              options={{ headerShown: false, presentation: 'fullScreenModal' }}
            />
            <Stack.Screen
              name="apple-card-import"
              options={{ headerShown: false, presentation: 'modal' }}
            />
            <Stack.Screen
              name="transaction-import"
              options={{ headerShown: false, presentation: 'modal' }}
            />
            <Stack.Screen name="imports" options={{ headerShown: false, presentation: 'modal' }} />
            <Stack.Screen name="lock" options={{ headerShown: false }} />
            <Stack.Screen
              name="edit-transaction/[id]"
              options={{ headerShown: false, presentation: 'modal' }}
            />
            <Stack.Screen
              name="categories"
              options={{ headerShown: false, presentation: 'modal' }}
            />
            <Stack.Screen
              name="bill-modal"
              options={{ headerShown: false, presentation: 'modal' }}
            />
            <Stack.Screen
              name="debt-modal"
              options={{ headerShown: false, presentation: 'modal' }}
            />
            <Stack.Screen
              name="debt-payment-modal"
              options={{ headerShown: false, presentation: 'modal' }}
            />
            <Stack.Screen
              name="modal"
              options={{
                presentation: 'modal',
                headerShown: false,
                contentStyle: {
                  backgroundColor: '#050816',
                },
              }}
            />
            <Stack.Screen
              name="savings-goal-modal"
              options={{
                presentation: 'modal',
                headerShown: false,
                contentStyle: {
                  backgroundColor: '#050816',
                },
              }}
            />
            <Stack.Screen
              name="savings-fund-modal"
              options={{
                presentation: 'modal',
                headerShown: false,
                contentStyle: {
                  backgroundColor: '#FFFFFF',
                },
              }}
            />
            <Stack.Screen
              name="month-overview"
              options={{
                presentation: 'modal',
                headerShown: false,
                sheetGrabberVisible: true,
                sheetAllowedDetents: 'fitToContents',
                contentStyle: {
                  backgroundColor: '#050816',
                },
              }}
            />
          </Stack>
        </AppDataProvider>
      </DataProvider>
    </View>
  );
}

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <VectorStoreProvider>
        <SafeAreaProvider>
          <AuthProvider>
            <ToastProvider>
              <AppContent />
              <Toaster />
            </ToastProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </VectorStoreProvider>
    </GestureHandlerRootView>
  );
}
