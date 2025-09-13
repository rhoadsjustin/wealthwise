import { useState, useEffect, createContext, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  hasCompletedOnboarding: boolean;
  isBiometricSupported: boolean;
  isBiometricEnabled: boolean;
  login: (username: string) => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  authenticateWithBiometrics: () => Promise<boolean>;
  enableBiometricAuth: () => Promise<boolean>;
  disableBiometricAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USERNAME: 'smartbudget_username',
  ONBOARDING_COMPLETE: 'smartbudget_onboarding_complete',
  BIOMETRIC_ENABLED: 'smartbudget_biometric_enabled',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);

  // Check biometric support on mount
  useEffect(() => {
    const checkBiometricSupport = async () => {
      try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        setIsBiometricSupported(compatible);

        if (compatible) {
          const savedBiometricPref = await SecureStore.getItemAsync(STORAGE_KEYS.BIOMETRIC_ENABLED);
          setIsBiometricEnabled(savedBiometricPref === 'true');
        }
      } catch (error) {
        console.error('Error checking biometric support:', error);
        setIsBiometricSupported(false);
      }
    };

    checkBiometricSupport();
  }, []);

  // Check for existing authentication - For testing, reset auth state on mount
  useEffect(() => {
    const loadAuthState = async () => {
      try {
        // For testing purposes, clear all auth data on app mount
        console.log('🔄 [TEST MODE] Clearing auth and onboarding state...');
        await SecureStore.deleteItemAsync(STORAGE_KEYS.USERNAME);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.ONBOARDING_COMPLETE);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.BIOMETRIC_ENABLED);
        
        // Reset all state to initial values
        setUsername(null);
        setIsAuthenticated(false);
        setHasCompletedOnboarding(false);
        setIsBiometricEnabled(false);
        
        console.log('✅ [TEST MODE] Auth state cleared - ready for onboarding');
      } catch (error) {
        console.error('Error clearing auth state:', error);
      }
    };

    loadAuthState();
  }, []);

  const login = async (userUsername: string) => {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.USERNAME, userUsername);
      setUsername(userUsername);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error during login:', error);
      throw new Error('Failed to save authentication data');
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USERNAME);
      setUsername(null);
      setIsAuthenticated(false);
      // Note: We don't remove onboarding completion status
    } catch (error) {
      console.error('Error during logout:', error);
      throw new Error('Failed to clear authentication data');
    }
  };

  const completeOnboarding = async () => {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
      setHasCompletedOnboarding(true);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      throw new Error('Failed to save onboarding status');
    }
  };

  const authenticateWithBiometrics = async (): Promise<boolean> => {
    if (!isBiometricSupported) return false;

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access your budget',
        fallbackLabel: 'Use passcode',
      });

      return result.success;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  };

  const enableBiometricAuth = async (): Promise<boolean> => {
    if (!isBiometricSupported) return false;

    try {
      // Check if the device has enrolled biometrics
      const enrolledLevel = await LocalAuthentication.getEnrolledLevelAsync();
      if (enrolledLevel === LocalAuthentication.SecurityLevel.NONE) {
        return false;
      }

      // Check if biometric hardware is available
      const isAvailable = await LocalAuthentication.hasHardwareAsync();
      if (!isAvailable) {
        return false;
      }

      // Save the preference
      await SecureStore.setItemAsync(STORAGE_KEYS.BIOMETRIC_ENABLED, 'true');
      setIsBiometricEnabled(true);
      return true;
    } catch (error) {
      console.error('Error enabling biometric auth:', error);
      return false;
    }
  };

  const disableBiometricAuth = async (): Promise<void> => {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.BIOMETRIC_ENABLED, 'false');
      setIsBiometricEnabled(false);
    } catch (error) {
      console.error('Error disabling biometric auth:', error);
      throw new Error('Failed to disable biometric authentication');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        username,
        hasCompletedOnboarding,
        isBiometricSupported,
        isBiometricEnabled,
        login,
        logout,
        completeOnboarding,
        authenticateWithBiometrics,
        enableBiometricAuth,
        disableBiometricAuth,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
