import { ApiError } from './errors';

export interface StoredPlaidItem {
  itemId: string;
  accessToken: string;
  institutionId?: string | null;
  institutionName?: string | null;
  userId: string;
  linkedAccountIds?: string[];
  cursor?: string | null;
}

function notConfigured(): never {
  throw new ApiError(
    501,
    'plaid_storage_not_configured',
    'Plaid server storage is not configured. Expo API routes secure secrets, but automatic Chase sync still needs durable server-side storage for access tokens and cursors.'
  );
}

export async function savePlaidItem(_item: StoredPlaidItem): Promise<void> {
  notConfigured();
}

export async function getPlaidItem(_itemId: string): Promise<StoredPlaidItem | null> {
  notConfigured();
}

export async function updatePlaidCursor(_itemId: string, _cursor: string | null): Promise<void> {
  notConfigured();
}

export async function recordWebhookEvent(_payload: unknown): Promise<void> {
  notConfigured();
}
