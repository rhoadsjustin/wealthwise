import { Platform } from 'react-native';
import AppleFinanceKitModule, {
  type AppleFinanceAccount,
  type AppleFinanceAuthorizationStatus,
  type AppleFinanceAvailability,
  type AppleFinanceTransaction,
} from '@/modules/apple-finance-kit';

export type {
  AppleFinanceAccount,
  AppleFinanceAuthorizationStatus,
  AppleFinanceAvailability,
  AppleFinanceTransaction,
} from '@/modules/apple-finance-kit';

function ensureModule() {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple FinanceKit integration is only available on iOS.');
  }

  return AppleFinanceKitModule;
}

export async function getAppleFinanceAvailability(): Promise<AppleFinanceAvailability> {
  return ensureModule().getAvailability();
}

export async function getAppleFinanceAuthorizationStatus(): Promise<AppleFinanceAuthorizationStatus> {
  return ensureModule().getAuthorizationStatus();
}

export async function requestAppleFinanceAuthorization(): Promise<AppleFinanceAuthorizationStatus> {
  return ensureModule().requestAuthorization();
}

export async function getAppleFinanceAccounts(): Promise<AppleFinanceAccount[]> {
  return ensureModule().getAccounts();
}

export async function getAppleFinanceRecentTransactions(
  limit = 100
): Promise<AppleFinanceTransaction[]> {
  return ensureModule().getRecentTransactions(limit);
}
