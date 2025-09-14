import * as React from 'react';
import { View, Text, ViewStyle, TextStyle, Animated } from 'react-native';

interface CardProps {
  variant?: 'default' | 'outlined' | 'elevated' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  style?: ViewStyle;
  children?: React.ReactNode;
}

const Card = React.forwardRef<Animated.View, CardProps>(
  ({ variant = 'default', padding = 'md', className = '', style, children, ...props }, ref) => {
    const getVariantClasses = () => {
      switch (variant) {
        case 'outlined':
          return 'bg-card-background border-2 border-border-strong';
        case 'elevated':
          return 'bg-card-background border border-card-border shadow-lg';
        case 'filled':
          return 'bg-background-secondary border border-border-muted';
        default:
          return 'bg-card-background border border-card-border shadow-sm';
      }
    };

    const getPaddingClasses = () => {
      switch (padding) {
        case 'none':
          return '';
        case 'sm':
          return 'p-3';
        case 'lg':
          return 'p-8';
        default:
          return 'p-6';
      }
    };

    const cardClasses = `
      ${getVariantClasses()}
      ${getPaddingClasses()}
      rounded-xl
      ${className}
    `.trim();

    return (
      <Animated.View ref={ref} className={cardClasses} style={style} {...props}>
        {children}
      </Animated.View>
    );
  }
);

Card.displayName = 'Card';

interface CardHeaderProps {
  className?: string;
  style?: ViewStyle;
  children?: React.ReactNode;
}

const CardHeader = React.forwardRef<View, CardHeaderProps>(
  ({ className = '', style, children, ...props }, ref) => (
    <View ref={ref} className={`pb-4 ${className}`} style={style} {...props}>
      {children}
    </View>
  )
);

CardHeader.displayName = 'CardHeader';

interface CardTitleProps {
  variant?: 'default' | 'large' | 'small';
  className?: string;
  style?: TextStyle;
  children?: React.ReactNode;
}

const CardTitle = React.forwardRef<View, CardTitleProps>(
  ({ variant = 'default', className = '', style, children, ...props }, ref) => {
    const getVariantClasses = () => {
      switch (variant) {
        case 'large':
          return 'text-2xl font-bold';
        case 'small':
          return 'text-lg font-semibold';
        default:
          return 'text-xl font-semibold';
      }
    };

    const titleClasses = `
      ${getVariantClasses()}
      text-foreground-primary leading-tight
      ${className}
    `.trim();

    return (
      <View ref={ref} {...props}>
        <Text className={titleClasses} style={style}>
          {children}
        </Text>
      </View>
    );
  }
);

CardTitle.displayName = 'CardTitle';

interface CardDescriptionProps {
  className?: string;
  style?: TextStyle;
  children?: React.ReactNode;
}

const CardDescription = React.forwardRef<View, CardDescriptionProps>(
  ({ className = '', style, children, ...props }, ref) => (
    <View ref={ref} {...props}>
      <Text
        className={`mt-1.5 text-sm leading-relaxed text-foreground-muted ${className}`}
        style={style}>
        {children}
      </Text>
    </View>
  )
);

CardDescription.displayName = 'CardDescription';

interface CardContentProps {
  className?: string;
  style?: ViewStyle;
  children?: React.ReactNode;
}

const CardContent = React.forwardRef<View, CardContentProps>(
  ({ className = '', style, children, ...props }, ref) => (
    <View ref={ref} className={className} style={style} {...props}>
      {children}
    </View>
  )
);

CardContent.displayName = 'CardContent';

interface CardFooterProps {
  className?: string;
  style?: ViewStyle;
  children?: React.ReactNode;
}

const CardFooter = React.forwardRef<View, CardFooterProps>(
  ({ className = '', style, children, ...props }, ref) => (
    <View ref={ref} className={`flex-row items-center pt-4 ${className}`} style={style} {...props}>
      {children}
    </View>
  )
);

CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
