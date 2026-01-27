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
import * as crypto from 'crypto';

// Store original env
const originalEnv = { ...process.env };

// We need to mock the crypto module
vi.mock('crypto', async () => {
  const actual = await vi.importActual<typeof import('crypto')>('crypto');
  return {
    ...actual,
    timingSafeEqual: vi.fn((a: Buffer, b: Buffer) => {
      // Default implementation - compare buffers
      if (a.length !== b.length) return false;
      return a.equals(b);
    }),
  };
});

describe('lib/unipile/webhook-verify', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.UNIPILE_WEBHOOK_SECRET = 'test-webhook-secret';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
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

    it('uses timingSafeEqual for comparison', async () => {
      const mockTimingSafeEqual = vi.mocked(crypto.timingSafeEqual);

      const { verifyWebhookSignature } = await import('@/lib/unipile/webhook-verify');

      verifyWebhookSignature('test-webhook-secret');

      expect(mockTimingSafeEqual).toHaveBeenCalled();
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
