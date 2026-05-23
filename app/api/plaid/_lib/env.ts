import { ApiError } from './errors';

export interface PlaidEnv {
  clientId: string;
  secret: string;
  env: 'sandbox' | 'development' | 'production';
  redirectUri?: string;
  androidPackageName?: string;
  webhookUrl?: string;
}

const PLAID_BASE_URLS: Record<PlaidEnv['env'], string> = {
  sandbox: 'https://sandbox.plaid.com',
  development: 'https://development.plaid.com',
  production: 'https://production.plaid.com',
};

export function getPlaidEnv(): PlaidEnv {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  const rawEnv = process.env.PLAID_ENV ?? 'sandbox';

  if (!clientId) {
    throw new ApiError(500, 'missing_env', 'Missing PLAID_CLIENT_ID');
  }

  if (!secret) {
    throw new ApiError(500, 'missing_env', 'Missing PLAID_SECRET');
  }

  if (!['sandbox', 'development', 'production'].includes(rawEnv)) {
    throw new ApiError(500, 'invalid_env', 'PLAID_ENV must be sandbox, development, or production');
  }

  return {
    clientId,
    secret,
    env: rawEnv as PlaidEnv['env'],
    redirectUri: process.env.PLAID_REDIRECT_URI,
    androidPackageName: process.env.PLAID_ANDROID_PACKAGE_NAME,
    webhookUrl: process.env.PLAID_WEBHOOK_URL,
  };
}

export function getPlaidBaseUrl(env: PlaidEnv['env']) {
  return PLAID_BASE_URLS[env];
}
