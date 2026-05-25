import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { AppText } from '@/components/AppText';

type SegmentOption<T extends string> = {
  label: string;
  value: T;
};

interface PillSegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function PillSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = '',
}: PillSegmentedControlProps<T>) {
  return (
    <View
      className={`flex-row rounded-full border border-app-border bg-app-canvas-elevated p-1 ${className}`}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            onPress={() => onChange(option.value)}
            className={`flex-1 rounded-full px-4 py-2 ${
              selected ? 'bg-app-surface-2' : 'bg-transparent'
            }`}>
            <AppText
              variant="caption"
              className={`text-center text-sm ${
                selected ? 'text-app-text-strong' : 'text-app-text-faint'
              }`}>
              {option.label}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
