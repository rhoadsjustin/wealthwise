# Bank Linking Schema And Chase API Route Plan

This document is the source of truth for adding:

- Apple Card import/sync support
- Chase transaction sync via Plaid
- Expo Router API routes on EAS Hosting

## 1. Core architecture

Use two different ingestion paths:

- Apple Card:
  - Primary: `FinanceKit` on iPhone
  - Fallback: manual CSV / OFX / QFX / QBO import
- Chase:
  - Primary: Plaid OAuth + `/transactions/sync`
  - Runtime: Expo Router API routes for secrets and Plaid REST calls
  - Persistence: durable server-side storage for Plaid access tokens and cursors

Important:

- Expo API routes secure secrets, but they are not durable storage.
- Production Chase sync still requires a server-side database for Plaid items, cursors, consent state, and webhook processing.
- Device SQLite should only store normalized linked account metadata and imported transactions, never Plaid access tokens.

## 2. Exact local SQLite schema changes

### `transactions` table

Current table is too manual-entry oriented. Add these columns:

```sql
ALTER TABLE transactions ADD COLUMN bankAccountId INTEGER;
ALTER TABLE transactions ADD COLUMN source TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE transactions ADD COLUMN externalTransactionId TEXT;
ALTER TABLE transactions ADD COLUMN pending INTEGER NOT NULL DEFAULT 0;
ALTER TABLE transactions ADD COLUMN merchantName TEXT;
ALTER TABLE transactions ADD COLUMN rawDescription TEXT;
ALTER TABLE transactions ADD COLUMN postedAt TEXT;
ALTER TABLE transactions ADD COLUMN authorizedAt TEXT;
ALTER TABLE transactions ADD COLUMN currencyCode TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE transactions ADD COLUMN importBatchId TEXT;
ALTER TABLE transactions ADD COLUMN providerCategoryPrimary TEXT;
ALTER TABLE transactions ADD COLUMN providerCategoryDetailed TEXT;
ALTER TABLE transactions ADD COLUMN providerPendingTransactionId TEXT;
ALTER TABLE transactions ADD COLUMN dedupeKey TEXT;
ALTER TABLE transactions ADD COLUMN needsReview INTEGER NOT NULL DEFAULT 0;
ALTER TABLE transactions ADD COLUMN removedAt TEXT;
```

Indexes:

```sql
CREATE INDEX IF NOT EXISTS idx_transactions_bankAccountId ON transactions(bankAccountId);
CREATE INDEX IF NOT EXISTS idx_transactions_externalTransactionId ON transactions(externalTransactionId);
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_dedupeKey ON transactions(dedupeKey);
```

Semantics:

- `source`: `'manual' | 'apple_card_financekit' | 'apple_card_import' | 'plaid_chase' | 'file_import'`
- `externalTransactionId`: provider transaction id
- `pending`: pending vs posted state
- `providerPendingTransactionId`: maps pending-to-posted replacement from Plaid
- `dedupeKey`: deterministic duplicate guard

### `bankAccounts` table

Repurpose this table into normalized linked-account metadata and remove the current assumption that an access token lives locally.

Add these columns:

```sql
ALTER TABLE bankAccounts ADD COLUMN provider TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE bankAccounts ADD COLUMN sourceType TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE bankAccounts ADD COLUMN externalItemId TEXT;
ALTER TABLE bankAccounts ADD COLUMN externalAccountId TEXT;
ALTER TABLE bankAccounts ADD COLUMN serverItemRef TEXT;
ALTER TABLE bankAccounts ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE bankAccounts ADD COLUMN consentExpiresAt TEXT;
ALTER TABLE bankAccounts ADD COLUMN lastSuccessfulSyncAt TEXT;
ALTER TABLE bankAccounts ADD COLUMN lastAttemptedSyncAt TEXT;
ALTER TABLE bankAccounts ADD COLUMN lastCursor TEXT;
ALTER TABLE bankAccounts ADD COLUMN lastErrorCode TEXT;
ALTER TABLE bankAccounts ADD COLUMN lastErrorMessage TEXT;
ALTER TABLE bankAccounts ADD COLUMN availableBalance TEXT;
ALTER TABLE bankAccounts ADD COLUMN currentBalance TEXT;
ALTER TABLE bankAccounts ADD COLUMN currencyCode TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE bankAccounts ADD COLUMN providerMetadata TEXT;
```

