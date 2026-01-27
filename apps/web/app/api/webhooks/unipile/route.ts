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
 * - INSERT acts as the gate: only process if insert succeeds
 * - Uses status field to track processing state
 * - Duplicate events return 200 without re-processing
 *
 * Response codes:
 * - 200: Event processed (or duplicate, or unknown type, or non-retriable error)
 * - 401: Invalid or missing signature
 * - 500: Database error (triggers Unipile retry)
 */

import { createHash } from 'crypto';
import { db, processedWebhooks } from '@/lib/db';
import { eq, and, isNull, lt } from 'drizzle-orm';
import { verifyWebhookSignature } from '@/lib/unipile/webhook-verify';
import {
  dispatchWebhookEvent,
  type WebhookPayload,
} from '@/lib/unipile/webhook-handlers';

// Force Node.js runtime for crypto and server-only modules
export const runtime = 'nodejs';

// Stale lock timeout: if an in-progress record is older than this, consider it abandoned
const STALE_LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Computes a deterministic event ID from the raw request body bytes.
 *
 * Uses SHA256 hash to ensure:
 * - Byte-for-byte identical payloads produce identical IDs
 * - Collision-resistant uniqueness
 *
 * Note: Different JSON serialization, key ordering, or whitespace will
 * produce different hashes. This is intentional - we deduplicate exact
 * retries of identical request bodies.
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
 * Determines if an error is non-retriable (should not trigger Unipile retry).
 *
 * Non-retriable errors include:
 * - User not found (webhook arrived for deleted/nonexistent user)
 * - Missing required fields (malformed payload)
 */
function isNonRetriableError(error: string | undefined): boolean {
  if (!error) return false;
  return (
    error.includes('User not found') ||
    error.includes('Missing required field') // Matches both singular and plural
  );
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

  // 7. Try to acquire processing lock via INSERT
  // This is the idempotency gate - only the first request wins
  // Insert with processedAt = null to indicate "in progress"
  let insertSucceeded = false;
  try {
    const insertResult = await db
      .insert(processedWebhooks)
      .values({
        eventId,
        eventType,
        processedAt: null, // Will be set after successful processing
        payload: rawBody,
      })
      .onConflictDoNothing()
      .returning({ eventId: processedWebhooks.eventId });

    insertSucceeded = insertResult.length > 0;
  } catch (error) {
    // Database error on insert - return 500 to trigger retry
    const errorMessage = error instanceof Error ? error.message : String(error);
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

  // If insert didn't succeed, check if it's a duplicate or a stale lock
  if (!insertSucceeded) {
    const existing = await db
      .select({
        processedAt: processedWebhooks.processedAt,
        createdAt: processedWebhooks.createdAt,
      })
      .from(processedWebhooks)
      .where(eq(processedWebhooks.eventId, eventId))
      .limit(1);

    if (existing.length === 0) {
      // Race condition: record was deleted between our insert and this check
      // Return 500 to trigger retry
      console.log(
        JSON.stringify({
          event: 'webhook_race_condition',
          eventType,
          eventId,
          timestamp: new Date().toISOString(),
        })
      );
      return Response.json({ error: 'Internal error' }, { status: 500 });
    }

    const record = existing[0];
    const isProcessed = record.processedAt !== null;

    // Check if this is a stale in-progress lock (abandoned by crashed worker)
    if (!isProcessed && record.createdAt) {
      const lockAge = Date.now() - new Date(record.createdAt).getTime();
      if (lockAge > STALE_LOCK_TIMEOUT_MS) {
        // Stale lock detected - delete it and retry processing
        console.log(
          JSON.stringify({
            event: 'webhook_stale_lock_recovered',
            eventType,
            eventId,
            lockAgeMs: lockAge,
            timestamp: new Date().toISOString(),
          })
        );

        try {
          // Delete the stale lock
          await db
            .delete(processedWebhooks)
            .where(
              and(
                eq(processedWebhooks.eventId, eventId),
                isNull(processedWebhooks.processedAt),
                lt(processedWebhooks.createdAt, new Date(Date.now() - STALE_LOCK_TIMEOUT_MS))
              )
            );

          // Return 500 to trigger Unipile retry which will now succeed
          return Response.json({ error: 'Internal error' }, { status: 500 });
        } catch {
          // Delete failed - treat as duplicate
        }
      }
    }

    // If already fully processed, it's a true duplicate - return 200
    if (isProcessed) {
      console.log(
        JSON.stringify({
          event: 'webhook_duplicate',
          eventType,
          eventId,
          accountId,
          userId,
          wasProcessed: true,
          timestamp: new Date().toISOString(),
        })
      );
      return Response.json({ received: true, duplicate: true });
    }

    // If in-progress but not stale, another worker is processing
    // Return 500 to allow retry after the other worker finishes
    console.log(
      JSON.stringify({
        event: 'webhook_in_progress',
        eventType,
        eventId,
        accountId,
        userId,
        timestamp: new Date().toISOString(),
      })
    );
    return Response.json({ error: 'Event in progress' }, { status: 500 });
  }

  // 8. Dispatch to appropriate handler
  const result = await dispatchWebhookEvent(payload);

  if (!result.success) {
    const nonRetriable = isNonRetriableError(result.error);

    console.error(
      JSON.stringify({
        event: 'webhook_handler_error',
        eventType,
        eventId,
        accountId,
        userId,
        error: result.error,
        retriable: !nonRetriable,
        timestamp: new Date().toISOString(),
      })
    );

    if (nonRetriable) {
      // For non-retriable errors, mark as processed to prevent retry storms
      try {
        await db
          .update(processedWebhooks)
          .set({ processedAt: new Date() })
          .where(eq(processedWebhooks.eventId, eventId));
      } catch {
        // Ignore update errors for non-retriable cases
      }
      return Response.json({ received: true, error: 'Event processing failed' });
    }

    // For retriable errors, delete the record so retries can re-insert
    try {
      await db
        .delete(processedWebhooks)
        .where(eq(processedWebhooks.eventId, eventId));
    } catch {
      // Ignore delete errors - worst case is it gets treated as duplicate
    }

    // Return 500 to trigger Unipile retry
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }

  // 9. Mark as processed after successful handling
  try {
    await db
      .update(processedWebhooks)
      .set({ processedAt: new Date() })
      .where(eq(processedWebhooks.eventId, eventId));
  } catch (error) {
    // DB failure after successful processing - return 500 so retry can complete dedup
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      JSON.stringify({
        event: 'webhook_idempotency_update_error',
        eventType,
        eventId,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      })
    );
    return Response.json({ error: 'Database error' }, { status: 500 });
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
