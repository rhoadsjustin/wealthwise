import { Redirect } from 'expo-router';
import { useAuth } from '@/context/useAuth';

export default function RootIndex() {
  const { hasCompletedOnboarding, isAuthenticated } = useAuth();

  if (!hasCompletedOnboarding) return <Redirect href="/onboarding" />;
  if (!isAuthenticated) return <Redirect href="/auth" />;
  return <Redirect href="/(tabs)" />;
}

