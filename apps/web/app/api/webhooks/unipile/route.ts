/**
 * Webhook endpoint for Unipile account lifecycle events.
 *
 * POST /api/webhooks/unipile
 *
 * Handles:
 * - account.connected: User linked their LinkedIn account
 * - account.disconnected: Connection was revoked or expired
 *
 * Security:
 * - Validates X-Unipile-Signature header using timing-safe comparison
 * - Returns 401 for invalid/missing signature
 *
 * Idempotency:
 * - Computes SHA256 hash of raw request body as event ID
 * - Stores in processedWebhooks table with unique constraint
 * - Duplicate events return 200 without re-processing
 *
 * Response codes:
 * - 200: Event processed (or duplicate, or unknown type)
 * - 401: Invalid or missing signature
 * - 500: Database error (triggers Unipile retry)
 */

import { createHash } from 'crypto';
import { db, processedWebhooks } from '@/lib/db';
import { verifyWebhookSignature } from '@/lib/unipile/webhook-verify';
import {
  dispatchWebhookEvent,
  type WebhookPayload,
} from '@/lib/unipile/webhook-handlers';

/**
 * Computes a deterministic event ID from the raw request body.
 *
 * Uses SHA256 hash to ensure:
 * - Identical payloads produce identical IDs
 * - No dependency on JSON key ordering
 * - Collision-resistant uniqueness
 *
 * @param rawBody - The raw request body string
 * @returns SHA256 hash as hex string
 */
function computeEventId(rawBody: string): string {
  return createHash('sha256').update(rawBody, 'utf-8').digest('hex');
}

/**
 * Handles incoming Unipile webhook events.
 */
export async function POST(request: Request) {
  // 1. Extract and verify signature
  const signature = request.headers.get('X-Unipile-Signature');
  const verifyResult = verifyWebhookSignature(signature);

  if (!verifyResult.valid) {
    console.log(
      JSON.stringify({
        event: 'webhook_signature_invalid',
        error: verifyResult.error,
        timestamp: new Date().toISOString(),
      })
    );
    return Response.json({ error: verifyResult.error }, { status: 401 });
  }

  // 2. Read raw body for idempotency hash
  const rawBody = await request.text();

  // 3. Compute event ID from raw body
  const eventId = computeEventId(rawBody);

  // 4. Parse JSON payload
  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    console.log(
      JSON.stringify({
        event: 'webhook_parse_error',
        eventId,
        timestamp: new Date().toISOString(),
      })
    );
    // Return 200 to prevent infinite retries for malformed payloads
    return Response.json({ received: true, error: 'Invalid JSON' });
  }

  // Extract fields for logging
  const eventType = payload.event ?? 'unknown';
  const accountId =
    'account_id' in payload ? (payload.account_id as string) : undefined;
  const userId = 'name' in payload ? (payload.name as string) : undefined;

  // 5. Structured log for all received events
  console.log(
    JSON.stringify({
      event: 'webhook_received',
      eventType,
      eventId,
      accountId,
      userId,
      timestamp: new Date().toISOString(),
    })
  );

  // 6. Check idempotency - try to insert into processedWebhooks
  try {
    await db.insert(processedWebhooks).values({
      eventId,
      eventType,
      processedAt: new Date(),
      payload: rawBody,
    });
  } catch (error) {
    // Check if this is a unique constraint violation (duplicate)
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (
      errorMessage.includes('unique constraint') ||
      errorMessage.includes('duplicate key') ||
      errorMessage.includes('UNIQUE constraint failed') ||
      errorMessage.includes('23505') // PostgreSQL unique violation code
    ) {
      // Duplicate webhook - already processed
      console.log(
        JSON.stringify({
          event: 'webhook_duplicate',
          eventType,
          eventId,
          accountId,
          userId,
          timestamp: new Date().toISOString(),
        })
      );
      return Response.json({ received: true, duplicate: true });
    }

    // Actual database error - return 500 to trigger retry
    console.error(
      JSON.stringify({
        event: 'webhook_db_error',
        eventType,
        eventId,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      })
    );
    return Response.json({ error: 'Database error' }, { status: 500 });
  }

  // 7. Dispatch to appropriate handler
  const result = await dispatchWebhookEvent(payload);

  if (!result.success) {
    console.error(
      JSON.stringify({
        event: 'webhook_handler_error',
        eventType,
        eventId,
        accountId,
        userId,
        error: result.error,
        timestamp: new Date().toISOString(),
      })
    );
    // Return 500 to trigger Unipile retry on handler failure
    return Response.json({ error: result.error }, { status: 500 });
  }

  // 8. Log successful processing
  console.log(
    JSON.stringify({
      event: 'webhook_processed',
      eventType,
      eventId,
      accountId,
      userId,
      timestamp: new Date().toISOString(),
    })
  );

  return Response.json({ received: true });
}
