import '../global.css';
import 'react-native-gesture-handler';

import { Stack, useRouter, usePathname } from 'expo-router';
import { Platform, StatusBar, View } from 'react-native';
import { AuthProvider, useAuth } from '../context/useAuth';
import { DataProvider, useData } from '../context/DataContext';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AddTransactionModal from '../components/AddTransactionModal';
import { ToastProvider } from '../components/Toast';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { VectorStoreProvider } from '@/context/RAGContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import HeaderProfileButton from '@/components/HeaderProfileButton';

// Create context for sharing data across tabs
interface AppDataContextType {
  summary: any;
  insights: any;
  user: any;
  transactions: any;
  categories: any;
  summaryLoading: boolean;
  insightsLoading: boolean;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
  refreshAppData: () => Promise<void>;
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
  } = useData();

  const [summary, setSummary] = useState<any>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(false);
  const [insightsLoading, setInsightsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!isInitialized) return;

    let mounted = true;

    const load = async () => {
      try {
        setSummaryLoading(true);
        const [s, u, txs, cats] = await Promise.all([
          getDashboardSummary(),
          getUserProfile(),
          getTransactions(),
          getCategories(),
        ]);
        if (!mounted) return;
        setSummary(s);
        setUser(u);
        setTransactions(txs);
        setCategories(cats);
      } catch (e) {
        console.warn('Failed to load app data:', e);
        if (!mounted) return;
        setSummary({
          totalIncome: 0,
          totalExpenses: 0,
          totalBudget: 0,
          remainingBudget: 0,
          categoryBreakdown: [],
          recentTransactions: [],
        } as any);
        setUser(null);
        setTransactions([]);
        setCategories([]);
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
  ]);

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
      const [s, u, txs, cats] = await Promise.all([
        getDashboardSummary(),
        getUserProfile(),
        getTransactions(),
        getCategories(),
      ]);
      setSummary(s);
      setUser(u);
      setTransactions(txs);
      setCategories(cats);
    } catch (e) {
      console.warn('Manual refresh failed:', e);
    } finally {
      setSummaryLoading(false);
    }
  }, [isInitialized, getDashboardSummary, getUserProfile, getTransactions, getCategories]);

  const contextValue: AppDataContextType = useMemo(
    () => ({
      summary,
      insights,
      user,
      transactions,
      categories,
      summaryLoading,
      insightsLoading,
      isAddModalOpen,
      setIsAddModalOpen,
      refreshAppData,
    }),
    [
      summary,
      insights,
      user,
      transactions,
      categories,
      summaryLoading,
      insightsLoading,
      isAddModalOpen,
      refreshAppData,
    ]
  );

  return <AppDataContext.Provider value={contextValue}>{children}</AppDataContext.Provider>;
}

function AppContent() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={{ flex: 1, backgroundColor: '#F7F9FC' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
      <DataProvider userId={1} initialBudgetCategories={null}>
        <AppDataProvider>
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: '#FFFFFF',
              },
              headerTitleStyle: {
                fontSize: 18,
                fontWeight: '700',
                color: '#1F2937',
              },
              headerTintColor: '#0EA5E9',
              contentStyle: {
                backgroundColor: '#F7F9FC',
              },
            }}>
            <Stack.Screen
              name="(tabs)"
              options={{
                headerRight: () => (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignContent: 'center',
                      alignItems: 'center',
                      paddingHorizontal: 8,
                      paddingBottom: 2,
                    }}>
                    <HeaderProfileButton />
                  </View>
                ),
                title: 'Wealth Wise',
                headerBackVisible: false,
              }}
            />
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="budget-setup" options={{ headerShown: false }} />
            <Stack.Screen name="auth" options={{ headerShown: false }} />
            <Stack.Screen
              name="add-transaction"
              options={{ headerShown: false, presentation: 'formSheet' }}
            />
            <Stack.Screen
              name="gamify"
              options={{ headerShown: false, presentation: 'formSheet' }}
            />
            <Stack.Screen
              name="edit-transaction/[id]"
              options={{ headerShown: false, presentation: 'formSheet' }}
            />
            <Stack.Screen
              name="categories"
              options={{ headerShown: false, presentation: 'modal' }}
            />
            <Stack.Screen
              name="modal"
              options={{
                presentation: 'modal',
                headerShown: false,
                contentStyle: {
                  backgroundColor: '#FFFFFF',
                },
              }}
            />
            <Stack.Screen
              name="transactions-modal"
              options={{
                presentation: 'modal',
                headerShown: false,
                contentStyle: {
                  backgroundColor: '#FFFFFF',
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
