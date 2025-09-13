import * as React from 'react';
import { TextInput, View, Text } from 'react-native';

export interface InputProps {
  variant?: 'default' | 'outline' | 'filled';
  size?: 'sm' | 'md' | 'lg';
  state?: 'default' | 'error' | 'success';
  disabled?: boolean;
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  secureTextEntry?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  label?: string;
  helperText?: string;
  errorText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
  style?: any;
  id?: string;
}

const Input = React.forwardRef<TextInput, InputProps>(
  (
    {
      variant = 'default',
      size = 'md',
      state = 'default',
      disabled = false,
      placeholder,
      value,
      onChangeText,
      onBlur,
      onFocus,
      keyboardType = 'default',
      secureTextEntry = false,
      multiline = false,
      numberOfLines,
      maxLength,
      label,
      helperText,
      errorText,
      leftIcon,
      rightIcon,
      className = '',
      style,
      id,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = React.useState(false);

    const getVariantClasses = () => {
      switch (variant) {
        case 'outline':
          return 'bg-transparent border-2 border-border-default';
        case 'filled':
          return 'bg-background-secondary border border-border-muted';
        default:
          return 'bg-background-primary border border-border-default';
      }
    };

    const getStateClasses = () => {
      if (errorText || state === 'error') {
        return 'border-error-500 focus:border-error-600';
      }
      if (state === 'success') {
        return 'border-success-500 focus:border-success-600';
      }
      return 'focus:border-primary-500';
    };

    const getFocusClasses = () => {
      if (isFocused) {
        if (errorText || state === 'error') {
          return 'border-error-600';
        }
        if (state === 'success') {
          return 'border-success-600';
        }
        return 'border-primary-500';
      }
      return '';
    };

    const getSizeClasses = () => {
      switch (size) {
        case 'sm':
          return {
            container: 'h-input-sm',
            input: 'text-sm px-3 py-2',
            label: 'text-sm font-medium mb-1',
            helper: 'text-xs mt-1',
          };
        case 'lg':
          return {
            container: 'h-input-lg',
            input: 'text-lg px-4 py-3',
            label: 'text-base font-medium mb-2',
            helper: 'text-sm mt-2',
          };
        default:
          return {
            container: multiline ? 'min-h-input-md' : 'h-input-md',
            input: 'text-base px-3 py-2',
            label: 'text-sm font-medium mb-1.5',
            helper: 'text-sm mt-1.5',
          };
      }
    };

    const variantClasses = getVariantClasses();
    const stateClasses = getStateClasses();
    const focusClasses = getFocusClasses();
    const sizeClasses = getSizeClasses();

    const disabledClasses = disabled ? 'opacity-50 bg-background-tertiary' : '';

    const containerClasses = `
      ${sizeClasses.container}
      ${variantClasses}
      ${stateClasses}
      ${focusClasses}
      ${disabledClasses}
      rounded-lg flex-row items-center
      ${className}
    `.trim();

    const inputClasses = `
      ${sizeClasses.input}
      flex-1 text-foreground-primary
    `.trim();

    const handleFocus = (e: any) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: any) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    return (
      <View className="w-full">
        {/* Label */}
        {label && <Text className={`${sizeClasses.label} text-foreground-primary`}>{label}</Text>}

        {/* Input Container */}
        <View className={containerClasses} style={style}>
          {/* Left Icon */}
          {leftIcon && <View className="ml-3">{leftIcon}</View>}

          {/* Text Input */}
          <TextInput
            ref={ref}
            className={inputClasses}
            placeholder={placeholder}
            placeholderTextColor="#9ca3af"
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            keyboardType={keyboardType}
            secureTextEntry={secureTextEntry}
            multiline={multiline}
            numberOfLines={numberOfLines}
            maxLength={maxLength}
            editable={!disabled}
            selectTextOnFocus={!disabled}
            accessibilityLabel={label || placeholder}
            accessibilityHint={helperText}
            nativeID={id}
            {...props}
          />

          {/* Right Icon */}
          {rightIcon && <View className="mr-3">{rightIcon}</View>}
        </View>

        {/* Helper Text */}
        {(helperText || errorText) && (
          <Text
            className={`${sizeClasses.helper} ${
              errorText ? 'text-error-600' : 'text-foreground-muted'
            }`}>
            {errorText || helperText}
          </Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';

export { Input };
