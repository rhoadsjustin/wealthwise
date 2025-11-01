import { useRouter } from 'expo-router';
import BiometricAuth from '@/components/BiometricAuth';
import { useAuth } from '@/context/useAuth';
import { localStorage } from '@/lib/local-storage';

export default function AuthScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const handleShowOnboarding = () => {
    void (async () => {
      try {
        await localStorage.init();
        await localStorage.setSetting('onboardingCompleted', false);
      } catch (error) {
        console.error('Failed to reset onboarding status', error);
      } finally {
        router.replace('/onboarding');
      }
    })();
  };

  return (
    <BiometricAuth
      onAuthenticated={(username) => login(username)}
      onShowOnboarding={handleShowOnboarding}
    />
  );
}
