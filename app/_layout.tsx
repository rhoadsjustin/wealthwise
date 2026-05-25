import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar, View } from 'react-native';
import { AuthProvider } from '../context/useAuth';
import { DataProvider, useData, Bill, Debt } from '../context/DataContext';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ToastProvider } from '../components/Toast';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { VectorStoreProvider } from '@/context/RAGContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { indexCategoryDocs } from '@/lib/ai/categorizer';
import { initializeExecutorch } from '@/lib/ai/executorchInit';
import { vexo } from 'vexo-analytics';

if (!__DEV__) {
  vexo('7eeb416e-f5a5-4742-b75d-31939f29182d');
}

void initializeExecutorch();

// Create context for sharing data across tabs
interface AppDataContextType {
  summary: any;
  insights: any;
  user: any;
  transactions: any;
  categories: any;
  savingsGoals: any;
  bills: Bill[];
  debts: Debt[];
  monthlyIncome: number | null;
  summaryLoading: boolean;
  insightsLoading: boolean;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
  refreshAppData: () => Promise<void>;
  updateMonthlyIncome: (value: number | null) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppData must be used within AppDataProvider');
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
    getBills,
    getDebts,
    monthlyIncome: contextMonthlyIncome,
    updateMonthlyIncome,
    getMonthlyIncome,
  } = useData();

  const [summary, setSummary] = useState<any>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<any[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(false);
  const [insightsLoading, setInsightsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!isInitialized) return;

    let mounted = true;

    const load = async () => {
      try {
        setSummaryLoading(true);
        const [s, u, txs, cats, goals, billList, debtList] = await Promise.all([
          getDashboardSummary(),
          getUserProfile(),
          getTransactions(),
          getCategories(),
          getSavingsGoals(),
          getBills(),
          getDebts(),
        ]);
        if (!mounted) return;
        setSummary(s);
        setUser(u);
        setTransactions(txs);
        setCategories(cats);
        setSavingsGoals(goals);
        setBills(billList);
        setDebts(debtList);
        try {
          await indexCategoryDocs(cats);
        } catch {}
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
          netIncomeAfterSavings: 0,
          savingsGoals: [],
          recentTransactions: [],
        } as any);
        setUser(null);
        setTransactions([]);
        setCategories([]);
        setSavingsGoals([]);
        setBills([]);
        setDebts([]);
      } finally {
        if (mounted) setSummaryLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [
    isInitialized,
    dataVersion,
    getDashboardSummary,
    getUserProfile,
    getTransactions,
    getCategories,
    getSavingsGoals,
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

  const refreshAppData = useCallback(async () => {
    if (!isInitialized) return;
    setSummaryLoading(true);
    try {
      const [s, u, txs, cats, goals, billList, debtList] = await Promise.all([
        getDashboardSummary(),
        getUserProfile(),
        getTransactions(),
        getCategories(),
        getSavingsGoals(),
        getBills(),
        getDebts(),
      ]);
      setSummary(s);
      setUser(u);
      setTransactions(txs);
      setCategories(cats);
      setSavingsGoals(goals);
      setBills(billList);
      setDebts(debtList);
    } catch (e) {
      console.warn('Manual refresh failed:', e);
    } finally {
      setSummaryLoading(false);
    }
  }, [
    isInitialized,
    getDashboardSummary,
    getUserProfile,
    getTransactions,
    getCategories,
    getSavingsGoals,
    getBills,
    getDebts,
  ]);

  const contextValue: AppDataContextType = useMemo(
    () => ({
      summary,
      insights,
      user,
      transactions,
      categories,
      savingsGoals,
      bills,
      debts,
      monthlyIncome: summary?.monthlyIncome ?? contextMonthlyIncome ?? null,
      summaryLoading,
      insightsLoading,
      isAddModalOpen,
      setIsAddModalOpen,
      refreshAppData,
      updateMonthlyIncome,
    }),
    [
      summary,
      insights,
      user,
      transactions,
      categories,
      savingsGoals,
      bills,
      debts,
      contextMonthlyIncome,
      summaryLoading,
      insightsLoading,
      isAddModalOpen,
      refreshAppData,
      updateMonthlyIncome,
    ]
  );

  return <AppDataContext.Provider value={contextValue}>{children}</AppDataContext.Provider>;
}

function AppContent() {
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
              name="add-transaction"
              options={{ headerShown: false, presentation: 'modal' }}
            />
            <Stack.Screen
              name="profile"
              options={{ headerShown: false, presentation: 'formSheet' }}
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
              name="transactions-modal"
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
            </ToastProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </VectorStoreProvider>
    </GestureHandlerRootView>
  );
}
