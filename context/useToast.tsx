import { useCallback } from 'react';

import { toast as showToastLegacy, showToast, type ToastProps } from '@/components/Toast';

export function useToast() {
  const toast = useCallback((options: ToastProps) => {
    showToastLegacy(options);
  }, []);

  return {
    toast,
    showToast,
  };
}

export const toast = showToastLegacy;
