import { z } from 'zod';

import { ApiError, errorResponse } from '@/lib/plaid-api/errors';
import { plaidRequest } from '@/lib/plaid-api/plaid';
import { getPlaidItem } from '@/lib/plaid-api/storage';

const accountsRequestSchema = z.object({
  itemId: z.string().min(1),
});

interface PlaidAccountsResponse {
  accounts: {
    account_id: string;
    name: string;
    official_name?: string | null;
    type: string;
    subtype?: string | null;
    mask?: string | null;
    balances?: {
      available?: number | null;
      current?: number | null;
      iso_currency_code?: string | null;
    };
  }[];
  item: {
    institution_id?: string | null;
  };
  request_id: string;
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const input = accountsRequestSchema.safeParse(json);

    if (!input.success) {
      throw new ApiError(400, 'invalid_request', 'Invalid accounts payload', input.error.flatten());
    }

    const item = await getPlaidItem(input.data.itemId);
    if (!item) {
      throw new ApiError(404, 'item_not_found', 'Plaid item not found');
    }

    const response = await plaidRequest<PlaidAccountsResponse>('/accounts/get', {
      access_token: item.accessToken,
    });

    return Response.json({
      itemId: input.data.itemId,
      institutionId: response.item.institution_id ?? item.institutionId ?? null,
      accounts: response.accounts.map((account) => ({
        externalAccountId: account.account_id,
        name: account.name,
        officialName: account.official_name ?? null,
        mask: account.mask ?? null,
        type: account.type,
        subtype: account.subtype ?? null,
        availableBalance: account.balances?.available ?? null,
        currentBalance: account.balances?.current ?? null,
        currencyCode: account.balances?.iso_currency_code ?? 'USD',
      })),
      requestId: response.request_id,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
