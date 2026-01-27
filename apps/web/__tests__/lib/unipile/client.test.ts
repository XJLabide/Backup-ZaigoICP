/**
 * Unit tests for lib/unipile/client.ts
 *
 * Tests Unipile client initialization and env validation:
 * - getUnipileConfig() validates environment variables
 * - getUnipileClient() returns UnipileClient instance
 * - Throws ZodError on missing/invalid env vars
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Store original env
const originalEnv = { ...process.env };

// Mock unipile-node-sdk with a proper class constructor
vi.mock('unipile-node-sdk', () => ({
  UnipileClient: class MockUnipileClient {
    dsn: string;
    token: string;
    account: { createHostedAuthLink: ReturnType<typeof vi.fn> };

    constructor(dsn: string, token: string) {
      this.dsn = dsn;
      this.token = token;
      this.account = {
        createHostedAuthLink: vi.fn(),
      };
    }
  },
}));

describe('lib/unipile/client', () => {
  beforeEach(() => {
    vi.resetModules();
    // Reset env to known state
    process.env.UNIPILE_DSN = 'https://api.unipile.com';
    process.env.UNIPILE_ACCESS_TOKEN = 'test-access-token';
  });

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
  });

  describe('getUnipileConfig', () => {
    it('returns valid config when env vars are set', async () => {
      const { getUnipileConfig } = await import('@/lib/unipile/client');

      const config = getUnipileConfig();

      expect(config).toEqual({ dsn: 'https://api.unipile.com' });
    });

    it('throws on missing UNIPILE_DSN', async () => {
      delete process.env.UNIPILE_DSN;

      const { getUnipileConfig } = await import('@/lib/unipile/client');

      expect(() => getUnipileConfig()).toThrow();
    });

    it('throws on missing UNIPILE_ACCESS_TOKEN', async () => {
      delete process.env.UNIPILE_ACCESS_TOKEN;

      const { getUnipileConfig } = await import('@/lib/unipile/client');

      expect(() => getUnipileConfig()).toThrow();
    });

    it('throws on invalid UNIPILE_DSN (not a URL)', async () => {
      process.env.UNIPILE_DSN = 'not-a-url';

      const { getUnipileConfig } = await import('@/lib/unipile/client');

      expect(() => getUnipileConfig()).toThrow();
    });

    it('throws on empty UNIPILE_ACCESS_TOKEN', async () => {
      process.env.UNIPILE_ACCESS_TOKEN = '';

      const { getUnipileConfig } = await import('@/lib/unipile/client');

      expect(() => getUnipileConfig()).toThrow();
    });
  });

  describe('getUnipileClient', () => {
    it('returns UnipileClient instance', async () => {
      const { getUnipileClient } = await import('@/lib/unipile/client');

      const client = getUnipileClient();

      expect(client).toBeDefined();
      expect(client.dsn).toBe('https://api.unipile.com');
      expect(client.token).toBe('test-access-token');
    });

    it('reuses cached client on subsequent calls', async () => {
      const { getUnipileClient } = await import('@/lib/unipile/client');

      const client1 = getUnipileClient();
      const client2 = getUnipileClient();

      expect(client1).toBe(client2);
    });

    it('throws on missing env vars', async () => {
      delete process.env.UNIPILE_DSN;
      delete process.env.UNIPILE_ACCESS_TOKEN;

      const { getUnipileClient } = await import('@/lib/unipile/client');

      expect(() => getUnipileClient()).toThrow();
    });
  });
});
