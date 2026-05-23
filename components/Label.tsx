import * as React from 'react';
import { Text } from 'react-native';

export interface LabelProps {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'muted' | 'error' | 'success';
  size?: 'sm' | 'md' | 'lg';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  disabled?: boolean;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  style?: any;
}

const Label = React.forwardRef<Text, LabelProps>(
  (
    {
      children,
      variant = 'default',
      size = 'md',
      weight = 'medium',
      disabled = false,
      required = false,
      htmlFor,
      className = '',
      style,
      ...props
    },
    ref
  ) => {
    const getVariantClasses = () => {
      switch (variant) {
        case 'secondary':
          return 'text-foreground-secondary';
        case 'muted':
          return 'text-foreground-muted';
        case 'error':
          return 'text-error-600';
        case 'success':
          return 'text-success-600';
        default:
          return 'text-foreground-primary';
      }
    };

    const getSizeClasses = () => {
      switch (size) {
        case 'sm':
          return 'text-sm leading-5';
        case 'lg':
          return 'text-lg leading-7';
        default:
          return 'text-base leading-6';
      }
    };

    const getWeightClasses = () => {
      switch (weight) {
        case 'normal':
          return 'font-normal';
        case 'semibold':
          return 'font-semibold';
        case 'bold':
          return 'font-bold';
        default:
          return 'font-medium';
      }
    };

    const disabledClasses = disabled ? 'opacity-50' : '';

    const labelClasses = `
      ${getVariantClasses()}
      ${getSizeClasses()}
      ${getWeightClasses()}
      ${disabledClasses}
      ${className}
    `.trim();

    return (
      <Text
        ref={ref}
        className={labelClasses}
        style={style}
        accessibilityRole="text"
        nativeID={htmlFor}
        {...props}>
        {children}
        {required && <Text className="ml-1 text-error-500">*</Text>}
      </Text>
    );
  }
);

Label.displayName = 'Label';

export { Label };
