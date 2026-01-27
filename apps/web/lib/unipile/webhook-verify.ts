/**
 * Webhook signature verification for Unipile webhooks.
 *
 * Unipile uses custom header authentication (not HMAC-SHA256).
 * The `X-Unipile-Signature` header is set to a secret value when
 * creating the webhook in the Unipile dashboard. We verify this
 * header matches our `UNIPILE_WEBHOOK_SECRET` environment variable.
 *
 * Uses timing-safe comparison to prevent timing attacks.
 */

import { timingSafeEqual } from 'crypto';

/**
 * Result from webhook signature verification.
 */
export interface WebhookVerifyResult {
  valid: boolean;
  error?: string;
}

/**
 * Verifies the webhook signature header against the configured secret.
 *
 * @param signature - The value from the X-Unipile-Signature header (null if absent)
 * @returns Object indicating if signature is valid, with error message if not
 *
 * @example
 * ```typescript
 * const result = verifyWebhookSignature(request.headers.get('X-Unipile-Signature'));
 * if (!result.valid) {
 *   return new Response(result.error, { status: 401 });
 * }
 * ```
 */
export function verifyWebhookSignature(signature: string | null): WebhookVerifyResult {
  // Check if signature header is present
  if (signature === null || signature === undefined) {
    return { valid: false, error: 'Missing signature' };
  }

  // Get the expected secret from environment
  const secret = process.env.UNIPILE_WEBHOOK_SECRET;
  if (!secret) {
    // Log this as an error condition - misconfiguration
    console.error('UNIPILE_WEBHOOK_SECRET environment variable is not set');
    return { valid: false, error: 'Invalid signature' };
  }

  // Convert to buffers for timing-safe comparison
  const signatureBuffer = Buffer.from(signature, 'utf-8');
  const secretBuffer = Buffer.from(secret, 'utf-8');

  // timingSafeEqual requires buffers of equal length
  // If lengths differ, signature is invalid, but we still need to
  // perform a timing-safe comparison to avoid leaking length info
  if (signatureBuffer.length !== secretBuffer.length) {
    // Compare against the secret itself to maintain constant time
    // This prevents timing attacks that could reveal the secret length
    timingSafeEqual(secretBuffer, secretBuffer);
    return { valid: false, error: 'Invalid signature' };
  }

  // Perform timing-safe comparison
  const isValid = timingSafeEqual(signatureBuffer, secretBuffer);

  if (!isValid) {
    return { valid: false, error: 'Invalid signature' };
  }

  return { valid: true };
}
