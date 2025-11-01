import { forwardRef, type ElementRef } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type HeaderButtonRef = ElementRef<typeof TouchableOpacity>;

export const HeaderButton = forwardRef<HeaderButtonRef, { onPress?: () => void }>(
  ({ onPress }, ref) => {
    return (
      <TouchableOpacity
        ref={ref}
        onPress={onPress}
        style={styles.button}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="add" size={24} color="#0EA5E9" />
        <Text>Add</Text>
      </TouchableOpacity>
    );
  }
);

HeaderButton.displayName = 'HeaderButton';

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    padding: 4,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
});
