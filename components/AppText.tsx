import React from 'react';
import { Text, TextProps } from 'react-native';

export type AppTextVariant =
  | 'label-xs'
  | 'label-sm'
  | 'caption'
  | 'hint'
  | 'body'
  | 'body-md'
  | 'form-label'
  | 'title'
  | 'section'
  | 'page-title'
  | 'metric'
  | 'metric-lg'
  | 'hero';

type VariantConfig = {
  className: string;
  numberOfLines?: number;
  ellipsizeMode?: 'tail' | 'middle' | 'head' | 'clip';
  allowFontScaling: boolean;
};

const variantConfig: Record<AppTextVariant, VariantConfig> = {
  // Chip / eyebrow labels — always single-line, no font scaling
  'label-xs': {
    className: 'text-2xs uppercase tracking-[0.08em]',
    numberOfLines: 1,
    ellipsizeMode: 'tail',
    allowFontScaling: false,
  },
  'label-sm': {
    className: 'text-xs uppercase tracking-[0.08em]',
    numberOfLines: 1,
    ellipsizeMode: 'tail',
    allowFontScaling: false,
  },
  // Small metadata badges, status chips
  caption: {
    className: 'text-xs font-medium',
    numberOfLines: 1,
    ellipsizeMode: 'tail',
    allowFontScaling: false,
  },
  // Helper text, descriptions — intentionally multi-line
  hint: {
    className: 'text-xs leading-5',
    allowFontScaling: true,
  },
  // Body text — multi-line prose
  body: {
    className: 'text-sm leading-5',
    allowFontScaling: true,
  },
  'body-md': {
    className: 'text-base leading-6',
    allowFontScaling: true,
  },
  // Form field labels
  'form-label': {
    className: 'text-sm font-medium',
    numberOfLines: 1,
    allowFontScaling: true,
  },
  // Card / item names — single-line with ellipsis
  title: {
    className: 'text-base font-semibold',
    numberOfLines: 1,
    ellipsizeMode: 'tail',
    allowFontScaling: true,
  },
  // Section headers — allow up to 2 lines
  section: {
    className: 'text-lg font-semibold',
    numberOfLines: 2,
    allowFontScaling: true,
  },
  // Screen / modal titles
  'page-title': {
    className: 'text-xl font-semibold',
    allowFontScaling: true,
  },
  // Monetary amounts, metrics — no font scaling to protect layout
  metric: {
    className: 'text-sm font-semibold tabular-nums',
    numberOfLines: 1,
    allowFontScaling: false,
  },
  'metric-lg': {
    className: 'text-lg font-semibold tabular-nums',
    numberOfLines: 1,
    allowFontScaling: false,
  },
  // Hero balance display
  hero: {
    className: 'text-3xl font-semibold tabular-nums',
    numberOfLines: 1,
    allowFontScaling: false,
  },
};

export interface AppTextProps extends TextProps {
  variant: AppTextVariant;
  className?: string;
}

export function AppText({
  variant,
  className = '',
  numberOfLines,
  ellipsizeMode,
  allowFontScaling,
  ...rest
}: AppTextProps) {
  const config = variantConfig[variant];

  return (
    <Text
      className={`${config.className}${className ? ` ${className}` : ''}`}
      numberOfLines={numberOfLines !== undefined ? numberOfLines : config.numberOfLines}
      ellipsizeMode={ellipsizeMode ?? config.ellipsizeMode}
      allowFontScaling={allowFontScaling !== undefined ? allowFontScaling : config.allowFontScaling}
      {...rest}
    />
  );
}
