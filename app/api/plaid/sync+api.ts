import { z } from 'zod';

import { ApiError, errorResponse } from '@/lib/plaid-api/errors';
import { plaidRequest } from '@/lib/plaid-api/plaid';
import { getPlaidItem, updatePlaidCursor } from '@/lib/plaid-api/storage';

const syncRequestSchema = z.object({
  itemId: z.string().min(1),
  cursor: z.string().nullable().optional(),
});

interface PlaidTransactionsSyncResponse {
  added: Record<string, unknown>[];
  modified: Record<string, unknown>[];
  removed: Record<string, unknown>[];
  next_cursor: string;
  has_more: boolean;
  request_id: string;
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const input = syncRequestSchema.safeParse(json);

    if (!input.success) {
      throw new ApiError(400, 'invalid_request', 'Invalid sync payload', input.error.flatten());
    }

    const item = await getPlaidItem(input.data.itemId);
    if (!item) {
      throw new ApiError(404, 'item_not_found', 'Plaid item not found');
    }

    const pages: PlaidTransactionsSyncResponse[] = [];
    let cursor = input.data.cursor ?? item.cursor ?? null;
    let hasMore = true;

    while (hasMore) {
      const response = await plaidRequest<PlaidTransactionsSyncResponse>('/transactions/sync', {
        access_token: item.accessToken,
        cursor,
      });
      pages.push(response);
      cursor = response.next_cursor;
      hasMore = response.has_more;
    }

    await updatePlaidCursor(input.data.itemId, cursor);

    return Response.json({
      itemId: input.data.itemId,
      cursor,
      added: pages.flatMap((page) => page.added),
      modified: pages.flatMap((page) => page.modified),
      removed: pages.flatMap((page) => page.removed),
      pageCount: pages.length,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