Indexes:

```sql
CREATE INDEX IF NOT EXISTS idx_bankAccounts_provider ON bankAccounts(provider);
CREATE INDEX IF NOT EXISTS idx_bankAccounts_externalItemId ON bankAccounts(externalItemId);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bankAccounts_externalAccountId ON bankAccounts(externalAccountId);
```

Deprecate:

- `accessToken`

For migration safety, keep the column for now but stop reading or writing it in app code.

### New `syncHistory` table

```sql
CREATE TABLE IF NOT EXISTS syncHistory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  bankAccountId INTEGER,
  provider TEXT NOT NULL,
  syncType TEXT NOT NULL,
  status TEXT NOT NULL,
  startedAt TEXT NOT NULL,
  completedAt TEXT,
  cursorBefore TEXT,
  cursorAfter TEXT,
  transactionsAdded INTEGER NOT NULL DEFAULT 0,
  transactionsModified INTEGER NOT NULL DEFAULT 0,
  transactionsRemoved INTEGER NOT NULL DEFAULT 0,
  errorCode TEXT,
  errorMessage TEXT,
  requestId TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### New `importBatches` table

```sql
CREATE TABLE IF NOT EXISTS importBatches (
  id TEXT PRIMARY KEY,
  userId INTEGER NOT NULL,
  source TEXT NOT NULL,
  provider TEXT,
  fileName TEXT,
  startedAt TEXT NOT NULL,
  completedAt TEXT,
  rowsRead INTEGER NOT NULL DEFAULT 0,
  rowsImported INTEGER NOT NULL DEFAULT 0,
  rowsSkipped INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  notes TEXT
);
```

## 3. Exact TypeScript schema changes

Update [`lib/schema/schema.ts`](/Users/rhoads/budget-app/lib/schema/schema.ts) to the following conceptual shape.

### Transaction additions

```ts
export type TransactionSource =
  | 'manual'
  | 'apple_card_financekit'
  | 'apple_card_import'
  | 'plaid_chase'
  | 'file_import';

export interface Transaction {
  id?: number;
  description: string;
  amount: string;
  type: 'income' | 'expense';
  categoryId?: number | null;
  userId: number;
  date: string;
  bankAccountId?: number | null;
  source?: TransactionSource;
  externalTransactionId?: string | null;
  pending?: boolean;
  merchantName?: string | null;
  rawDescription?: string | null;
  postedAt?: string | null;
  authorizedAt?: string | null;
  currencyCode?: string;
  importBatchId?: string | null;
  providerCategoryPrimary?: string | null;
  providerCategoryDetailed?: string | null;
  providerPendingTransactionId?: string | null;
  dedupeKey?: string | null;
  needsReview?: boolean;
  removedAt?: string | null;
  aiCategorized?: boolean;
  createdAt?: string;
}
```

### Bank account additions

```ts
export type LinkedAccountProvider =
  | 'manual'
  | 'apple_financekit'
  | 'plaid';

export type LinkedAccountSourceType =
  | 'manual'
  | 'wallet'
  | 'oauth'
  | 'csv'
  | 'ofx'
  | 'qfx'
  | 'qbo';

