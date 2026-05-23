import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { localStorage } from '@/lib/local-storage';
import { isAppUnlocked } from '@/context/appLock';

export default function RootIndex() {
  const [requireLock, setRequireLock] = useState<boolean | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        await localStorage.init();
        const val = await localStorage.getSetting('requireAppLock');
        const hasCompletedOnboardingVal = await localStorage.getSetting('onboardingCompleted');
        setRequireLock(Boolean(val));
        setHasCompletedOnboarding(Boolean(hasCompletedOnboardingVal));
      } catch {
        setRequireLock(false);
        setHasCompletedOnboarding(false);
      }
    };
    load();
  }, []);

  // Wait until settings are loaded to avoid premature redirects
  if (hasCompletedOnboarding === null || requireLock === null) return null;

  if (!hasCompletedOnboarding) return <Redirect href="/onboarding" />;
  if (requireLock && !isAppUnlocked()) return <Redirect href="/lock" />;
  return <Redirect href="/(tabs)" />;
}
