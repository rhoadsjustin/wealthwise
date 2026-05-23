import { requireNativeModule } from 'expo';

export type AppleFinanceAuthorizationStatus =
  | 'authorized'
  | 'denied'
  | 'notDetermined'
  | 'unknown';

export interface AppleFinanceAvailability {
  platformSupported: boolean;
  financeKitEntitled: boolean;
  walletDataAvailable: boolean;
  minimumSupportedIOSVersion: string;
}

export interface AppleFinanceCurrencyAmount {
  amount: string;
  currencyCode: string;
}

export interface AppleFinanceAccount {
  id: string;
  kind: 'asset' | 'liability';
  displayName: string;
  institutionName: string;
  description?: string | null;
  currencyCode: string;
  openingDate?: string | null;
  creditLimit?: AppleFinanceCurrencyAmount | null;
  minimumNextPaymentAmount?: AppleFinanceCurrencyAmount | null;
  overduePaymentAmount?: AppleFinanceCurrencyAmount | null;
  nextPaymentDueDate?: string | null;
}

export interface AppleFinanceTransaction {
  id: string;
  accountId: string;
  description: string;
  originalDescription: string;
  merchantName?: string | null;
  transactionDate: string;
  postedDate?: string | null;
  amount: AppleFinanceCurrencyAmount;
  foreignCurrencyAmount?: AppleFinanceCurrencyAmount | null;
  status: string;
  creditDebitIndicator: string;
  transactionType: string;
  merchantCategoryCode?: string | null;
}

type AppleFinanceKitNativeModule = {
  getAvailability(): Promise<AppleFinanceAvailability>;
  getAuthorizationStatus(): Promise<AppleFinanceAuthorizationStatus>;
  requestAuthorization(): Promise<AppleFinanceAuthorizationStatus>;
  getAccounts(): Promise<AppleFinanceAccount[]>;
  getRecentTransactions(limit?: number): Promise<AppleFinanceTransaction[]>;
};

let nativeModule: AppleFinanceKitNativeModule | null = null;

function getNativeModule(): AppleFinanceKitNativeModule {
  if (nativeModule) {
    return nativeModule;
  }
  nativeModule = requireNativeModule<AppleFinanceKitNativeModule>('AppleFinanceKitModule');
  return nativeModule;
}

const AppleFinanceKitModuleProxy: AppleFinanceKitNativeModule = {
  getAvailability() {
    return getNativeModule().getAvailability();
  },
  getAuthorizationStatus() {
    return getNativeModule().getAuthorizationStatus();
  },
  requestAuthorization() {
    return getNativeModule().requestAuthorization();
  },
  getAccounts() {
    return getNativeModule().getAccounts();
  },
  getRecentTransactions(limit?: number) {
    return getNativeModule().getRecentTransactions(limit);
  },
};

export default AppleFinanceKitModuleProxy;
