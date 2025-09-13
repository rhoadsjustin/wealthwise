import * as React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface SelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

interface SelectContextProps {
  value?: string;
  onValueChange: (value: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const SelectContext = React.createContext<SelectContextProps | undefined>(undefined);

const useSelectContext = () => {
  const context = React.useContext(SelectContext);
  if (!context) {
    throw new Error('Select components must be used within a Select component');
  }
  return context;
};

export const Select = ({ value, onValueChange, disabled, children }: SelectProps) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const toggleOpen = () => {
    if (!disabled) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsOpen(!isOpen);
    }
  };

  return (
    <SelectContext.Provider value={{ value, onValueChange, isOpen, setIsOpen }}>
      <View className="relative">
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child) && child.type === SelectTrigger) {
            return React.cloneElement(child, { onPress: toggleOpen } as any);
          }
          return child;
        })}
      </View>
    </SelectContext.Provider>
  );
};

interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
  style?: any;
  onPress?: () => void;
}

export const SelectTrigger = React.forwardRef<View, SelectTriggerProps>(
  ({ children, className = '', style, onPress, ...props }, ref) => {
    const { isOpen } = useSelectContext();

    return (
      <TouchableOpacity
        ref={ref}
        onPress={onPress}
        activeOpacity={0.7}
        className={`border-border-default bg-background-primary min-h-[40px] rounded-lg border px-3 py-2 ${className}`}
        style={style}
        {...props}>
        <View className="flex-row items-center justify-between">
          <View className="flex-1">{children}</View>
          <Animated.View
            style={{
              transform: [{ rotate: isOpen ? '180deg' : '0deg' }],
            }}>
            <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
          </Animated.View>
        </View>
      </TouchableOpacity>
    );
  }
);

SelectTrigger.displayName = 'SelectTrigger';

interface SelectValueProps {
  placeholder?: string;
  children?: React.ReactNode;
}

export const SelectValue = React.forwardRef<Text, SelectValueProps>(
  ({ placeholder, children }, ref) => {
    const { value } = useSelectContext();

    return (
      <Text ref={ref} className="text-foreground-primary flex-1 text-sm" numberOfLines={1}>
        {value ? children || value : placeholder || 'Select an option'}
      </Text>
    );
  }
);

SelectValue.displayName = 'SelectValue';

interface SelectContentProps {
  children: React.ReactNode;
}

export const SelectContent = React.forwardRef<View, SelectContentProps>(({ children }, ref) => {
  const { isOpen } = useSelectContext();

  if (!isOpen) return null;

  return (
    <View
      ref={ref}
      className="bg-background-primary border-border-default absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-hidden rounded-lg border shadow-md">
      {children}
    </View>
  );
});

SelectContent.displayName = 'SelectContent';

interface SelectItemProps {
  children: React.ReactNode;
  value: string;
  disabled?: boolean;
  className?: string;
}

export const SelectItem = React.forwardRef<TouchableOpacity, SelectItemProps>(
  ({ children, value, disabled = false, className = '', ...props }, ref) => {
    const { value: selectedValue, onValueChange, setIsOpen } = useSelectContext();
    const isSelected = selectedValue === value;

    const handlePress = () => {
      if (!disabled) {
        onValueChange(value);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsOpen(false);
      }
    };

    return (
      <TouchableOpacity
        ref={ref}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.7}
        className={`flex-row items-center px-3 py-3 ${
          isSelected ? 'bg-primary-50' : 'bg-background-primary'
        } ${disabled ? 'opacity-50' : ''} ${className}`}
        {...props}>
        <View className="flex-1">{children}</View>
        {isSelected && <Ionicons name="checkmark" size={16} color="#0EA5E9" />}
      </TouchableOpacity>
    );
  }
);

SelectItem.displayName = 'SelectItem';

interface SelectLabelProps {
  children: React.ReactNode;
  className?: string;
}

export const SelectLabel = React.forwardRef<Text, SelectLabelProps>(
  ({ children, className = '', ...props }, ref) => (
    <Text
      ref={ref}
      className={`text-foreground-muted px-3 py-2 text-xs font-medium uppercase tracking-wider ${className}`}
      {...props}>
      {children}
    </Text>
  )
);

SelectLabel.displayName = 'SelectLabel';

interface SelectSeparatorProps {
  className?: string;
}

export const SelectSeparator = React.forwardRef<View, SelectSeparatorProps>(
  ({ className = '', ...props }, ref) => (
    <View ref={ref} className={`bg-border-default mx-2 h-px ${className}`} {...props} />
  )
);

SelectSeparator.displayName = 'SelectSeparator';

// Group component for organizing items
interface SelectGroupProps {
  children: React.ReactNode;
  className?: string;
}

export const SelectGroup = React.forwardRef<View, SelectGroupProps>(
  ({ children, className = '', ...props }, ref) => (
    <View ref={ref} className={className} {...props}>
      {children}
    </View>
  )
);

SelectGroup.displayName = 'SelectGroup';
