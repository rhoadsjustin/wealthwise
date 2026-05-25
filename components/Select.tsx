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

type TouchableOpacityRef = React.ElementRef<typeof TouchableOpacity>;

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

export const SelectTrigger = React.forwardRef<TouchableOpacityRef, SelectTriggerProps>(
  ({ children, className = '', style, onPress, ...props }, ref) => {
    const { isOpen } = useSelectContext();

    return (
      <TouchableOpacity
        ref={ref}
        onPress={onPress}
        activeOpacity={0.7}
        className={`min-h-[40px] rounded-lg border border-app-border-strong bg-app-surface-1 px-3 py-2 ${className}`}
        style={style}
        {...props}>
        <View className="flex-row items-center justify-between">
          <View className="flex-1">{children}</View>
          <Animated.View
            style={{
              transform: [{ rotate: isOpen ? '180deg' : '0deg' }],
            }}>
            <Ionicons name="chevron-down" size={16} color="#8190B3" />
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
      <Text ref={ref} className="flex-1 text-sm text-app-text-strong" numberOfLines={1}>
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
      className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-app-border-strong bg-app-surface-2 shadow-md"
      style={{ maxHeight: 240 }}>
      <Animated.ScrollView
        showsVerticalScrollIndicator
        bounces
        keyboardShouldPersistTaps="handled"
        style={{ maxHeight: 240 }}>
        {children}
      </Animated.ScrollView>
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

export const SelectItem = React.forwardRef<TouchableOpacityRef, SelectItemProps>(
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
          isSelected ? 'bg-app-surface-3' : 'bg-app-surface-2'
        } ${disabled ? 'opacity-50' : ''} ${className}`}
        {...props}>
        <View className="flex-1">{children}</View>
        {isSelected && <Ionicons name="checkmark" size={16} color="#58B6FF" />}
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
      className={`px-3 py-2 text-xs font-medium uppercase tracking-wider text-app-text-faint ${className}`}
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
    <View ref={ref} className={`mx-2 h-px bg-app-border-strong ${className}`} {...props} />
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
