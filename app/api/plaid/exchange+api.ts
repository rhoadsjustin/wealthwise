import { z } from 'zod';

import { ApiError, errorResponse } from './_lib/errors';
import { plaidRequest } from './_lib/plaid';
import { savePlaidItem } from './_lib/storage';

const exchangeRequestSchema = z.object({
  publicToken: z.string().min(1),
  userId: z.union([z.string(), z.number()]).default('1'),
  institutionId: z.string().optional().nullable(),
  institutionName: z.string().optional().nullable(),
});

interface PlaidExchangeResponse {
  access_token: string;
  item_id: string;
  request_id: string;
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const input = exchangeRequestSchema.safeParse(json);

    if (!input.success) {
      throw new ApiError(400, 'invalid_request', 'Invalid public token exchange payload', input.error.flatten());
    }

    const response = await plaidRequest<PlaidExchangeResponse>('/item/public_token/exchange', {
      public_token: input.data.publicToken,
    });

    await savePlaidItem({
      itemId: response.item_id,
      accessToken: response.access_token,
      institutionId: input.data.institutionId ?? null,
      institutionName: input.data.institutionName ?? null,
      userId: String(input.data.userId),
    });

    return Response.json({
      itemId: response.item_id,
      requestId: response.request_id,
      persisted: true,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