export interface BankAccount {
  id?: number;
  userId: number;
  provider: LinkedAccountProvider;
  sourceType: LinkedAccountSourceType;
  institutionId: string;
  institutionName: string;
  accountId: string;
  accountName: string;
  accountType: 'checking' | 'savings' | 'credit';
  accountSubtype?: string;
  mask?: string;
  externalItemId?: string | null;
  externalAccountId?: string | null;
  serverItemRef?: string | null;
  status?: 'active' | 'needs_reauth' | 'revoked' | 'disconnected' | 'error';
  isActive?: boolean;
  consentExpiresAt?: string | null;
  lastSyncAt?: string | null;
  lastSuccessfulSyncAt?: string | null;
  lastAttemptedSyncAt?: string | null;
  lastCursor?: string | null;
  lastErrorCode?: string | null;
  lastErrorMessage?: string | null;
  availableBalance?: string | null;
  currentBalance?: string | null;
  currencyCode?: string;
  providerMetadata?: string | null;
  accessToken?: string;
  createdAt?: string;
}
```

### New types

```ts
export interface SyncHistory {
  id?: number;
  userId: number;
  bankAccountId?: number | null;
  provider: 'apple_financekit' | 'plaid';
  syncType: 'initial' | 'incremental' | 'manual_refresh' | 'reconnect' | 'import';
  status: 'success' | 'error' | 'partial';
  startedAt: string;
  completedAt?: string | null;
  cursorBefore?: string | null;
  cursorAfter?: string | null;
  transactionsAdded?: number;
  transactionsModified?: number;
  transactionsRemoved?: number;
  errorCode?: string | null;
  errorMessage?: string | null;
  requestId?: string | null;
  createdAt?: string;
}

export interface ImportBatch {
  id: string;
  userId: number;
  source: TransactionSource;
  provider?: 'apple_financekit' | 'plaid' | null;
  fileName?: string | null;
  startedAt: string;
  completedAt?: string | null;
  rowsRead?: number;
  rowsImported?: number;
  rowsSkipped?: number;
  status: 'running' | 'success' | 'error' | 'partial';
  notes?: string | null;
}
```

## 4. Exact server-side schema for Chase

Expo API routes are the execution layer. For production Chase sync, add a durable server-side table set:

### `plaidItems`

```sql
CREATE TABLE plaidItems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  item_id TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  institution_id TEXT,
  institution_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  cursor TEXT,
  consent_expires_at TIMESTAMPTZ,
  last_webhook_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  last_error_code TEXT,
  last_error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `plaidItemAccounts`

```sql
CREATE TABLE plaidItemAccounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id TEXT NOT NULL REFERENCES plaidItems(item_id) ON DELETE CASCADE,
  plaid_account_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  official_name TEXT,
  mask TEXT,
  type TEXT NOT NULL,
  subtype TEXT,
  current_balance NUMERIC,
  available_balance NUMERIC,
  currency_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `plaidWebhookEvents`

```sql
CREATE TABLE plaidWebhookEvents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_type TEXT NOT NULL,
  webhook_code TEXT NOT NULL,
  item_id TEXT,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  processing_status TEXT NOT NULL DEFAULT 'pending'
);
```

## 5. Expo API route shape for Chase

Implemented scaffold:

- `POST /api/plaid/link-token`
- `POST /api/plaid/exchange`
- `POST /api/plaid/accounts`
- `POST /api/plaid/sync`
- `POST /api/plaid/webhook`
- `GET /api/plaid/health`

Behavior:

- `link-token`: production-safe now
- `exchange`: blocked until durable server storage is configured
- `accounts`: blocked until durable server storage is configured
- `sync`: blocked until durable server storage is configured
- `webhook`: blocked until durable server storage is configured

## 6. Required environment variables

Server-only:

```bash
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=sandbox
PLAID_REDIRECT_URI=
PLAID_ANDROID_PACKAGE_NAME=com.rhoadsjustin.budgetapp
PLAID_WEBHOOK_URL=
```

For automatic server deployment during native builds:

```bash
EXPO_UNSTABLE_DEPLOY_SERVER=1
```

## 7. Required app-level changes after scaffold

1. Add client-side Plaid Link integration in a route-based Linked Accounts modal.
2. Add durable storage for Plaid items and cursors.
3. Add DataContext methods:
   - `createLinkToken()`
   - `exchangePlaidPublicToken()`
   - `syncLinkedAccount()`
   - `importLinkedTransactions()`
4. Map normalized Plaid transactions into local SQLite through `DataContext`.
5. Add reconciliation and dedupe before exposing sync to users.
