import { useRouter } from 'expo-router';
import OnboardingFlow from '@/components/OnboardingFlow';
import { useAuth } from '@/context/useAuth';

export default function OnboardingScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const handleComplete = async (userData: { username: string; hasBiometrics: boolean }) => {
    await login(userData.username);
    router.replace('/budget-setup');
  };

  return <OnboardingFlow onComplete={handleComplete} />;
}
