import BiometricAuth from '@/components/BiometricAuth';
import { useAuth } from '@/context/useAuth';

export default function AuthScreen() {
  const { login } = useAuth();

  return (
    <BiometricAuth
      onAuthenticated={(username) => login(username)}
      onShowOnboarding={() => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('smartbudget_onboarding_complete');
          window.location.reload();
        }
      }}
    />
  );
}

