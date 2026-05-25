import { Platform } from 'react-native';
import { ExecuTorchExpoFetcher } from '@/lib/ai/executorchExpoFetcher';

let initPromise: Promise<boolean> | null = null;

export async function initializeExecutorch() {
  if (Platform.OS === 'web') {
    return false;
  }

  if (!initPromise) {
    initPromise = (async () => {
      try {
        const executorchModule = await import('react-native-executorch');
        const initExecutorch = (executorchModule as { initExecutorch?: unknown }).initExecutorch;

        if (typeof initExecutorch !== 'function') {
          return false;
        }

        (initExecutorch as (config: { resourceFetcher: unknown }) => void)({
          resourceFetcher: ExecuTorchExpoFetcher,
        });

        return true;
      } catch (error) {
        console.warn('ExecuTorch initialization skipped:', error);
        return false;
      }
    })();
  }

  return initPromise;
}
