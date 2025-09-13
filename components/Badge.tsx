import * as React from 'react';
import { View, Text } from 'react-native';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: any;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  style,
  ...props
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'secondary':
        return 'bg-secondary-100 border-secondary-300';
      case 'success':
        return 'bg-success-100 border-success-300';
      case 'warning':
        return 'bg-warning-100 border-warning-300';
      case 'error':
        return 'bg-error-100 border-error-300';
      case 'info':
        return 'bg-info-100 border-info-300';
      case 'outline':
        return 'bg-transparent border-border-strong';
      default:
        return 'bg-gray-900 border-gray-900';
    }
  };

  const getTextVariantClasses = () => {
    switch (variant) {
      case 'secondary':
        return 'text-secondary-800';
      case 'success':
        return 'text-success-800';
      case 'warning':
        return 'text-warning-800';
      case 'error':
        return 'text-error-800';
      case 'info':
        return 'text-info-800';
      case 'outline':
        return 'text-foreground-primary';
      default:
        return 'text-foreground-inverse';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'px-2 py-0.5 rounded-md',
          text: 'text-xs font-medium',
        };
      case 'lg':
        return {
          container: 'px-3 py-1 rounded-lg',
          text: 'text-sm font-semibold',
        };
      default:
        return {
          container: 'px-2.5 py-1 rounded-md',
          text: 'text-xs font-medium',
        };
    }
  };

  const variantClasses = getVariantClasses();
  const textVariantClasses = getTextVariantClasses();
  const sizeClasses = getSizeClasses();

  const containerClasses = `
    ${sizeClasses.container}
    ${variantClasses}
    border inline-flex items-center justify-center
    ${className}
  `.trim();

  const textClasses = `
    ${sizeClasses.text}
    ${textVariantClasses}
    text-center leading-none
  `.trim();

  return (
    <View className={containerClasses} style={style} {...props}>
      <Text className={textClasses}>{children}</Text>
    </View>
  );
};

export { Badge };
export type { BadgeProps };
