import { useNativeState, type ObservableState } from '@expo/ui';
import { useCallback } from 'react';

/**
 * Hook for currency/decimal inputs using a worklet-based onChangeText handler.
 *
 * Runs formatting synchronously on the UI thread so there is no flicker between
 * the typed value and the masked value.
 *
 * Requires react-native-worklets to be installed for worklet support.
 *
 * Usage:
 *   const { nativeValue, onChangeText, getValue } = useCurrencyInput(existingAmount);
 *   <Input nativeValue={nativeValue} onChangeText={onChangeText} keyboardType="decimal-pad" />
 *   // On submit: const amount = getValue();
 */
export function useCurrencyInput(initialValue = ''): {
  nativeValue: ObservableState<string>;
  onChangeText: (text: string) => void;
  getValue: () => string;
} {
  const nativeValue = useNativeState(initialValue);

  // nativeValue is a stable SharedObject — safe to reference inside the worklet
  // without re-creating the callback on every render.
  const onChangeText = useCallback(
    (text: string) => {
      'worklet';
      // Strip non-numeric chars except one leading decimal point
      const stripped = text.replace(/[^0-9.]/g, '');
      const parts = stripped.split('.');
      // Allow only one decimal separator; limit to 2 decimal places
      const formatted =
        parts.length > 1
          ? `${parts[0]}.${parts.slice(1).join('').slice(0, 2)}`
          : parts[0];
      if (formatted !== text) {
        nativeValue.value = formatted;
      }
    },
    [nativeValue]
  );

  const getValue = () => nativeValue.value;

  return { nativeValue, onChangeText, getValue };
}
