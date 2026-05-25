import { z } from 'zod';

import { getPlaidBaseUrl, getPlaidEnv } from './env';
import { ApiError } from './errors';

const plaidErrorSchema = z.object({
  error_type: z.string().optional(),
  error_code: z.string().optional(),
  error_message: z.string().optional(),
  request_id: z.string().optional(),
  display_message: z.string().nullable().optional(),
});

type PlaidRequestBody = Record<string, unknown>;

export async function plaidRequest<TResponse>(
  path: string,
  body: PlaidRequestBody
): Promise<TResponse> {
  const env = getPlaidEnv();
  const response = await fetch(`${getPlaidBaseUrl(env.env)}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Plaid-Version': '2020-09-14',
    },
    body: JSON.stringify({
      client_id: env.clientId,
      secret: env.secret,
      ...body,
    }),
  });

  const json = await response.json();

  if (!response.ok) {
    const parsed = plaidErrorSchema.safeParse(json);
    throw new ApiError(
      response.status,
      parsed.success ? (parsed.data.error_code ?? 'plaid_error') : 'plaid_error',
      parsed.success
        ? (parsed.data.error_message ?? 'Plaid request failed')
        : 'Plaid request failed',
      parsed.success ? parsed.data : json
    );
  }

  return json as TResponse;
}
