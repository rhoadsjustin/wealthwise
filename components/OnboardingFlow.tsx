import { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Dimensions, Platform, KeyboardAvoidingView } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { Card, CardContent } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { Progress } from './Progress';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '@/context/DataContext';

const { height } = Dimensions.get('window');

interface OnboardingFlowProps {
  onComplete: (userData: {
    username: string;
    hasBiometrics: boolean;
    monthlyIncome: number | null;
  }) => void;
}

interface FeatureSlide {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlight: string;
}

const features: FeatureSlide[] = [
  {
    icon: <MaterialIcons name="psychology" size={48} color="#8190B3" />,
    title: 'AI-Powered Insights',
    description:
      'Get private, on-device recommendations and automatic expense categorization without sending your budget data to a server',
    highlight: 'Private insights built for daily budgeting',
  },
  {
    icon: <Ionicons name="wallet" size={48} color="#8190B3" />,
    title: 'Smart Budgeting',
    description:
      'Set budgets that adapt to your spending patterns and help you save more effectively',
    highlight: 'Achieve your financial goals faster',
  },
  {
    icon: <Ionicons name="trending-up" size={48} color="#8190B3" />,
    title: 'Detailed Analytics',
    description: 'Beautiful charts and reports give you deep insights into your spending habits',
    highlight: 'Make data-driven financial decisions',
  },
  {
    icon: <Ionicons name="shield-checkmark" size={48} color="#8190B3" />,
    title: 'Privacy First',
    description:
      'Your financial data stays on your device with local storage, optional app lock, and on-device AI assistance',
    highlight: 'Your budget stays on your device',
  },
  {
    icon: <Ionicons name="flag" size={48} color="#8190B3" />,
    title: 'Savings Goals',
    description:
      'Track emergency funds, vacations, and other goals with progress updates and monthly contribution planning',
    highlight: 'See every goal move forward',
  },
];

