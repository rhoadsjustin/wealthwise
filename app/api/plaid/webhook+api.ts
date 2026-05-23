import { errorResponse } from './_lib/errors';
import { recordWebhookEvent } from './_lib/storage';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    await recordWebhookEvent(payload);
    return Response.json({ accepted: true }, { status: 202 });
  } catch (error) {
    return errorResponse(error);
  }
}
