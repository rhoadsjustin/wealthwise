import { useRouter } from 'expo-router';
import OnboardingFlow from '@/components/OnboardingFlow';
import { useAuth } from '@/context/useAuth';
import { useData } from '@/context/DataContext';

export default function OnboardingScreen() {
  const router = useRouter();
  const { login, completeOnboarding } = useAuth();
  const { updateCategoriesBudgets } = useData();

  const handleComplete = async (userData: {
    username: string;
    hasBiometrics: boolean;
    budgetCategories?: Array<{ name: string; budget: string }>;
  }) => {
    await login(userData.username);
    if (userData.budgetCategories && userData.budgetCategories.length > 0) {
      try {
        await updateCategoriesBudgets(userData.budgetCategories);
      } catch {}
    }
    await completeOnboarding();
    router.replace('/(tabs)');
  };

  return <OnboardingFlow onComplete={handleComplete} />;
}