// Budget setup moved to standalone flow

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [biometricsSupported, setBiometricsSupported] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [incomeInput, setIncomeInput] = useState('');
  const [incomeError, setIncomeError] = useState<string | null>(null);
  const [monthlyIncomeValue, setMonthlyIncomeValue] = useState<number | null>(null);
  // Features + Account Setup + Biometrics Setup (budget moved to separate flow)
  const totalSteps = useMemo(() => features.length + 3, []);
  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Progress is animated within <Progress />

  const { top, bottom } = useSafeAreaInsets();
  const { updateMonthlyIncome, monthlyIncome } = useData();
  useEffect(() => {
    if (monthlyIncome != null && monthlyIncomeValue === null) {
      setMonthlyIncomeValue(monthlyIncome);
      setIncomeInput(String(monthlyIncome));
    }
  }, [monthlyIncome, monthlyIncomeValue]);
  useEffect(() => {
    // Check if biometrics are supported
    checkBiometricsSupport();
  }, []);

  const checkBiometricsSupport = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricsSupported(hasHardware && isEnrolled);
    } catch {
      setBiometricsSupported(false);
    }
  };

  const setupBiometrics = async () => {
    if (!biometricsSupported) return;

    setIsLoading(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Set up biometric unlock for WealthWise',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Username',
      });

      if (result.success) {
        setBiometricsEnabled(true);
        // Store biometric preference
        if (Platform.OS === 'web') {
          localStorage.setItem(`biometric_${username}`, 'enabled');
        }
        // showToast.success(
        //   'Biometric Setup Complete',
        //   'You can now use FaceID/TouchID to access your account'
        // );
      } else {
        // showToast.warning(
        //   'Biometric Setup Cancelled',
        //   'You can still use your username to access the app'
        // );
      }
    } catch {
      // showToast.error(
      //   'Biometric Setup Failed',
      //   'You can still use your username to access the app'
      // );
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAccountSetup = () => {
    if (!username.trim()) {
      // showToast.error('Username Required', 'Please enter a username to continue');
      return;
    }

    if (username.length < 3) {
      // showToast.error('Username Too Short', 'Username must be at least 3 characters long');
      return;
    }

    handleNext();
  };

  const handleIncomeSetup = async () => {
    const cleaned = incomeInput.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    if (!cleaned || Number.isNaN(parsed) || parsed <= 0) {
      setIncomeError('Enter a valid monthly amount to continue');
      return;
    }

    try {
      setIncomeError(null);
      setMonthlyIncomeValue(parsed);
      await updateMonthlyIncome(parsed);
      handleNext();
    } catch (error) {
      console.error('Failed to store monthly income during onboarding', error);
      setIncomeError('Unable to save income. Please try again.');
    }
  };

  const handleComplete = () => {
    onComplete({
      username: username.trim(),
      hasBiometrics: biometricsEnabled,
      monthlyIncome: monthlyIncomeValue,
    });
  };

  // Budget editing removed from this flow

  const renderFeatureSlide = (feature: FeatureSlide) => (
    <View className="items-center gap-6 p-8">
      <View className="h-24 w-24 items-center justify-center rounded-full bg-app-canvas-elevated">
        {feature.icon}
      </View>
      <View className="items-center gap-4">
        <Text className="text-center text-2xl font-bold text-app-text-strong">{feature.title}</Text>
        <Text className="max-w-xs text-center text-base leading-6 text-app-text-soft">
          {feature.description}
        </Text>
        <View className="mt-2 rounded-xl bg-app-surface-2 px-3 py-2">
          <Text className="text-center text-sm font-medium text-app-text-strong">
            {feature.highlight}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderAccountSetup = () => (
    <View className="items-center gap-6 p-8">
      <View className="h-24 w-24 items-center justify-center rounded-full bg-app-canvas-elevated">
        <Ionicons name="phone-portrait-outline" size={48} color="#8190B3" />
      </View>
      <View className="max-w-xs items-center gap-4">
        <Text className="text-center text-2xl font-bold text-app-text-strong">
          Create Your Account
        </Text>
        <Text className="max-w-xs text-center text-base leading-6 text-app-text-soft">
          Choose a username for your local account. Your data stays private on your device.
        </Text>
        <View className="w-full gap-3">
          <Text className="self-start text-sm font-medium text-app-text-faint">Username</Text>
          <Input
            variant="dark"
            value={username}
            onChangeText={setUsername}
            placeholder="Enter your username"
            maxLength={20}
          />
          {username ? (
            <Text className="self-start text-xs text-app-text-faint">
              {username.length}/20 characters
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );

  const renderIncomeSetup = () => (
    <View className="items-center gap-6 p-8">
      <View className="h-24 w-24 items-center justify-center rounded-full bg-app-canvas-elevated">
        <Ionicons name="cash-outline" size={48} color="#8190B3" />
      </View>
      <View className="max-w-xs items-center gap-4">
        <Text className="text-center text-2xl font-bold text-app-text-strong">
          Monthly Household Income
        </Text>
        <Text className="max-w-xs text-center text-base leading-6 text-app-text-soft">
          This helps us benchmark your budgets and flag categories that use too much of your income.
        </Text>
        <View className="w-full gap-3">
          <Text className="self-start text-sm font-medium text-app-text-faint">Monthly income</Text>
          <Input
            variant="dark"
            value={incomeInput}
            onChangeText={(text) => {
              setIncomeInput(text);
              if (incomeError) setIncomeError(null);
            }}
            keyboardType="numeric"
            placeholder="e.g. 5500"
            helperText="Enter totals for your household after taxes"
            errorText={incomeError || undefined}
            maxLength={12}
          />
        </View>
      </View>
    </View>
  );

  const renderBiometricsSetup = () => (
    <View className="items-center gap-6 p-8">
      <View className="h-24 w-24 items-center justify-center rounded-full bg-app-canvas-elevated">
        <MaterialIcons name="fingerprint" size={48} color="#8190B3" />
      </View>
      <View className="items-center gap-4">
        <Text className="text-center text-2xl font-bold text-app-text-strong">Secure Access</Text>
        {biometricsSupported ? (
          <>
            <Text className="max-w-xs text-center text-base leading-6 text-app-text-soft">
              Enable FaceID or TouchID for quick and secure access to your account.
            </Text>
            {biometricsEnabled ? (
              <View className="mt-4 flex-row items-center gap-2 rounded-xl border border-success-500 bg-success-500/10 p-4">
                <Ionicons name="checkmark-circle" size={24} color="#4ade80" />
                <Text className="font-medium text-success-400">
                  Biometric authentication enabled!
                </Text>
              </View>
            ) : (
              <Button
                variant="primary-solid"
                size="md"
                onPress={setupBiometrics}
                loading={isLoading}
                title={isLoading ? 'Setting up...' : 'Enable Biometrics'}
              />
            )}
          </>
        ) : (
          <View className="items-center gap-4">
            <Text className="max-w-xs text-center text-base leading-6 text-app-text-soft">
              Biometric authentication is not available on this device. You will use your username
              to access the app.
            </Text>
            <View className="mt-4 flex-row items-center gap-2 rounded-xl border border-app-border bg-app-surface-1 p-4">
              <Ionicons name="shield-checkmark" size={24} color="#8190B3" />
              <Text className="text-app-text-soft">
                Your account will be secured with your username
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  // Budget setup moved to its own dedicated follow-up step screen

  // Sticky header/footer layout with Reanimated transitions between steps
  return (
    <KeyboardAvoidingView
      className="flex-1 bg-app-canvas"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ paddingTop: top / 2 }}>
      {/* Sticky Header */}
      <View className="bg-app-canvas px-6 pb-2 pt-6">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-sm text-app-text-faint">
            Step {currentStep + 1} of {totalSteps}
          </Text>
          <Text className="text-sm text-app-text-faint">{Math.round(progress)}%</Text>
        </View>
        {/* Smooth progress animation */}
        <Progress value={progress} style={{ height: 8 }} />
      </View>

      {/* Scrollable Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={[
          { paddingBottom: bottom + 100, flexGrow: 1, minHeight: height - 160 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View className="flex-1 items-center justify-center px-4">
          <Animated.View
            entering={FadeIn.duration(250)}
            exiting={FadeOut.duration(200)}
            className="w-full max-w-md">
            <Card variant="glass-dark" className="w-full">
              <CardContent className="p-0">
                {currentStep < features.length && (
                  <Animated.View
                    entering={SlideInRight.duration(300)}
                    exiting={SlideOutLeft.duration(220)}>
                    {renderFeatureSlide(features[currentStep])}
                  </Animated.View>
                )}
                {currentStep === features.length && (
                  <Animated.View
                    entering={SlideInRight.duration(300)}
                    exiting={SlideOutLeft.duration(220)}>
                    {renderAccountSetup()}
                  </Animated.View>
                )}
                {currentStep === features.length + 1 && (
                  <Animated.View
                    entering={SlideInRight.duration(300)}
                    exiting={SlideOutLeft.duration(220)}>
                    {renderIncomeSetup()}
                  </Animated.View>
                )}
                {currentStep === features.length + 2 && (
                  <Animated.View
                    entering={SlideInRight.duration(300)}
                    exiting={SlideOutLeft.duration(220)}>
                    {renderBiometricsSetup()}
                  </Animated.View>
                )}
              </CardContent>
            </Card>
          </Animated.View>
        </View>
      </ScrollView>

      {/* Sticky Footer */}
      <View
        className="bg-app-canvas px-6 pb-6 pt-4"
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        <View className="flex-row items-center justify-between">
          <Button
            onPress={handleBack}
            disabled={currentStep === 0}
            className={`rounded border px-6 py-3 ${
              currentStep === 0 ? 'border-gray-300 bg-gray-100' : 'border-gray-400 bg-white'
            }`}>
            <View className="flex-row items-center gap-2">
              <Ionicons
                name="chevron-back"
                size={16}
                color={currentStep === 0 ? '#9CA3AF' : '#000000'}
              />
              <Text className={`font-medium ${currentStep === 0 ? 'text-gray-400' : 'text-black'}`}>
                Back
              </Text>
            </View>
          </Button>

          {currentStep < features.length && (
            <Button onPress={handleNext} className="rounded bg-black px-6 py-3">
              <View className="flex-row items-center gap-2">
                <Text className="font-medium text-white">Next</Text>
                <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
              </View>
            </Button>
          )}

          {currentStep === features.length && (
            <Button onPress={handleAccountSetup} className="rounded bg-black px-6 py-3">
              <View className="flex-row items-center gap-2">
                <Text className="font-medium text-white">Continue</Text>
                <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
              </View>
            </Button>
          )}

          {currentStep === features.length + 1 && (
            <Button onPress={handleIncomeSetup} className="rounded bg-black px-6 py-3">
              <View className="flex-row items-center gap-2">
                <Text className="font-medium text-white">Save Income</Text>
                <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
              </View>
            </Button>
          )}

          {currentStep === features.length + 2 && (
            <Button onPress={handleComplete} className="rounded bg-black px-6 py-3">
              <View className="flex-row items-center gap-2">
                <Text className="font-medium text-white">Finish Setup</Text>
                <Ionicons name="wallet" size={16} color="#FFFFFF" />
              </View>
            </Button>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
