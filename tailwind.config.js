/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,tsx}', './components/**/*.{js,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        // Brand Colors
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
        // Status Colors
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
        // Neutral Colors
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
        // Background Colors
        background: {
          primary: '#ffffff',
          secondary: '#f9fafb',
          tertiary: '#f3f4f6',
          dark: '#111827',
        },
        // Text Colors
        foreground: {
          primary: '#111827',
          secondary: '#374151',
          muted: '#6b7280',
          inverse: '#ffffff',
        },
        // Border Colors
        border: {
          default: '#e5e7eb',
          muted: '#f3f4f6',
          strong: '#d1d5db',
        },
        // Card Colors
        card: {
          background: '#ffffff',
          border: '#e5e7eb',
          shadow: 'rgba(0, 0, 0, 0.1)',
        },
        // App-level semantic tokens (light)
        'app-background': '#F7F9FC',
        'app-surface': '#FFFFFF',
        'app-surface-alt': '#F9FBFF',
        'app-border': '#E6EAF2',
        'app-border-muted': '#EEF2F8',
        'app-text': '#111827',
        'app-text-secondary': '#374151',
        'app-text-muted': '#6B7280',

        // App-level semantic tokens (dark)
        'app-background-dark': '#0B1220',
        'app-surface-dark': '#111827',
        'app-surface-alt-dark': '#0F1626',
        'app-border-dark': '#1F2A3A',
        'app-text-dark': '#F3F4F6',
        'app-text-secondary-dark': '#CBD5E1',
        'app-text-muted-dark': '#94A3B8',

        // Dark redesign tokens
        'app-canvas': '#050816',
        'app-canvas-elevated': '#090D1E',
        'app-surface-1': '#0D1325',
        'app-surface-2': '#12192E',
        'app-surface-3': '#182136',
        'app-surface-overlay': 'rgba(8, 12, 26, 0.86)',
        'app-card-glow': 'rgba(73, 255, 188, 0.12)',
        'app-border-strong': '#2B3652',
        'app-border-contrast': '#3A4767',
        'app-text-strong': '#F8FAFC',
        'app-text-soft': '#C8D3EA',
        'app-text-faint': '#8190B3',
        'accent-income': '#59F7A5',
        'accent-expense': '#FF5D8F',
        'accent-debt': '#FFB347',
        'accent-savings': '#58B6FF',
        'accent-insight': '#A78BFA',
        'accent-neutral': '#91A3C7',

        // Financial shortcuts used in components
        'financial-positive': '#22C55E',
        'financial-negative': '#EF4444',

        // Misc semantic
        'budget-primary': '#3B82F6',
        app: {
          primary: '#0EA5E9', // Sky blue - main brand color
          'primary-dark': '#0284C7', // Darker blue for active states
          success: '#22C55E', // Green for positive financial data
          warning: '#F59E0B', // Orange for warnings
          error: '#EF4444', // Red for errors/negative data
          background: '#FAFAFA', // Light gray app background
          surface: '#FFFFFF', // White surface color for cards/modals
          text: '#1F2937', // Dark gray for primary text
          'text-secondary': '#374151', // Medium gray for secondary text
          'text-muted': '#6B7280', // Light gray for muted text
          border: '#E5E7EB', // Light border color
          'border-muted': '#F3F4F6', // Very light border
          inactive: '#9CA3AF', // Inactive states
          overlay: 'rgba(0, 0, 0, 0.5)', // Modal overlays
        },
        // Financial app specific colors
        financial: {
          positive: '#22C55E', // Green for income/gains
          negative: '#EF4444', // Red for expenses/losses
          neutral: '#6B7280', // Gray for neutral states
          'budget-good': '#10B981', // Green for under budget
          'budget-warning': '#F59E0B', // Orange for approaching budget
          'budget-over': '#EF4444', // Red for over budget
        },
      },
      // Typography
      fontSize: {
        '2xs': ['11px', { lineHeight: '14px' }],
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['14px', { lineHeight: '20px' }],
        base: ['16px', { lineHeight: '24px' }],
        lg: ['18px', { lineHeight: '28px' }],
        xl: ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '36px' }],
        '4xl': ['36px', { lineHeight: '40px' }],
      },
      fontWeight: {
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
      },
      // Spacing
      spacing: {
        0.5: '2px',
        1: '4px',
        1.5: '6px',
        2: '8px',
        2.5: '10px',
        3: '12px',
        3.5: '14px',
        4: '16px',
        5: '20px',
        6: '24px',
        7: '28px',
        8: '32px',
        9: '36px',
        10: '40px',
        11: '44px',
        12: '48px',
        14: '56px',
        16: '64px',
        20: '80px',
        24: '96px',
        28: '112px',
        32: '128px',
      },
      // Border Radius
      borderRadius: {
        none: '0px',
        xs: '2px',
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
        '2xl': '16px',
        '3xl': '24px',
        full: '9999px',
      },
      // Shadows
      boxShadow: {
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
        glow: '0 14px 40px -18px rgba(88, 182, 255, 0.48)',
        'glow-soft': '0 18px 45px -28px rgba(167, 139, 250, 0.5)',
      },
      // Component Sizes
      height: {
        'button-sm': '32px',
        'button-md': '40px',
        'button-lg': '48px',
        'input-sm': '36px',
        'input-md': '40px',
        'input-lg': '48px',
      },
      // Animation
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'fade-out': 'fadeOut 0.2s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'bounce-soft': 'bounceSoft 0.6s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideIn: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0px)', opacity: '1' },
        },
        bounceSoft: {
          '0%': { transform: 'scale(0.95)' },
          '50%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
