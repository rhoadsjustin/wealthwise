import * as React from 'react';
import { Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';

export interface ButtonProps {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children?: React.ReactNode;
  title?: string;
  onPress?: () => void;
  className?: string;
  style?: any;
}

const Button = React.forwardRef<View, ButtonProps>(
  (
    {
      variant = 'default',
      size = 'md',
      disabled = false,
      loading = false,
      children,
      title,
      onPress,
      className = '',
      style,
      ...props
    },
    ref
  ) => {
    const getVariantClasses = () => {
      switch (variant) {
        case 'secondary':
          return 'bg-secondary-100 border border-secondary-300 active:bg-secondary-200';
        case 'outline':
          return 'bg-transparent border border-border-default active:bg-gray-50';
        case 'ghost':
          return 'bg-transparent active:bg-gray-100';
        case 'success':
          return 'bg-success-500 active:bg-success-600';
        case 'warning':
          return 'bg-warning-500 active:bg-warning-600';
        case 'error':
          return 'bg-error-500 active:bg-error-600';
        default:
          return 'bg-primary-500 active:bg-primary-600';
      }
    };

    const getTextVariantClasses = () => {
      switch (variant) {
        case 'secondary':
          return 'text-secondary-700';
        case 'outline':
          return 'text-foreground-primary';
        case 'ghost':
          return 'text-foreground-primary';
        case 'success':
        case 'warning':
        case 'error':
        default:
          return 'text-foreground-inverse';
      }
    };

    const getSizeClasses = () => {
      switch (size) {
        case 'sm':
          return {
            container: 'h-button-sm px-4 rounded-full',
            text: 'text-sm font-medium',
          };
        case 'lg':
          return {
            container: 'h-button-lg px-6 rounded-full',
            text: 'text-lg font-semibold',
          };
        default:
          return {
            container: 'h-button-md px-5 rounded-full',
            text: 'text-base font-medium',
          };
      }
    };

    const variantClasses = getVariantClasses();
    const textVariantClasses = getTextVariantClasses();
    const sizeClasses = getSizeClasses();

    const disabledClasses = disabled || loading ? 'opacity-50' : '';

    const containerClasses = `
      ${sizeClasses.container}
      ${variantClasses}
      ${disabledClasses}
      flex-row items-center justify-center
      ${className}
    `.trim();

    const textClasses = `
      ${sizeClasses.text}
      ${textVariantClasses}
    `.trim();

    return (
      <TouchableOpacity
        ref={ref}
        className={containerClasses}
        style={style}
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.8}
        {...props}>
        {loading && (
          <View className="mr-2">
            <ActivityIndicator
              size="small"
              color={
                variant === 'outline' || variant === 'ghost' || variant === 'secondary'
                  ? '#374151'
                  : '#ffffff'
              }
            />
          </View>
        )}

        {children ? (
          <View className="flex-row items-center">{children}</View>
        ) : (
          title && <Text className={textClasses}>{title}</Text>
        )}
      </TouchableOpacity>
    );
  }
);

Button.displayName = 'Button';

export { Button };
