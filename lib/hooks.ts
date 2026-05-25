import { useCallback, useState } from 'react';

/**
 * Hook for currency/decimal inputs with inline formatting.
 *
 * Usage:
 *   const { value, onChangeText, getValue } = useCurrencyInput(existingAmount);
 *   <Input value={value} onChangeText={onChangeText} keyboardType="decimal-pad" />
 *   // On submit: const amount = getValue();
 */
export function useCurrencyInput(initialValue = ''): {
  value: string;
  onChangeText: (text: string) => void;
  getValue: () => string;
} {
  const [value, setValue] = useState(initialValue);

  const onChangeText = useCallback(
    (text: string) => {
      // Strip non-numeric chars except one leading decimal point
      const stripped = text.replace(/[^0-9.]/g, '');
      const parts = stripped.split('.');
      // Allow only one decimal separator; limit to 2 decimal places
      const formatted =
        parts.length > 1
          ? `${parts[0]}.${parts.slice(1).join('').slice(0, 2)}`
          : parts[0];
      setValue(formatted);
    },
    []
  );

  const getValue = () => value;

  return { value, onChangeText, getValue };
}
