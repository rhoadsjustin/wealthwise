import { useCallback } from 'react';

import { showToast, toast as toastLegacy, type ToastProps } from '@/components/Toast';
import { useToastContext } from '@/context/ToastContext';

export function useToast() {
  const { addToast } = useToastContext();

  const toast = useCallback(
    ({ variant = 'default', title, description }: ToastProps) => {
      toastLegacy({ variant, title, description });
    },
    [],
  );

  return {
    toast,
    showToast,
    addToast,
  };
}

export const toast = toastLegacy;
