# Modal Usage Guide

This guide explains how to use the integrated modal system for adding transactions in the SmartBudget app.

## Overview

The modal system provides a seamless, platform-consistent way to display the AddTransactionModal using Expo Router's built-in modal presentation. This approach leverages native iOS/Android modal transitions and behaviors.

## Architecture

### Files Involved

- `app/modal.tsx` - The modal screen that hosts the AddTransactionModal
- `components/AddTransactionModal.tsx` - The actual modal content component
- Any screen that triggers the modal (e.g., `app/(tabs)/index.tsx`)

### How It Works

1. **Navigation-based Modal**: Uses Expo Router's modal presentation instead of React Native's Modal component
2. **Platform Consistency**: Automatically uses native modal transitions (slide up on iOS, fade on Android)
3. **Better UX**: Proper back button handling, gesture support, and keyboard avoidance

## Usage Examples

### Basic Modal Trigger

```tsx
import { useRouter } from 'expo-router';
import { Button } from '@/components/Button';

export default function SomeScreen() {
  const router = useRouter();

  return (
    <Button onPress={() => router.push('/modal')}>
      Add Transaction
    </Button>
  );
}
```

### Floating Action Button (FAB)

```tsx
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function DashboardScreen() {
  const router = useRouter();

  return (
    <View className="relative flex-1">
      {/* Your screen content */}
      <ScrollView>
        {/* Content here */}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        onPress={() => router.push('/modal')}
        className="bg-primary-500 active:bg-primary-600 absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full shadow-lg"
        activeOpacity={0.8}>
        <Ionicons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}
```

### From Tab Bar or Header

```tsx
// In your tab layout or screen options
export default function TabLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerRight: () => (
          <TouchableOpacity
            onPress={() => router.push('/modal')}
            className="mr-4 p-2">
            <Ionicons name="add" size={24} color="#0EA5E9" />
          </TouchableOpacity>
        ),
      })}>
      {/* Your tabs */}
    </Tabs>
  );
}
```

## Modal Screen Implementation

The `app/modal.tsx` file serves as a wrapper that:

1. **Auto-opens the modal** when the screen mounts
2. **Handles closing** with proper navigation back
3. **Manages timing** for smooth transitions

```tsx
import { StatusBar } from 'expo-status-bar';
import { Platform, View } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import AddTransactionModal from '../components/AddTransactionModal';

export default function Modal() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  // Open modal when screen mounts
  useEffect(() => {
    setIsModalOpen(true);
  }, []);

  const handleClose = () => {
    setIsModalOpen(false);
    // Small delay to allow modal close animation before navigating back
    setTimeout(() => {
      router.back();
    }, 150);
  };

  return (
    <View className="flex-1">
      <AddTransactionModal isOpen={isModalOpen} onClose={handleClose} />
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}
```

## AddTransactionModal Features

### Theme Integration
- Uses the app's design system with consistent colors, spacing, and typography
- Responsive layout that works on different screen sizes
- Proper keyboard handling and scrolling

### Form Handling
- React Hook Form integration for validation and state management
- Real-time validation with error messages
- Proper form reset on successful submission

### Platform Adaptations
- `KeyboardAvoidingView` for iOS keyboard handling
- Proper scroll behavior on both platforms
- Native-feeling interactions and transitions

### Offline Support
- Falls back to offline storage when network is unavailable
- Syncs data when connection is restored
- User feedback through toast notifications

## Customization Options

### Adding More Modal Types

Create additional modal screens for different purposes:

```tsx
// app/edit-modal.tsx - For editing transactions
// app/category-modal.tsx - For managing categories
// app/budget-modal.tsx - For setting budgets
```

### Passing Data to Modals

Use URL parameters or global state:

```tsx
// Using URL parameters
router.push('/modal?transactionId=123');

// Using global state (React Context, Zustand, etc.)
const { setEditingTransaction } = useTransactionStore();
setEditingTransaction(transaction);
router.push('/modal');
```

### Custom Modal Animations

Modify `app/_layout.tsx` to customize modal presentation:

```tsx
export default function RootLayoutNav() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="modal" 
        options={{ 
          presentation: 'modal',
          animation: 'slide_from_bottom', // iOS
          animationTypeForReplace: 'push',
        }} 
      />
    </Stack>
  );
}
```

## Best Practices

### 1. Consistent Modal Triggers
Always use the same pattern for triggering modals:
```tsx
const router = useRouter();
<Button onPress={() => router.push('/modal')}>Add Transaction</Button>
```

### 2. Proper Error Handling
Handle network errors and validation gracefully:
```tsx
const handleSubmit = async (data) => {
  try {
    await createTransaction(data);
    router.back();
  } catch (error) {
    // Show error toast, don't close modal
    toast.error('Failed to create transaction');
  }
};
```

### 3. Loading States
Always show loading states during async operations:
```tsx
<Button 
  loading={isCreating} 
  disabled={isCreating}
  onPress={handleSubmit}>
  {isCreating ? 'Creating...' : 'Create Transaction'}
</Button>
```

### 4. Keyboard Handling
Use proper keyboard avoidance on forms:
```tsx
<KeyboardAvoidingView 
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
  {/* Form content */}
</KeyboardAvoidingView>
```

## Troubleshooting

### Modal Not Opening
- Check that the route exists in your file structure
- Ensure `router.push('/modal')` is called correctly
- Verify the modal state management in the modal screen

### Keyboard Issues
- Use `KeyboardAvoidingView` for iOS
- Set `keyboardShouldPersistTaps="handled"` on ScrollView
- Consider using `react-native-keyboard-aware-scroll-view` for complex forms

### Animation Glitches
- Add small delays when closing modals: `setTimeout(() => router.back(), 150)`
- Ensure proper cleanup of component state
- Use `useEffect` cleanup functions for timers

### Data Not Persisting
- Check that form submission is properly awaited
- Verify React Query cache invalidation
- Ensure offline storage is working correctly

## Platform-Specific Considerations

### iOS
- Modals slide up from bottom by default
- Swipe down gesture to dismiss is automatic
- Proper status bar handling with `StatusBar` component

### Android
- Modals fade in by default
- Back button handling is automatic
- Consider hardware back button behavior

### Web
- Modals overlay the current page
- Proper focus management for accessibility
- Consider escape key handling

## Native Select Component

The Select component has been redesigned to work natively on mobile without creating additional modals:

### Features
- **Expandable List**: No modal overlay, just a clean expandable dropdown
- **Smooth Animations**: Uses LayoutAnimation for native transitions
- **Theme Integration**: Fully integrated with the app's design system
- **Keyboard Friendly**: Works seamlessly in forms with proper focus management

### Usage Example

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/Select';

export function CategorySelect({ value, onValueChange, categories }) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select category">
          {/* Custom display of selected value */}
          {value && categories?.find(c => c.id.toString() === value) && (
            <View className="flex-row items-center">
              <Text className="mr-2">{selectedCategory.icon}</Text>
              <Text>{selectedCategory.name}</Text>
            </View>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {categories?.map((category) => (
          <SelectItem key={category.id} value={category.id.toString()}>
            <View className="flex-row items-center">
              <Text className="mr-2">{category.icon}</Text>
              <Text>{category.name}</Text>
            </View>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

### Benefits
- **No Modal Conflicts**: Works perfectly inside modal screens
- **Better Performance**: No additional modal rendering overhead
- **Native Feel**: Expandable list feels natural on mobile
- **Accessibility**: Proper focus management and screen reader support

This modal system provides a robust foundation for all modal interactions in your app while maintaining platform consistency and excellent user experience.