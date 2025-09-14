import { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Dimensions, Platform, KeyboardAvoidingView } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { Card, CardContent } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { Progress } from './Progress';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { showToast } from './Toast';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height } = Dimensions.get('window');

interface OnboardingFlowProps {
  onComplete: (userData: {
    username: string;
    hasBiometrics: boolean;
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
    icon: <MaterialIcons name="psychology" size={48} color="#000000" />,
    title: 'AI-Powered Insights',
    description:
      'Get smart recommendations and automatic expense categorization powered by advanced AI',
    highlight: 'Never manually categorize expenses again',
  },
  {
    icon: <Ionicons name="wallet" size={48} color="#000000" />,
    title: 'Smart Budgeting',
    description:
      'Set budgets that adapt to your spending patterns and help you save more effectively',
    highlight: 'Achieve your financial goals faster',
  },
  {
    icon: <Ionicons name="trending-up" size={48} color="#000000" />,
    title: 'Detailed Analytics',
    description: 'Beautiful charts and reports give you deep insights into your spending habits',
    highlight: 'Make data-driven financial decisions',
  },
  {
    icon: <Ionicons name="shield-checkmark" size={48} color="#000000" />,
    title: 'Privacy First',
    description:
      'Your data stays securely on your device with local storage and bank-level security',
    highlight: 'Complete privacy and security',
  },
  {
    icon: <Ionicons name="people" size={48} color="#000000" />,
    title: 'Gamification',
    description: 'Earn points, unlock achievements, and stay motivated with budget challenges',
    highlight: 'Make budgeting fun and engaging',
  },
];

// Budget setup moved to standalone flow

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [biometricsSupported, setBiometricsSupported] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  // Features + Account Setup + Biometrics Setup (budget moved to separate flow)
  const totalSteps = useMemo(() => features.length + 2, []);
  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Progress is animated within <Progress />

  const { top, bottom } = useSafeAreaInsets();
  useEffect(() => {
    // Check if biometrics are supported
    checkBiometricsSupport();
  }, []);

