# Theme Guide for SmartBudget App

This guide explains how to use the comprehensive theme system in the SmartBudget React Native app with NativeWind (Tailwind CSS for React Native).

## Overview

The theme system provides a consistent design language across the entire application, including:
- Color palette with semantic meanings
- Typography scale
- Spacing system
- Component variants
- Shadows and elevation
- Animation timing

## Theme Structure

### Colors

#### Primary Brand Colors
```javascript
primary: {
  50: '#f0f9ff',   // Lightest
  500: '#0ea5e9',  // Main brand color
  900: '#0c4a6e'   // Darkest
}
```

#### Status Colors
- **Success**: Green tones for positive actions/states
- **Warning**: Yellow/amber tones for caution
- **Error**: Red tones for errors/destructive actions
- **Info**: Blue tones for informational content

#### Semantic Color Mappings
- `background-primary`: Main background (#ffffff)
- `background-secondary`: Secondary background (#f9fafb)
- `foreground-primary`: Main text color (#111827)
- `foreground-muted`: Muted text color (#6b7280)

## Using the Theme

### Method 1: Tailwind Classes (Recommended)

```tsx
import { View, Text } from 'react-native';

export function ExampleComponent() {
  return (
    <View className="bg-background-primary p-6 rounded-xl border border-border-default">
      <Text className="text-foreground-primary text-xl font-semibold mb-2">
        Welcome to SmartBudget
      </Text>
      <Text className="text-foreground-muted text-base">
        Your personal finance companion
      </Text>
    </View>
  );
}
```

### Method 2: Theme Constants

```tsx
import { theme, getColor } from '@/lib/theme';

export function ExampleComponent() {
  return (
    <View style={{
      backgroundColor: theme.colors.background.primary,
      padding: theme.spacing[6],
      borderRadius: theme.borderRadius.xl,
      borderColor: getColor('border.default'),
      borderWidth: 1,
    }}>
      <Text style={{
        color: theme.colors.foreground.primary,
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.semibold,
      }}>
        Welcome to SmartBudget
      </Text>
    </View>
  );
}
```

## Component Variants

### Button Variants

```tsx
<Button variant="default">Primary Action</Button>
<Button variant="secondary">Secondary Action</Button>
<Button variant="outline">Outline Button</Button>
<Button variant="ghost">Ghost Button</Button>
<Button variant="success">Success Action</Button>
<Button variant="warning">Warning Action</Button>
<Button variant="error">Destructive Action</Button>
```

### Button Sizes

```tsx
<Button size="sm">Small Button</Button>
<Button size="md">Medium Button</Button>
<Button size="lg">Large Button</Button>
```

### Card Variants

```tsx
<Card variant="default">Standard card with subtle border</Card>
<Card variant="outlined">Card with prominent border</Card>
<Card variant="elevated">Card with shadow</Card>
<Card variant="filled">Card with filled background</Card>
```

### Badge Variants

```tsx
<Badge variant="default">Default</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="error">Error</Badge>
<Badge variant="info">Info</Badge>
<Badge variant="outline">Outline</Badge>
```

### Input States

```tsx
<Input variant="default" placeholder="Default input" />
<Input variant="outline" placeholder="Outlined input" />
<Input variant="filled" placeholder="Filled input" />
<Input state="error" placeholder="Error state" />
<Input state="success" placeholder="Success state" />
```

## Typography

### Font Sizes
- `text-xs`: 12px
- `text-sm`: 14px
- `text-base`: 16px (default)
- `text-lg`: 18px
- `text-xl`: 20px
- `text-2xl`: 24px
- `text-3xl`: 30px
- `text-4xl`: 36px

### Font Weights
- `font-light`: 300
- `font-normal`: 400
- `font-medium`: 500 (most common for labels)
- `font-semibold`: 600 (headings)
- `font-bold`: 700
- `font-extrabold`: 800

### Usage Examples

```tsx
// Page title
<Text className="text-3xl font-bold text-foreground-primary">
  Dashboard
</Text>

// Section heading
<Text className="text-xl font-semibold text-foreground-primary mb-4">
  Recent Transactions
</Text>

// Body text
<Text className="text-base text-foreground-secondary leading-relaxed">
  Your spending summary for this month
</Text>

// Muted text
<Text className="text-sm text-foreground-muted">
  Last updated 2 hours ago
</Text>
```

## Spacing

Use consistent spacing throughout the app:

```tsx
// Padding
className="p-1"    // 4px
className="p-2"    // 8px
className="p-3"    // 12px
className="p-4"    // 16px
className="p-6"    // 24px (common for cards)
className="p-8"    // 32px

// Margin
className="m-1"    // 4px
className="mb-2"   // 8px bottom margin
className="mt-4"   // 16px top margin
className="mx-6"   // 24px horizontal margin

// Gap (for flex/grid)
className="gap-2"  // 8px
className="gap-4"  // 16px (common)
className="gap-6"  // 24px
```

## Colors in Practice

### Status Indicators
```tsx
// Success message
<View className="bg-success-50 border border-success-200 p-4 rounded-lg">
  <Text className="text-success-800">Transaction successful!</Text>
</View>

// Error message
<View className="bg-error-50 border border-error-200 p-4 rounded-lg">
  <Text className="text-error-800">Payment failed</Text>
</View>

// Warning
<View className="bg-warning-50 border border-warning-200 p-4 rounded-lg">
  <Text className="text-warning-800">Budget limit approaching</Text>
</View>
```

### Interactive Elements
```tsx
// Hover/press states are handled automatically by component variants
<Button 
  variant="primary" 
  className="bg-primary-500 active:bg-primary-600 hover:bg-primary-400"
>
  Save Changes
</Button>
```

## Shadows and Elevation

```tsx
// Subtle shadow
<View className="shadow-sm">Card content</View>

// Medium shadow
<View className="shadow-md">Modal content</View>

// Large shadow
<View className="shadow-lg">Floating action button</View>
```

## Border Radius

```tsx
className="rounded-sm"    // 4px
className="rounded-md"    // 6px
className="rounded-lg"    // 8px (common for cards)
className="rounded-xl"    // 12px (common for modals)
className="rounded-2xl"   // 16px
className="rounded-full"  // 9999px (pills, avatars)
```

## Animation Classes

```tsx
// Fade in animation
className="animate-fade-in"

// Slide in animation  
className="animate-slide-in"

// Soft bounce
className="animate-bounce-soft"
```

## Best Practices

### 1. Use Semantic Colors
```tsx
// Good
className="text-foreground-primary"
className="bg-success-100 text-success-800"

// Avoid
className="text-gray-900"
className="bg-green-100 text-green-800"
```

### 2. Consistent Spacing
```tsx
// Good - consistent spacing scale
className="p-4 mb-6 gap-2"

// Avoid - arbitrary values
className="p-[15px] mb-[25px] gap-[9px]"
```

### 3. Use Component Variants
```tsx
// Good - use predefined variants
<Button variant="success" size="lg">Complete</Button>

// Avoid - custom styling
<Button className="bg-green-500 text-white px-8 py-4">Complete</Button>
```

### 4. Typography Hierarchy
```tsx
// Good - clear hierarchy
<Text className="text-2xl font-bold">Main Title</Text>
<Text className="text-lg font-semibold">Section Title</Text>
<Text className="text-base">Body content</Text>
<Text className="text-sm text-foreground-muted">Helper text</Text>
```

## Dark Mode Support (Future)

The theme is structured to easily support dark mode:

```tsx
// Light mode
className="bg-background-primary text-foreground-primary"

// Dark mode (when implemented)
className="bg-background-primary text-foreground-primary dark:bg-background-dark dark:text-foreground-inverse"
```

## Customizing the Theme

To modify the theme, edit `tailwind.config.js`:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Add new colors or modify existing ones
        brand: {
          50: '#f0f9ff',
          500: '#your-brand-color',
          900: '#your-dark-brand',
        }
      }
    }
  }
}
```

Then use the new colors:
```tsx
className="bg-brand-500 text-white"
```

## Common Patterns

### Card Layout
```tsx
<Card variant="default" className="p-6">
  <CardHeader className="pb-4">
    <CardTitle variant="default">Transaction History</CardTitle>
    <CardDescription>Your recent financial activity</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Card content */}
  </CardContent>
</Card>
```

### Form Fields
```tsx
<View className="space-y-4">
  <View>
    <Label className="text-sm font-medium mb-1.5">Amount</Label>
    <Input 
      variant="outline" 
      placeholder="Enter amount"
      className="w-full"
    />
  </View>
</View>
```

### Status Messages
```tsx
<View className="bg-success-50 border-l-4 border-success-400 p-4">
  <View className="flex-row items-center">
    <Icon name="check-circle" color={theme.colors.success[500]} />
    <Text className="ml-2 text-success-800 font-medium">
      Success message here
    </Text>
  </View>
</View>
```

This theme system ensures consistent design across the entire SmartBudget application while maintaining flexibility for future updates and customization.