/**
 * Unit tests for lib/unipile/profile-viewers.ts
 *
 * Tests the Unipile profile viewers API wrapper:
 * - getProfileViewers() fetches and normalizes profile viewers
 * - Handles pagination with cursor
 * - Throws descriptive errors on API failure
 * - getAllProfileViewers() paginates through all results
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the client module
vi.mock('@/lib/unipile/client', () => ({
  getUnipileClient: vi.fn(),
}));

// Mock server-only since it's not available in test environment
vi.mock('server-only', () => ({}));

import { getUnipileClient } from '@/lib/unipile/client';
import {
  getProfileViewers,
  getAllProfileViewers,
  UnipileApiError,
  type UnipileProfileViewer,
  type ProfileViewersResponse,
} from '@/lib/unipile/profile-viewers';

// Create mock response data
const createMockViewer = (overrides: Partial<UnipileProfileViewer> = {}): UnipileProfileViewer => ({
  id: 'viewer-123',
  provider_id: 'john-doe-abc123',
  name: 'John Doe',
  first_name: 'John',
  last_name: 'Doe',
  headline: 'Software Engineer at Acme Corp',
  company: 'Acme Corp',
  location: 'San Francisco, CA',
  profile_picture_url: 'https://media.licdn.com/profile/123.jpg',
  public_profile_url: 'https://www.linkedin.com/in/john-doe',
  viewed_at: '2024-01-15T10:30:00.000Z',
  ...overrides,
});

describe('lib/unipile/profile-viewers', () => {
  let mockSend: ReturnType<typeof vi.fn>;
  let mockClient: { request: { send: ReturnType<typeof vi.fn> } };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSend = vi.fn();
    mockClient = {
      request: {
        send: mockSend,
      },
    };
    vi.mocked(getUnipileClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getUnipileClient>);
  });

  describe('getProfileViewers', () => {
    it('fetches profile viewers from Unipile API', async () => {
      const mockResponse: ProfileViewersResponse = {
        items: [createMockViewer()],
        cursor: null,
      };
      mockSend.mockResolvedValue(mockResponse);

      const result = await getProfileViewers('account-123');

      expect(mockSend).toHaveBeenCalledWith({
        method: 'GET',
        path: ['linkedin', 'profile_viewers'],
        parameters: {
          account_id: 'account-123',
          limit: '50',
        },
      });
      expect(result.viewers).toHaveLength(1);
      expect(result.nextCursor).toBeNull();
    });

    it('returns normalized ProfileViewer objects', async () => {
      const mockResponse: ProfileViewersResponse = {
        items: [createMockViewer()],
        cursor: null,
      };
      mockSend.mockResolvedValue(mockResponse);

      const { viewers } = await getProfileViewers('account-123');

      expect(viewers[0]).toEqual({
        linkedInId: 'john-doe-abc123',
        profileUrl: 'https://www.linkedin.com/in/john-doe',
        fullName: 'John Doe',
        firstName: 'John',
        lastName: 'Doe',
        headline: 'Software Engineer at Acme Corp',
        company: 'Acme Corp',
        location: 'San Francisco, CA',
        profileImageUrl: 'https://media.licdn.com/profile/123.jpg',
        viewedAt: new Date('2024-01-15T10:30:00.000Z'),
      });
    });

    it('handles missing optional fields gracefully', async () => {
      const mockResponse: ProfileViewersResponse = {
        items: [
          {
            id: 'viewer-456',
            provider_id: 'jane-smith-xyz789',
            name: 'Jane Smith',
            // All optional fields missing
          },
        ],
        cursor: null,
      };
      mockSend.mockResolvedValue(mockResponse);

      const { viewers } = await getProfileViewers('account-123');

      expect(viewers[0]).toEqual({
        linkedInId: 'jane-smith-xyz789',
        profileUrl: 'https://www.linkedin.com/in/jane-smith-xyz789',
        fullName: 'Jane Smith',
        firstName: null,
        lastName: null,
        headline: null,
        company: null,
        location: null,
        profileImageUrl: null,
        viewedAt: null,
      });
    });

    it('handles pagination with cursor', async () => {
      const mockResponse: ProfileViewersResponse = {
        items: [createMockViewer()],
        cursor: 'next-page-cursor',
      };
      mockSend.mockResolvedValue(mockResponse);

      const result = await getProfileViewers('account-123', { cursor: 'prev-cursor' });

      expect(mockSend).toHaveBeenCalledWith({
        method: 'GET',
        path: ['linkedin', 'profile_viewers'],
        parameters: {
          account_id: 'account-123',
          limit: '50',
          cursor: 'prev-cursor',
        },
      });
      expect(result.nextCursor).toBe('next-page-cursor');
    });

    it('respects custom limit option', async () => {
      const mockResponse: ProfileViewersResponse = {
        items: [],
        cursor: null,
      };
      mockSend.mockResolvedValue(mockResponse);

      await getProfileViewers('account-123', { limit: 25 });

      expect(mockSend).toHaveBeenCalledWith({
        method: 'GET',
        path: ['linkedin', 'profile_viewers'],
        parameters: {
          account_id: 'account-123',
          limit: '25',
        },
      });
    });

    it('throws UnipileApiError when accountId is empty', async () => {
      await expect(getProfileViewers('')).rejects.toThrow(UnipileApiError);
      await expect(getProfileViewers('')).rejects.toThrow('accountId is required');
    });

    it('throws UnipileApiError on API failure', async () => {
      const apiError = new Error('Request failed');
      (apiError as unknown as { body: unknown }).body = {
        status: 429,
        type: 'errors/rate_limit',
        message: 'Rate limit exceeded',
      };
      mockSend.mockRejectedValue(apiError);

      await expect(getProfileViewers('account-123')).rejects.toThrow(UnipileApiError);
      await expect(getProfileViewers('account-123')).rejects.toThrow('Rate limit exceeded');
    });

    it('includes status code and error type from API error', async () => {
      const apiError = new Error('Request failed');
      (apiError as unknown as { body: unknown }).body = {
        status: 403,
        type: 'errors/insufficient_privileges',
        message: 'Insufficient privileges',
      };
      mockSend.mockRejectedValue(apiError);

      try {
        await getProfileViewers('account-123');
        expect.fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnipileApiError);
        expect((error as UnipileApiError).statusCode).toBe(403);
        expect((error as UnipileApiError).errorType).toBe('errors/insufficient_privileges');
      }
    });

    it('handles generic errors without body', async () => {
      mockSend.mockRejectedValue(new Error('Network error'));

      await expect(getProfileViewers('account-123')).rejects.toThrow(UnipileApiError);
      await expect(getProfileViewers('account-123')).rejects.toThrow('Network error');
    });

    it('handles non-Error objects', async () => {
      mockSend.mockRejectedValue('string error');

      await expect(getProfileViewers('account-123')).rejects.toThrow(
        'Unknown error occurred while fetching profile viewers'
      );
    });

    it('handles empty items array', async () => {
      const mockResponse: ProfileViewersResponse = {
        items: [],
        cursor: null,
      };
      mockSend.mockResolvedValue(mockResponse);

      const result = await getProfileViewers('account-123');

      expect(result.viewers).toEqual([]);
      expect(result.nextCursor).toBeNull();
    });

    it('handles undefined items gracefully', async () => {
      const mockResponse = {
        cursor: null,
      } as unknown as ProfileViewersResponse;
      mockSend.mockResolvedValue(mockResponse);

      const result = await getProfileViewers('account-123');

      expect(result.viewers).toEqual([]);
    });
  });

  describe('getAllProfileViewers', () => {
    it('fetches all pages of profile viewers', async () => {
      // First page
      mockSend.mockResolvedValueOnce({
        items: [createMockViewer({ id: 'v1', provider_id: 'viewer-1' })],
        cursor: 'page-2',
      });
      // Second page
      mockSend.mockResolvedValueOnce({
        items: [createMockViewer({ id: 'v2', provider_id: 'viewer-2' })],
        cursor: 'page-3',
      });
      // Third page (last)
      mockSend.mockResolvedValueOnce({
        items: [createMockViewer({ id: 'v3', provider_id: 'viewer-3' })],
        cursor: null,
      });

      const viewers = await getAllProfileViewers('account-123');

      expect(viewers).toHaveLength(3);
      expect(viewers[0].linkedInId).toBe('viewer-1');
      expect(viewers[1].linkedInId).toBe('viewer-2');
      expect(viewers[2].linkedInId).toBe('viewer-3');
      expect(mockSend).toHaveBeenCalledTimes(3);
    });

    it('respects maxPages limit', async () => {
      // Return cursor on every page to simulate infinite pagination
      mockSend.mockImplementation(() =>
        Promise.resolve({
          items: [createMockViewer()],
          cursor: 'next-page',
        })
      );

      const viewers = await getAllProfileViewers('account-123', 3);

      expect(viewers).toHaveLength(3);
      expect(mockSend).toHaveBeenCalledTimes(3);
    });

    it('stops when cursor is null', async () => {
      mockSend.mockResolvedValueOnce({
        items: [createMockViewer()],
        cursor: null,
      });

      const viewers = await getAllProfileViewers('account-123', 10);

      expect(viewers).toHaveLength(1);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('uses default maxPages of 10', async () => {
      mockSend.mockImplementation(() =>
        Promise.resolve({
          items: [createMockViewer()],
          cursor: 'next-page',
        })
      );

      await getAllProfileViewers('account-123');

      expect(mockSend).toHaveBeenCalledTimes(10);
    });

    it('propagates errors from getProfileViewers', async () => {
      const apiError = new Error('API Error');
      (apiError as unknown as { body: unknown }).body = {
        status: 500,
        message: 'Internal server error',
      };
      mockSend.mockRejectedValue(apiError);

      await expect(getAllProfileViewers('account-123')).rejects.toThrow(UnipileApiError);
    });
  });

  describe('UnipileApiError', () => {
    it('has correct name', () => {
      const error = new UnipileApiError('test error');
      expect(error.name).toBe('UnipileApiError');
    });

    it('stores statusCode and errorType', () => {
      const error = new UnipileApiError('test error', 404, 'errors/not_found');
      expect(error.statusCode).toBe(404);
      expect(error.errorType).toBe('errors/not_found');
    });
  });
});
