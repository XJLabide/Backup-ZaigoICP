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
 * - Uses onConflictDoNothing for idempotent insert
 * - Duplicate events return 200 without re-processing
 *
 * Response codes:
 * - 200: Event processed (or duplicate, or unknown type, or non-retriable error)
 * - 401: Invalid or missing signature
 * - 500: Database error (triggers Unipile retry)
 */

import { createHash } from 'crypto';
import { db, processedWebhooks } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { verifyWebhookSignature } from '@/lib/unipile/webhook-verify';
import {
  dispatchWebhookEvent,
  type WebhookPayload,
} from '@/lib/unipile/webhook-handlers';

// Force Node.js runtime for crypto and server-only modules
export const runtime = 'nodejs';

/**
 * Computes a deterministic event ID from the raw request body bytes.
 *
 * Uses SHA256 hash to ensure:
 * - Identical payloads produce identical IDs
 * - No dependency on JSON key ordering
 * - Collision-resistant uniqueness
 *
 * @param rawBodyBuffer - The raw request body as ArrayBuffer
 * @returns SHA256 hash as hex string
 */
function computeEventId(rawBodyBuffer: ArrayBuffer): string {
  return createHash('sha256').update(Buffer.from(rawBodyBuffer)).digest('hex');
}

/**
 * Validates that a parsed JSON value is an object (not null, array, or primitive).
 */
function isValidPayloadObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

  // 2. Read raw body as bytes for idempotency hash
  const rawBodyBuffer = await request.arrayBuffer();
  const rawBody = new TextDecoder().decode(rawBodyBuffer);

  // 3. Compute event ID from raw body bytes
  const eventId = computeEventId(rawBodyBuffer);

  // 4. Parse JSON payload
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
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

  // 5. Validate payload is an object
  if (!isValidPayloadObject(parsed)) {
    console.log(
      JSON.stringify({
        event: 'webhook_invalid_payload_type',
        eventId,
        payloadType: parsed === null ? 'null' : Array.isArray(parsed) ? 'array' : typeof parsed,
        timestamp: new Date().toISOString(),
      })
    );
    // Return 200 to prevent infinite retries for invalid payload types
    return Response.json({ received: true, error: 'Invalid payload type' });
  }

  const payload = parsed as WebhookPayload;

  // Extract fields for logging
  const eventType = typeof payload.event === 'string' ? payload.event : 'unknown';
  const accountId =
    'account_id' in payload && typeof payload.account_id === 'string'
      ? payload.account_id
      : undefined;
  const userId =
    'name' in payload && typeof payload.name === 'string' ? payload.name : undefined;

  // 6. Structured log for all received events
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

  // 7. Check if already processed using onConflictDoNothing
  // This is a preliminary check - we only fully mark as processed after handler success
  const existingEvent = await db
    .select({ eventId: processedWebhooks.eventId })
    .from(processedWebhooks)
    .where(eq(processedWebhooks.eventId, eventId))
    .limit(1);

  if (existingEvent.length > 0) {
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

  // 8. Dispatch to appropriate handler
  const result = await dispatchWebhookEvent(payload);

  if (!result.success) {
    // Determine if error is retriable
    // "User not found" and "Missing required fields" are non-retriable
    const isNonRetriable =
      result.error?.includes('User not found') ||
      result.error?.includes('Missing required field');

    console.error(
      JSON.stringify({
        event: 'webhook_handler_error',
        eventType,
        eventId,
        accountId,
        userId,
        error: result.error,
        retriable: !isNonRetriable,
        timestamp: new Date().toISOString(),
      })
    );

    if (isNonRetriable) {
      // For non-retriable errors, mark as processed to prevent retry storms
      // and return 200 (logged above for debugging)
      try {
        await db.insert(processedWebhooks).values({
          eventId,
          eventType,
          processedAt: new Date(),
          payload: rawBody,
        }).onConflictDoNothing();
      } catch {
        // Ignore insert errors for non-retriable cases
      }
      return Response.json({ received: true, error: result.error });
    }

    // Return 500 to trigger Unipile retry on retriable failures (DB errors)
    return Response.json({ error: result.error }, { status: 500 });
  }

  // 9. Mark as processed after successful handling
  try {
    await db.insert(processedWebhooks).values({
      eventId,
      eventType,
      processedAt: new Date(),
      payload: rawBody,
    }).onConflictDoNothing();
  } catch (error) {
    // Log but don't fail - event was processed successfully
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      JSON.stringify({
        event: 'webhook_idempotency_insert_error',
        eventType,
        eventId,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      })
    );
  }

  // 10. Log successful processing
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
