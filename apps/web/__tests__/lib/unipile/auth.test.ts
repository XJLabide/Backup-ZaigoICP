/**
 * Unit tests for lib/unipile/auth.ts
 *
 * Tests auth link generation:
 * - generateAuthLink() returns URL and expiry
 * - Handles Unipile API errors
 * - Constructs correct request parameters
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Store original env
const originalEnv = { ...process.env };

// Mock the client module
vi.mock('@/lib/unipile/client', () => ({
  getUnipileClient: vi.fn(),
  getUnipileConfig: vi.fn(),
}));

import { getUnipileClient, getUnipileConfig } from '@/lib/unipile/client';
import { generateAuthLink } from '@/lib/unipile/auth';

const mockGetUnipileClient = vi.mocked(getUnipileClient);
const mockGetUnipileConfig = vi.mocked(getUnipileConfig);

describe('lib/unipile/auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('generateAuthLink', () => {
    it('returns URL and expiry when successful', async () => {
      // Setup
      const mockClient = {
        account: {
          createHostedAuthLink: vi.fn().mockResolvedValue({
            url: 'https://auth.unipile.com/link/abc123',
          }),
        },
      };
      mockGetUnipileClient.mockReturnValue(mockClient as never);
      mockGetUnipileConfig.mockReturnValue({ dsn: 'https://api.unipile.com' });

      // Execute
      const result = await generateAuthLink('user_123');

      // Assert
      expect(result.url).toBe('https://auth.unipile.com/link/abc123');
      expect(result.expiresOn).toBeDefined();
      expect(new Date(result.expiresOn).getTime()).toBeGreaterThan(Date.now());
    });

    it('constructs correct request parameters', async () => {
      // Setup
      const mockCreateHostedAuthLink = vi.fn().mockResolvedValue({
        url: 'https://auth.unipile.com/link/abc123',
      });
      const mockClient = {
        account: {
          createHostedAuthLink: mockCreateHostedAuthLink,
        },
      };
      mockGetUnipileClient.mockReturnValue(mockClient as never);
      mockGetUnipileConfig.mockReturnValue({ dsn: 'https://api.unipile.com' });

      // Execute
      await generateAuthLink('user_123');

      // Assert
      expect(mockCreateHostedAuthLink).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'create',
          providers: ['LINKEDIN'],
          success_redirect_url: 'http://localhost:3000/onboarding/success',
          failure_redirect_url: 'http://localhost:3000/onboarding/error',
          notify_url: 'http://localhost:3000/api/webhooks/unipile',
          api_url: 'https://api.unipile.com',
          name: 'user_123',
        })
      );
    });

    it('normalizes app URL to remove trailing slash', async () => {
      // Setup
      process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000/';
      const mockCreateHostedAuthLink = vi.fn().mockResolvedValue({
        url: 'https://auth.unipile.com/link/abc123',
      });
      const mockClient = {
        account: {
          createHostedAuthLink: mockCreateHostedAuthLink,
        },
      };
      mockGetUnipileClient.mockReturnValue(mockClient as never);
      mockGetUnipileConfig.mockReturnValue({ dsn: 'https://api.unipile.com' });

      // Execute
      await generateAuthLink('user_123');

      // Assert - URLs should not have double slashes
      expect(mockCreateHostedAuthLink).toHaveBeenCalledWith(
        expect.objectContaining({
          success_redirect_url: 'http://localhost:3000/onboarding/success',
        })
      );
    });

    it('throws when NEXT_PUBLIC_APP_URL is missing', async () => {
      // Setup
      delete process.env.NEXT_PUBLIC_APP_URL;

      // Execute & Assert
      await expect(generateAuthLink('user_123')).rejects.toThrow(
        'NEXT_PUBLIC_APP_URL environment variable is required'
      );
    });

    it('propagates Unipile API errors', async () => {
      // Setup
      const mockClient = {
        account: {
          createHostedAuthLink: vi.fn().mockRejectedValue(new Error('API rate limit exceeded')),
        },
      };
      mockGetUnipileClient.mockReturnValue(mockClient as never);
      mockGetUnipileConfig.mockReturnValue({ dsn: 'https://api.unipile.com' });

      // Execute & Assert
      await expect(generateAuthLink('user_123')).rejects.toThrow('API rate limit exceeded');
    });

    it('uses custom expiry duration from env var', async () => {
      // Setup
      process.env.UNIPILE_AUTH_LINK_EXPIRY_MINUTES = '60';
      const mockClient = {
        account: {
          createHostedAuthLink: vi.fn().mockResolvedValue({
            url: 'https://auth.unipile.com/link/abc123',
          }),
        },
      };
      mockGetUnipileClient.mockReturnValue(mockClient as never);
      mockGetUnipileConfig.mockReturnValue({ dsn: 'https://api.unipile.com' });

      // Execute
      const result = await generateAuthLink('user_123');

      // Assert - expiry should be ~60 minutes from now
      const expiryTime = new Date(result.expiresOn).getTime();
      const expectedMinExpiry = Date.now() + 59 * 60 * 1000; // At least 59 minutes
      const expectedMaxExpiry = Date.now() + 61 * 60 * 1000; // At most 61 minutes
      expect(expiryTime).toBeGreaterThan(expectedMinExpiry);
      expect(expiryTime).toBeLessThan(expectedMaxExpiry);
    });
  });
});
