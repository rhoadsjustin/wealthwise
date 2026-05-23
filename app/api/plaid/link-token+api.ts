import { z } from 'zod';

import { getPlaidEnv } from './_lib/env';
import { ApiError, errorResponse } from './_lib/errors';
import { plaidRequest } from './_lib/plaid';

const linkTokenRequestSchema = z.object({
  userId: z.union([z.string(), z.number()]).optional(),
  clientName: z.string().min(1).optional(),
});

interface PlaidLinkTokenResponse {
  link_token: string;
  expiration: string;
  request_id: string;
}

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => ({}));
    const input = linkTokenRequestSchema.safeParse(json);

    if (!input.success) {
      throw new ApiError(400, 'invalid_request', 'Invalid link token payload', input.error.flatten());
    }

    const env = getPlaidEnv();
    const clientUserId = String(input.data.userId ?? '1');

    const response = await plaidRequest<PlaidLinkTokenResponse>('/link/token/create', {
      client_name: input.data.clientName ?? 'WealthWise',
      user: {
        client_user_id: clientUserId,
      },
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en',
      redirect_uri: env.redirectUri,
      android_package_name: env.androidPackageName,
      webhook: env.webhookUrl,
    });

    return Response.json({
      linkToken: response.link_token,
      expiration: response.expiration,
      requestId: response.request_id,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
