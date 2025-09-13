import '../global.css';

import { Stack } from 'expo-router';
import { Platform, StatusBar, View } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { AuthProvider, useAuth } from '../context/useAuth';
import { DataProvider } from '../context/DataContext';
import { createContext, useContext, useState } from 'react';
import AddTransactionModal from '../components/AddTransactionModal';
import { ToastProvider } from '../components/Toast';
import {
  useDashboardSummaryQuery,
  useInsightsQuery,
  useUserProfileQuery,
  useTransactionsQuery,
  useCategoriesQuery,
} from '../lib/hooks';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { VectorStoreProvider } from '@/context/RAGContext';

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

  // Use the new local storage hooks
  const { data: summary, isLoading: summaryLoading } = useDashboardSummaryQuery();
  const { data: insights, isLoading: insightsLoading } = useInsightsQuery();
  const { data: user } = useUserProfileQuery();
  const { data: transactions } = useTransactionsQuery();
  const { data: categories } = useCategoriesQuery();

  const contextValue: AppDataContextType = {
    summary,
    insights,
    user,
    transactions,
    categories,
    summaryLoading,
    insightsLoading,
    isAddModalOpen,
    setIsAddModalOpen,
  };

  return <AppDataContext.Provider value={contextValue}>{children}</AppDataContext.Provider>;
}

function AppContent() {
  return (
    <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
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
                backgroundColor: '#FAFAFA',
              },
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="auth" options={{ headerShown: false }} />
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
    <QueryClientProvider client={queryClient}>
      <VectorStoreProvider>
        <SafeAreaProvider>
          <AuthProvider>
            <ToastProvider>
              <AppContent />
            </ToastProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </VectorStoreProvider>
    </QueryClientProvider>
  );
}
