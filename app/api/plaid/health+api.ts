import { getPlaidEnv } from '@/lib/plaid-api/env';
import { errorResponse } from '@/lib/plaid-api/errors';

export function GET() {
  try {
    const env = getPlaidEnv();
    return Response.json({
      ok: true,
      plaidEnv: env.env,
      hasRedirectUri: Boolean(env.redirectUri),
      hasAndroidPackageName: Boolean(env.androidPackageName),
      hasWebhookUrl: Boolean(env.webhookUrl),
      storageConfigured: false,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