  const checkBiometricsSupport = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricsSupported(hasHardware && isEnrolled);
    } catch (error) {
      console.log('Biometrics check failed:', error);
      setBiometricsSupported(false);
    }
  };

  const setupBiometrics = async () => {
    if (!biometricsSupported) return;

    setIsLoading(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Set up biometric authentication for SmartBudget',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Username',
      });

      if (result.success) {
        setBiometricsEnabled(true);
        // Store biometric preference
        if (Platform.OS === 'web') {
          localStorage.setItem(`biometric_${username}`, 'enabled');
        }
        showToast.success(
          'Biometric Setup Complete',
          'You can now use FaceID/TouchID to access your account'
        );
      } else {
        showToast.warning(
          'Biometric Setup Cancelled',
          'You can still use your username to access the app'
        );
      }
    } catch (error) {
      showToast.error(
        'Biometric Setup Failed',
        'You can still use your username to access the app'
      );
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
      showToast.error('Username Required', 'Please enter a username to continue');
      return;
    }

    if (username.length < 3) {
      showToast.error('Username Too Short', 'Username must be at least 3 characters long');
      return;
    }

    handleNext();
  };

  const handleComplete = () => {
    onComplete({
      username: username.trim(),
      hasBiometrics: biometricsEnabled,
    });
  };

  // Budget editing removed from this flow

  const renderFeatureSlide = (feature: FeatureSlide, index: number) => (
    <View className="items-center gap-6 p-8">
      <View className="h-24 w-24 items-center justify-center rounded-full bg-gray-100 shadow-md">
        {feature.icon}
      </View>
      <View className="items-center gap-4">
        <Text className="text-center text-2xl font-bold text-black">{feature.title}</Text>
        <Text className="max-w-xs text-center text-lg leading-7 text-gray-700">
          {feature.description}
        </Text>
        <View className="mt-2 rounded-lg bg-black px-3 py-3">
          <Text className="text-center text-sm font-medium text-white">{feature.highlight}</Text>
        </View>
      </View>
    </View>
  );

  const renderAccountSetup = () => (
    <View className="items-center gap-6 p-8">
      <View className="h-24 w-24 items-center justify-center rounded-full bg-gray-100 shadow-md">
        <Ionicons name="phone-portrait-outline" size={48} color="#000000" />
      </View>
      <View className="max-w-xs items-center gap-4">
        <Text className="text-center text-2xl font-bold text-black">Create Your Account</Text>
        <Text className="max-w-xs text-center text-lg leading-7 text-gray-700">
          Choose a username for your local account. Your data stays private on your device.
        </Text>
        <View className="w-full gap-3">
          <Text className="self-start text-base font-medium text-black">Username</Text>
          <Input
            value={username}
            onChangeText={setUsername}
            placeholder="Enter your username"
            className="w-full rounded-md border-gray-400 px-3 text-base"
            style={{ color: 'black' }}
            maxLength={20}
            {...{ placeholderTextColor: '#9CA3AF', selectionColor: 'black' }}
          />
          {username ? (
            <Text className="self-start text-sm text-gray-500">
              {username.length}/20 characters
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );

  const renderBiometricsSetup = () => (
    <View className="items-center gap-6 p-8">
      <View className="h-24 w-24 items-center justify-center rounded-full bg-gray-100 shadow-md">
        <MaterialIcons name="fingerprint" size={48} color="#000000" />
      </View>
      <View className="items-center gap-4">
        <Text className="text-center text-2xl font-bold text-black">Secure Access</Text>
        {biometricsSupported ? (
          <>
            <Text className="max-w-xs text-center text-lg leading-7 text-gray-700">
              Enable FaceID or TouchID for quick and secure access to your account.
            </Text>
            {biometricsEnabled ? (
              <View className="mt-4 flex-row items-center gap-2 rounded-lg border border-green-500 bg-green-50 p-4">
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                <Text className="font-medium text-green-800">
                  Biometric authentication enabled!
                </Text>
              </View>
            ) : (
              <Button
                onPress={setupBiometrics}
                disabled={isLoading}
                className="rounded-md bg-black px-6 py-3">
                <Text className="font-medium text-white">
                  {isLoading ? 'Setting up...' : 'Enable Biometrics'}
                </Text>
              </Button>
            )}
          </>
        ) : (
          <View className="items-center gap-4">
            <Text className="max-w-xs text-center text-lg leading-7 text-gray-700">
              Biometric authentication is not available on this device. You will use your username to
              access the app.
            </Text>
            <View className="mt-4 flex-row items-center gap-2 rounded-lg border border-gray-300 bg-gray-50 p-4">
              <Ionicons name="shield-checkmark" size={24} color="#6B7280" />
              <Text className="text-gray-700">Your account will be secured with your username</Text>
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
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ paddingTop: top / 2 }}>
      {/* Sticky Header */}
      <View className="px-6 pb-2 pt-6 bg-white">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-sm text-gray-500">
            Step {currentStep + 1} of {totalSteps}
          </Text>
          <Text className="text-sm text-gray-500">{Math.round(progress)}%</Text>
        </View>
        {/* Smooth progress animation */}
        <Progress value={progress} style={{ height: 8 }} />
      </View>

      {/* Scrollable Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={[{ paddingBottom: bottom + 100, flexGrow: 1, minHeight: height - 160 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View className="flex-1 items-center justify-center px-4">
          <Animated.View
            entering={FadeIn.duration(250)}
            exiting={FadeOut.duration(200)}
            className="w-full max-w-md">
            <Card className="w-full border border-gray-400 bg-white shadow-lg">
              <CardContent className="p-0">
                {currentStep < features.length && (
                  <Animated.View entering={SlideInRight.duration(300)} exiting={SlideOutLeft.duration(220)}>
                    {renderFeatureSlide(features[currentStep], currentStep)}
                  </Animated.View>
                )}
                {currentStep === features.length && (
                  <Animated.View entering={SlideInRight.duration(300)} exiting={SlideOutLeft.duration(220)}>
                    {renderAccountSetup()}
                  </Animated.View>
                )}
                {currentStep === features.length + 1 && (
                  <Animated.View entering={SlideInRight.duration(300)} exiting={SlideOutLeft.duration(220)}>
                    {renderBiometricsSetup()}
                  </Animated.View>
                )}
              </CardContent>
            </Card>
          </Animated.View>
        </View>
      </ScrollView>

      {/* Sticky Footer */}
      <View className="bg-white px-6 pb-6 pt-4" style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
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
            <Button onPress={handleComplete} className="rounded bg-black px-6 py-3">
              <View className="flex-row items-center gap-2">
                <Text className="font-medium text-white">Set Up Budget</Text>
                <Ionicons name="wallet" size={16} color="#FFFFFF" />
              </View>
            </Button>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
