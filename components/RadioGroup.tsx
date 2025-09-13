import * as React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RadioGroupProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  style?: any;
  className?: string;
}

interface RadioGroupContextProps {
  value?: string;
  onValueChange?: (value: string) => void;
}

const RadioGroupContext = React.createContext<RadioGroupContextProps>({});

export const RadioGroup = React.forwardRef<View, RadioGroupProps>(
  ({ children, value, onValueChange, style, className, ...props }, ref) => {
    return (
      <RadioGroupContext.Provider value={{ value, onValueChange }}>
        <View ref={ref} className={className} style={[styles.radioGroup, style]} {...props}>
          {children}
        </View>
      </RadioGroupContext.Provider>
    );
  }
);

RadioGroup.displayName = 'RadioGroup';

interface RadioGroupItemProps {
  value: string;
  id?: string;
  disabled?: boolean;
  style?: any;
}

export const RadioGroupItem = React.forwardRef<View, RadioGroupItemProps>(
  ({ value, id, disabled, style, ...props }, ref) => {
    const { value: selectedValue, onValueChange } = React.useContext(RadioGroupContext);
    const isSelected = selectedValue === value;

    const handlePress = () => {
      if (!disabled && onValueChange) {
        onValueChange(value);
      }
    };

    return (
      <TouchableOpacity
        ref={ref}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityRole="radio"
        accessibilityState={{ checked: isSelected, disabled }}
        accessibilityLabel={id}
        style={[
          styles.radioItem,
          isSelected && styles.radioItemSelected,
          disabled && styles.radioItemDisabled,
          style,
        ]}
        {...props}>
        {isSelected && (
          <View style={styles.radioIndicator}>
            <Ionicons name="ellipse" size={10} color="#000" />
          </View>
        )}
      </TouchableOpacity>
    );
  }
);

RadioGroupItem.displayName = 'RadioGroupItem';

const styles = StyleSheet.create({
  radioGroup: {
    gap: 8,
  },
  radioItem: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  radioItemSelected: {
    borderColor: '#000',
  },
  radioItemDisabled: {
    opacity: 0.5,
  },
  radioIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
