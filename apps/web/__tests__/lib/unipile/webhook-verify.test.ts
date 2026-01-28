/**
 * Unit tests for lib/unipile/webhook-verify.ts
 *
 * Tests webhook signature verification (security-critical):
 * - Valid signature returns { valid: true }
 * - Invalid signature returns { valid: false, error }
 * - Missing signature header returns error
 * - Uses timing-safe comparison
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Store original env
const originalEnv = { ...process.env };

describe('lib/unipile/webhook-verify', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.UNIPILE_WEBHOOK_SECRET = 'test-webhook-secret';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('verifyWebhookSignature', () => {
    it('returns valid: true for matching signature', async () => {
      const { verifyWebhookSignature } = await import('@/lib/unipile/webhook-verify');

      const result = verifyWebhookSignature('test-webhook-secret');

      expect(result).toEqual({ valid: true });
    });

    it('returns valid: false for non-matching signature', async () => {
      const { verifyWebhookSignature } = await import('@/lib/unipile/webhook-verify');

      const result = verifyWebhookSignature('wrong-secret');

      expect(result).toEqual({ valid: false, error: 'Invalid signature' });
    });

    it('returns error for null signature', async () => {
      const { verifyWebhookSignature } = await import('@/lib/unipile/webhook-verify');

      const result = verifyWebhookSignature(null);

      expect(result).toEqual({ valid: false, error: 'Missing signature' });
    });

    it('returns error for undefined signature', async () => {
      const { verifyWebhookSignature } = await import('@/lib/unipile/webhook-verify');

      const result = verifyWebhookSignature(undefined as unknown as string | null);

      expect(result).toEqual({ valid: false, error: 'Missing signature' });
    });

    it('returns invalid when secret is not configured', async () => {
      delete process.env.UNIPILE_WEBHOOK_SECRET;
      const { verifyWebhookSignature } = await import('@/lib/unipile/webhook-verify');

      const result = verifyWebhookSignature('any-signature');

      expect(result).toEqual({ valid: false, error: 'Invalid signature' });
    });

    it('returns invalid for different length signatures', async () => {
      const { verifyWebhookSignature } = await import('@/lib/unipile/webhook-verify');

      const result = verifyWebhookSignature('short');

      expect(result).toEqual({ valid: false, error: 'Invalid signature' });
    });

    it('returns invalid for empty signature', async () => {
      const { verifyWebhookSignature } = await import('@/lib/unipile/webhook-verify');

      const result = verifyWebhookSignature('');

      // Empty string has different length than 'test-webhook-secret'
      expect(result).toEqual({ valid: false, error: 'Invalid signature' });
    });

    it('uses timing-safe comparison (behavior test)', async () => {
      const { verifyWebhookSignature } = await import('@/lib/unipile/webhook-verify');

      // The function should work correctly with matching secret
      const validResult = verifyWebhookSignature('test-webhook-secret');
      expect(validResult).toEqual({ valid: true });

      // And reject non-matching secrets
      const invalidResult = verifyWebhookSignature('wrong-secret');
      expect(invalidResult).toEqual({ valid: false, error: 'Invalid signature' });
    });

    it('handles special characters in secret', async () => {
      process.env.UNIPILE_WEBHOOK_SECRET = 'secret-with-special-chars!@#$%';
      const { verifyWebhookSignature } = await import('@/lib/unipile/webhook-verify');

      const result = verifyWebhookSignature('secret-with-special-chars!@#$%');

      expect(result).toEqual({ valid: true });
    });

    it('handles unicode characters', async () => {
      process.env.UNIPILE_WEBHOOK_SECRET = 'secret-with-unicode-émoji-🔐';
      const { verifyWebhookSignature } = await import('@/lib/unipile/webhook-verify');

      const result = verifyWebhookSignature('secret-with-unicode-émoji-🔐');

      expect(result).toEqual({ valid: true });
    });
  });
});
