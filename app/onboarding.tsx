import { useRouter } from 'expo-router';
import OnboardingFlow from '@/components/OnboardingFlow';
import { useAuth } from '@/context/useAuth';

export default function OnboardingScreen() {
  const router = useRouter();
  const { login, completeOnboarding } = useAuth();

  const handleComplete = async (userData: {
    username: string;
    hasBiometrics: boolean;
    monthlyIncome: number | null;
  }) => {
    await login(userData.username);
    await completeOnboarding();
    // After onboarding, go straight to the main app tabs
    router.replace('/(tabs)');
  };

  return <OnboardingFlow onComplete={handleComplete} />;
}
