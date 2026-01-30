/**
 * Webhook event handlers for Unipile webhooks.
 *
 * Handles account lifecycle events:
 * - account.connected: User successfully connected their LinkedIn account
 * - account.disconnected: User's LinkedIn connection was revoked or expired
 *
 * Each handler is idempotent - duplicate events produce the same result.
 *
 * @module server-only - Database operations
 */

import 'server-only';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';

/**
 * Payload shape for account.connected webhook event.
 */
export interface AccountConnectedPayload {
  event: 'account.connected';
  account_id: string;
  name: string; // Our userId, passed during createHostedAuthLink
}

/**
 * Payload shape for account.disconnected webhook event.
 */
export interface AccountDisconnectedPayload {
  event: 'account.disconnected';
  account_id: string;
  name?: string; // May not always be present
}

/**
 * Union type for all supported webhook payloads.
 */
export type WebhookPayload =
  | AccountConnectedPayload
  | AccountDisconnectedPayload
  | { event: string; [key: string]: unknown };

/**
 * Handler result indicating success or failure.
 */
export interface HandlerResult {
  success: boolean;
  error?: string;
}

/**
 * Handles the account.connected event.
 *
 * Updates the user record with:
 * - unipileAccountId: The Unipile account ID for API calls
 * - linkedInConnectedAt: Timestamp of successful connection
 *
 * @param payload - The webhook payload with account_id and name (userId)
 * @returns Handler result
 */
export async function handleAccountConnected(
  payload: AccountConnectedPayload
): Promise<HandlerResult> {
  const userId = payload.name;
  const accountId = payload.account_id;

  if (!userId || !accountId) {
    return {
      success: false,
      error: 'Missing required fields: name (userId) or account_id',
    };
  }

  try {
    const result = await db
      .update(users)
      .set({
        unipileAccountId: accountId,
        linkedInConnectedAt: new Date(),
        lastSyncError: null, // Clear any previous errors
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning({ id: users.id });

    if (result.length === 0) {
      return {
        success: false,
        error: `User not found: ${userId}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Handles the account.disconnected event.
 *
 * Clears the user's Unipile connection:
 * - unipileAccountId: Set to null
 * - linkedInConnectedAt: Set to null
 * - lastSyncError: Set to indicate disconnection
 *
 * Uses account_id to find the user since name may not always be present.
 *
 * @param payload - The webhook payload with account_id
 * @returns Handler result
 */
export async function handleAccountDisconnected(
  payload: AccountDisconnectedPayload
): Promise<HandlerResult> {
  const accountId = payload.account_id;

  if (!accountId) {
    return {
      success: false,
      error: 'Missing required field: account_id',
    };
  }

  try {
    await db
      .update(users)
      .set({
        unipileAccountId: null,
        linkedInConnectedAt: null,
        lastSyncError: 'Account disconnected',
        updatedAt: new Date(),
      })
      .where(eq(users.unipileAccountId, accountId));

    // Note: result.length === 0 is not an error for disconnect
    // The account may have already been cleared or never existed

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Dispatches a webhook payload to the appropriate handler.
 *
 * Unknown event types are logged but return success to prevent
 * Unipile from retrying indefinitely.
 *
 * @param payload - The webhook payload
 * @returns Handler result
 */
export async function dispatchWebhookEvent(
  payload: WebhookPayload
): Promise<HandlerResult> {
  // Log full payload for debugging
  console.log(
    JSON.stringify({
      event: 'webhook_dispatch_debug',
      fullPayload: payload,
      timestamp: new Date().toISOString(),
    })
  );

  // Handle various Unipile event type formats
  const eventType = payload.event?.toLowerCase?.() || '';

  if (eventType === 'account.connected' || eventType === 'account_created' || eventType.includes('creation_success') || eventType.includes('account_creation')) {
    return handleAccountConnected(payload as AccountConnectedPayload);
  }

  if (eventType === 'account.disconnected' || eventType.includes('deletion') || eventType.includes('disconnected')) {
    return handleAccountDisconnected(payload as AccountDisconnectedPayload);
  }

  // Check if this is a notify_url callback (different format)
  if ('account_id' in payload && 'name' in payload && !payload.event) {
    console.log(
      JSON.stringify({
        event: 'webhook_notify_callback_detected',
        timestamp: new Date().toISOString(),
      })
    );
    return handleAccountConnected({
      event: 'account.connected',
      account_id: payload.account_id as string,
      name: payload.name as string,
    });
  }

  // Unknown event type - log and acknowledge
  // This prevents Unipile from retrying indefinitely
  console.log(
    JSON.stringify({
      event: 'webhook_unknown_event_type',
      eventType: payload.event,
      fullPayload: payload,
      timestamp: new Date().toISOString(),
    })
  );
  return { success: true };
}
