import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Dimensions, Platform, KeyboardAvoidingView } from 'react-native';
import { Card, CardContent } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { Label } from './Label';
import { Progress } from './Progress';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { showToast } from './Toast';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CategoryListItem from './CategoryListItem';

const { width, height } = Dimensions.get('window');

interface OnboardingFlowProps {
  onComplete: (userData: {
    username: string;
    hasBiometrics: boolean;
    budgetCategories?: CategoryBudget[];
  }) => void;
}

interface CategoryBudget {
  name: string;
  icon: string;
  color: string;
  budget: string;
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

const defaultCategories: CategoryBudget[] = [
  { name: 'Food & Dining', icon: '🍽️', color: '#FF6B6B', budget: '500' },
  { name: 'Groceries', icon: '🛒', color: '#4CAF50', budget: '400' },
  { name: 'Transportation', icon: '🚗', color: '#4ECDC4', budget: '300' },
  { name: 'Gas & Fuel', icon: '⛽', color: '#FF9800', budget: '200' },
  { name: 'Entertainment', icon: '🎬', color: '#45B7D1', budget: '200' },
  { name: 'Utilities', icon: '💡', color: '#FFA07A', budget: '250' },
  { name: 'Healthcare', icon: '🏥', color: '#E91E63', budget: '300' },
  { name: 'Shopping', icon: '🛍️', color: '#9C27B0', budget: '300' },
];

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [biometricsSupported, setBiometricsSupported] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [budgetCategories, setBudgetCategories] = useState<CategoryBudget[]>(defaultCategories);

  const totalSteps = features.length + 3; // Features + Account Setup + Biometrics Setup + Budget Setup
  const progress = ((currentStep + 1) / totalSteps) * 100;

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
      budgetCategories,
    });
  };

  const updateCategoryBudget = (categoryName: string, newBudget: string) => {
    // Only allow numeric input with optional decimal
    const numericValue = newBudget.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    const parts = numericValue.split('.');
    const formattedValue =
      parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : numericValue;

    setBudgetCategories((prev) =>
      prev.map((cat) => (cat.name === categoryName ? { ...cat, budget: formattedValue } : cat))
    );
  };

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
            className="w-full rounded-md border-gray-400 bg-white px-3 py-3 text-base"
            style={{ color: '#000000' }}
            maxLength={20}
            {...{ placeholderTextColor: '#9CA3AF', selectionColor: '#000000' }}
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
              Biometric authentication is not available on this device. You'll use your username to
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

  const renderBudgetSetup = () => (
    <ScrollView
      className="flex-1"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      <View className="gap-6 p-8">
        <View className="h-24 w-24 items-center justify-center self-center rounded-full bg-gray-100 shadow-md">
          <Ionicons name="wallet" size={48} color="#000000" />
        </View>
        <View className="w-full flex-1 gap-5">
          <Text className="text-center text-2xl font-bold text-black">Set Your Budgets</Text>
          <Text className="text-center text-lg leading-7 text-gray-700">
            We've set up some common budget categories with suggested amounts. You can adjust these
            to match your spending needs.
          </Text>

          {budgetCategories.map((category) => (
            <View
              className="w-full flex-1 flex-row gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
              key={category.name}>
              <View className="flex-1 flex-row items-center gap-3">
                <View
                  className="h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: category.color + '20' }}>
                  <Text className="text-lg">{category.icon}</Text>
                </View>
                <Text className="flex-1 text-base font-medium text-gray-700" numberOfLines={1}>
                  {category.name}
                </Text>
              </View>
              <View className="flex-1 flex-row content-end items-center gap-1">
                <Text className="text-base font-medium text-gray-700">$</Text>
                <Input
                  value={category.budget}
                  onChangeText={(newBudget) => updateCategoryBudget(category.name, newBudget)}
                  placeholder="0"
                  keyboardType="numeric"
                  className="w-20 border-gray-400 bg-white text-right text-base"
                  style={{ color: '#000000', minWidth: 80 }}
                  {...{ placeholderTextColor: '#9CA3AF', selectionColor: '#000000' }}
                />
              </View>
            </View>
          ))}

          <View className="mt-2 w-full rounded-lg bg-gray-100 p-4">
            <Text className="text-center text-lg font-bold text-black">
              Total Monthly Budget: $
              {budgetCategories
                .reduce((sum, cat) => sum + (parseFloat(cat.budget) || 0), 0)
                .toFixed(0)}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ paddingTop: top / 2 }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={[{ paddingBottom: bottom, flexGrow: 1, minHeight: height }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Progress Bar */}
        <View className="px-6 pb-2 pt-6">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-sm text-gray-500">
              Step {currentStep + 1} of {totalSteps}
            </Text>
            <Text className="text-sm text-gray-500">{Math.round(progress)}%</Text>
          </View>
          <Progress value={progress} style={{ height: 8 }} />
        </View>

        {/* Content Area */}
        <View className="flex-1 items-center justify-center px-4">
          {currentStep === features.length + 2 ? (
            // Budget setup without Card wrapper for testing
            <View className="w-full max-w-lg">{renderBudgetSetup()}</View>
          ) : (
            <Card className="w-full max-w-md border border-gray-400 bg-white shadow-lg">
              <CardContent className="p-0">
                {currentStep < features.length &&
                  renderFeatureSlide(features[currentStep], currentStep)}
                {currentStep === features.length && renderAccountSetup()}
                {currentStep === features.length + 1 && renderBiometricsSetup()}
              </CardContent>
            </Card>
          )}
        </View>

        {/* Navigation */}
        <View className="flex-row items-center justify-between p-6">
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
            <Button onPress={handleNext} className="rounded bg-black px-6 py-3">
              <View className="flex-row items-center gap-2">
                <Text className="font-medium text-white">Set Up Budget</Text>
                <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
              </View>
            </Button>
          )}

          {currentStep === features.length + 2 && (
            <Button onPress={handleComplete} className="rounded bg-black px-6 py-3">
              <View className="flex-row items-center gap-2">
                <Text className="font-medium text-white">Get Started</Text>
                <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
              </View>
            </Button>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
