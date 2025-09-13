/**
 * Theme constants for the SmartBudget app
 * These constants provide a centralized way to access theme values
 * and ensure consistency across the application.
 */

export const theme = {
  colors: {
    // Primary brand colors
    primary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9', // Main primary
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
      950: '#082f49',
    },

    // Secondary colors
    secondary: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b', // Main secondary
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#020617',
    },

    // Status colors
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e', // Main success
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
      950: '#052e16',
    },

    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b', // Main warning
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
      950: '#451a03',
    },

    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444', // Main error
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
      950: '#450a0a',
    },

    info: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6', // Main info
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554',
    },

    // Neutral colors
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
      950: '#030712',
    },

    // Semantic color mappings
    background: {
      primary: '#ffffff',
      secondary: '#f9fafb',
      tertiary: '#f3f4f6',
      dark: '#111827',
    },

    foreground: {
      primary: '#111827',
      secondary: '#374151',
      muted: '#6b7280',
      inverse: '#ffffff',
    },

    border: {
      default: '#e5e7eb',
      muted: '#f3f4f6',
      strong: '#d1d5db',
    },

    card: {
      background: '#ffffff',
      border: '#e5e7eb',
      shadow: 'rgba(0, 0, 0, 0.1)',
    },

    // App-level theme colors
    app: {
      primary: '#0EA5E9', // Sky blue - main brand color
      primaryDark: '#0284C7', // Darker blue for active states
      success: '#22C55E', // Green for positive financial data
      warning: '#F59E0B', // Orange for warnings
      error: '#EF4444', // Red for errors/negative data
      background: '#FAFAFA', // Light gray app background
      surface: '#FFFFFF', // White surface color for cards/modals
      text: '#1F2937', // Dark gray for primary text
      textSecondary: '#374151', // Medium gray for secondary text
      textMuted: '#6B7280', // Light gray for muted text
      border: '#E5E7EB', // Light border color
      borderMuted: '#F3F4F6', // Very light border
      inactive: '#9CA3AF', // Inactive states
      overlay: 'rgba(0, 0, 0, 0.5)', // Modal overlays
    },

    // Financial app specific colors
    financial: {
      positive: '#22C55E', // Green for income/gains
      negative: '#EF4444', // Red for expenses/losses
      neutral: '#6B7280', // Gray for neutral states
      budgetGood: '#10B981', // Green for under budget
      budgetWarning: '#F59E0B', // Orange for approaching budget
      budgetOver: '#EF4444', // Red for over budget
    },
  },

  // Typography scale
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },

  // Font weights
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },

  // Line heights
  lineHeight: {
    xs: 16,
    sm: 20,
    base: 24,
    lg: 28,
    xl: 28,
    '2xl': 32,
    '3xl': 36,
    '4xl': 40,
  },

  // Spacing scale
  spacing: {
    0: 0,
    0.5: 2,
    1: 4,
    1.5: 6,
    2: 8,
    2.5: 10,
    3: 12,
    3.5: 14,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40,
    11: 44,
    12: 48,
    14: 56,
    16: 64,
    20: 80,
    24: 96,
    28: 112,
    32: 128,
  },

  // Border radius
  borderRadius: {
    none: 0,
    xs: 2,
    sm: 4,
    md: 6,
    lg: 8,
    xl: 12,
    '2xl': 16,
    '3xl': 24,
    full: 9999,
  },

  // Component sizes
  componentSizes: {
    button: {
      sm: { height: 32, paddingX: 12, paddingY: 6 },
      md: { height: 40, paddingX: 16, paddingY: 8 },
      lg: { height: 48, paddingX: 20, paddingY: 12 },
    },
    input: {
      sm: { height: 36, paddingX: 12, paddingY: 6 },
      md: { height: 40, paddingX: 12, paddingY: 8 },
      lg: { height: 48, paddingX: 16, paddingY: 12 },
    },
  },

  // Shadows/Elevation
  shadows: {
    xs: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 15,
      elevation: 8,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.1,
      shadowRadius: 25,
      elevation: 12,
    },
    '2xl': {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 25 },
      shadowOpacity: 0.25,
      shadowRadius: 50,
      elevation: 16,
    },
  },

  // Animation durations
  animations: {
    duration: {
      fast: 150,
      normal: 300,
      slow: 500,
    },
    easing: {
      easeInOut: 'ease-in-out',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
    },
  },
} as const;

// App-level theme constants for easy access
export const appColors = theme.colors.app;
export const financialColors = theme.colors.financial;

// Helper functions for theme usage
export const getColor = (colorPath: string) => {
  const keys = colorPath.split('.');
  let value: any = theme.colors;

  for (const key of keys) {
    value = value?.[key];
    if (value === undefined) break;
  }

  return value || '#000000'; // fallback color
};

export const getSpacing = (size: keyof typeof theme.spacing) => {
  return theme.spacing[size] || 0;
};

export const getFontSize = (size: keyof typeof theme.fontSize) => {
  return theme.fontSize[size] || theme.fontSize.base;
};

export const getBorderRadius = (size: keyof typeof theme.borderRadius) => {
  return theme.borderRadius[size] || theme.borderRadius.md;
};

export const getShadow = (size: keyof typeof theme.shadows) => {
  return theme.shadows[size] || theme.shadows.sm;
};

// Type definitions for better TypeScript support
export type ThemeColor = keyof typeof theme.colors;
export type ThemeSpacing = keyof typeof theme.spacing;
export type ThemeFontSize = keyof typeof theme.fontSize;
export type ThemeBorderRadius = keyof typeof theme.borderRadius;
export type ThemeShadow = keyof typeof theme.shadows;

// Color variant types
export type ColorVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
export type ColorShade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;

// Component variant types
export type ButtonVariant =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'success'
  | 'warning'
  | 'error';
export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'outline';
export type InputVariant = 'default' | 'outline' | 'filled';
export type CardVariant = 'default' | 'outlined' | 'elevated' | 'filled';

// Size types
export type ComponentSize = 'sm' | 'md' | 'lg';

// Router theme configuration
export const routerTheme = {
  colors: {
    primary: theme.colors.app.primary,
    background: theme.colors.app.background,
    card: theme.colors.app.surface,
    text: theme.colors.app.text,
    border: theme.colors.app.border,
    notification: theme.colors.app.primary,
  },
  // Tab bar styling
  tabBar: {
    activeTintColor: theme.colors.app.primary,
    inactiveTintColor: theme.colors.app.inactive,
    backgroundColor: theme.colors.app.surface,
    borderColor: theme.colors.app.border,
  },
  // Header styling
  header: {
    backgroundColor: theme.colors.app.surface,
    borderColor: theme.colors.app.border,
    titleColor: theme.colors.app.text,
    tintColor: theme.colors.app.primary,
  },
};

export default theme;
