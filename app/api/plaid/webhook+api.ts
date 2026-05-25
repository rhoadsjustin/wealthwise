import { errorResponse } from '@/lib/plaid-api/errors';
import { recordWebhookEvent } from '@/lib/plaid-api/storage';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    await recordWebhookEvent(payload);
    return Response.json({ accepted: true }, { status: 202 });
  } catch (error) {
    return errorResponse(error);
  }
}
