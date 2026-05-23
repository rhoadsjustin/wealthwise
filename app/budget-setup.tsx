import React from 'react';
import { useRouter } from 'expo-router';
import BudgetSetupFlow from '@/components/BudgetSetupFlow';
import { useAuth } from '@/context/useAuth';

export default function BudgetSetupScreen() {
  const router = useRouter();
  const { completeOnboarding } = useAuth();

  const handleFinish = async () => {
    await completeOnboarding();
    router.replace('/(tabs)');
  };

  return <BudgetSetupFlow onFinish={handleFinish} />;
}
