/**
 * Integration tests for POST /api/sync/profile-viewers
 *
 * Tests sync trigger endpoint behavior:
 * - Returns 202 Accepted with eventId when sync triggered
 * - Returns 429 Too Many Requests if user.lastSyncAt < 5 minutes ago
 * - Returns 401 Unauthorized when not authenticated
 * - Returns 400 Bad Request when LinkedIn not connected
 * - Returns 404 Not Found when user doesn't exist
 * - Returns 500 Internal Server Error on failure
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @clerk/nextjs/server
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value, type: 'eq' })),
}));

// Mock @/lib/db
vi.mock('@/lib/db', () => {
  const mockDbModule = {
    db: {
      select: vi.fn(),
    },
    users: {
      id: 'id',
      unipileAccountId: 'unipile_account_id',
      lastSyncAt: 'last_sync_at',
    },
  };
  return mockDbModule;
});

// Mock @/lib/inngest/client
vi.mock('@/lib/inngest/client', () => ({
  inngest: {
    send: vi.fn(),
  },
}));

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { inngest } from '@/lib/inngest/client';
import { POST } from '@/app/api/sync/profile-viewers/route';

const mockAuth = vi.mocked(auth);
const mockDb = vi.mocked(db);
const mockInngest = vi.mocked(inngest);

/**
 * Helper to create mock auth response with all required Clerk properties
 */
function createMockAuthResponse(userId: string | null) {
  return {
    userId,
    sessionId: userId ? 'session_123' : null,
    sessionClaims: null,
    actor: null,
    orgId: null,
    orgRole: null,
    orgSlug: null,
    orgPermissions: null,
    factorVerificationAge: null,
    sessionStatus: userId ? 'active' : null,
    tokenType: 'api_key',
    isAuthenticated: !!userId,
    getToken: vi.fn(),
    has: vi.fn(),
    debug: vi.fn(),
    protect: vi.fn(),
    redirectToSignIn: vi.fn() as never,
    redirectToSignUp: vi.fn() as never,
  };
}


/**
 * Helper to set up mock db for user query success
 */
function setupDbUserSuccess(user: Record<string, unknown> | null) {
  mockDb.select.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(user ? [user] : []),
    }),
  } as unknown as ReturnType<typeof mockDb.select>);
}

/**
 * Helper to set up mock db for user query failure
 */
function setupDbUserFailure(error: Error) {
  mockDb.select.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockRejectedValue(error),
    }),
  } as unknown as ReturnType<typeof mockDb.select>);
}

/**
 * Helper to create a mock user object
 */
function createMockUser(
  overrides: Partial<Record<string, unknown>> = {}
): Record<string, unknown> {
  return {
    id: 'user_123',
    unipileAccountId: 'unipile_acc_456',
    lastSyncAt: null,
    ...overrides,
  };
}

describe('POST /api/sync/profile-viewers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authenticated requests - Happy path', () => {
    it('returns 202 Accepted with eventId when sync is triggered', async () => {
      // Setup
      const userId = 'user_123';
      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);
      setupDbUserSuccess(createMockUser());
      mockInngest.send.mockResolvedValue({
        ids: ['event_abc123'],
      });

      // Execute
      const response = await POST();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(202);
      expect(data.message).toBe('Sync triggered');
      expect(data.eventId).toBe('event_abc123');
      expect(mockInngest.send).toHaveBeenCalledWith({
        name: 'sync/profile-viewers.trigger',
        data: {
          userId: 'user_123',
          unipileAccountId: 'unipile_acc_456',
        },
      });
    });

    it('returns 202 when lastSyncAt is null (first sync)', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      setupDbUserSuccess(createMockUser({ lastSyncAt: null }));
      mockInngest.send.mockResolvedValue({ ids: ['event_first'] });

      // Execute
      const response = await POST();

      // Assert
      expect(response.status).toBe(202);
    });

    it('returns 202 when lastSyncAt is more than 5 minutes ago', async () => {
      // Setup - 10 minutes ago
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      setupDbUserSuccess(createMockUser({ lastSyncAt: tenMinutesAgo }));
      mockInngest.send.mockResolvedValue({ ids: ['event_allowed'] });

      // Execute
      const response = await POST();

      // Assert
      expect(response.status).toBe(202);
    });

    it('returns 202 when lastSyncAt is exactly 5 minutes ago', async () => {
      // Setup - exactly 5 minutes ago
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      setupDbUserSuccess(createMockUser({ lastSyncAt: fiveMinutesAgo }));
      mockInngest.send.mockResolvedValue({ ids: ['event_edge'] });

      // Execute
      const response = await POST();

      // Assert
      expect(response.status).toBe(202);
    });
  });

  describe('Rate limiting', () => {
    it('returns 429 when lastSyncAt is less than 5 minutes ago', async () => {
      // Setup - 2 minutes ago
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      setupDbUserSuccess(createMockUser({ lastSyncAt: twoMinutesAgo }));

      // Execute
      const response = await POST();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(429);
      expect(data.error).toBe('Rate limit exceeded');
      expect(data.retryAfter).toBeGreaterThan(0);
      expect(data.retryAfter).toBeLessThanOrEqual(180); // ~3 minutes
      expect(response.headers.get('Retry-After')).toBeTruthy();
      expect(mockInngest.send).not.toHaveBeenCalled();
    });

    it('returns 429 when lastSyncAt is just now', async () => {
      // Setup - just now
      const justNow = new Date();
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      setupDbUserSuccess(createMockUser({ lastSyncAt: justNow }));

      // Execute
      const response = await POST();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(429);
      expect(data.retryAfter).toBeGreaterThan(290); // ~5 minutes
      expect(data.retryAfter).toBeLessThanOrEqual(300);
    });

    it('returns 429 with correct retryAfter value', async () => {
      // Setup - 4 minutes ago, should have ~1 minute remaining
      const fourMinutesAgo = new Date(Date.now() - 4 * 60 * 1000);
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      setupDbUserSuccess(createMockUser({ lastSyncAt: fourMinutesAgo }));

      // Execute
      const response = await POST();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(429);
      expect(data.retryAfter).toBeGreaterThan(50); // ~1 minute
      expect(data.retryAfter).toBeLessThanOrEqual(70);
    });

    it('includes Retry-After header with seconds value', async () => {
      // Setup
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      setupDbUserSuccess(createMockUser({ lastSyncAt: twoMinutesAgo }));

      // Execute
      const response = await POST();
      const retryAfterHeader = response.headers.get('Retry-After');

      // Assert
      expect(retryAfterHeader).toBeTruthy();
      const retryAfterSeconds = parseInt(retryAfterHeader!, 10);
      expect(retryAfterSeconds).toBeGreaterThan(0);
    });
  });

  describe('Unauthenticated requests', () => {
    it('returns 401 for unauthenticated user', async () => {
      // Setup: no authenticated user
      mockAuth.mockResolvedValue(createMockAuthResponse(null) as never);

      // Execute
      const response = await POST();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
      expect(mockDb.select).not.toHaveBeenCalled();
      expect(mockInngest.send).not.toHaveBeenCalled();
    });
  });

  describe('User not found', () => {
    it('returns 404 when user does not exist', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      setupDbUserSuccess(null); // No user found

      // Execute
      const response = await POST();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'User not found' });
      expect(mockInngest.send).not.toHaveBeenCalled();
    });
  });

  describe('LinkedIn not connected', () => {
    it('returns 400 when user has no unipileAccountId', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      setupDbUserSuccess(createMockUser({ unipileAccountId: null }));

      // Execute
      const response = await POST();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'LinkedIn account not connected' });
      expect(mockInngest.send).not.toHaveBeenCalled();
    });

    it('returns 400 when unipileAccountId is empty string', async () => {
      // Setup - empty string should be treated as not connected
      // Note: actual DB would have null, but test the edge case
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      setupDbUserSuccess(createMockUser({ unipileAccountId: '' }));

      // Execute
      const response = await POST();
      const data = await response.json();

      // Assert - empty string is falsy, should return 400
      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'LinkedIn account not connected' });
    });
  });

  describe('Database errors', () => {
    it('returns 500 for database query errors', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      setupDbUserFailure(new Error('Connection refused'));

      // Execute
      const response = await POST();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to trigger sync' });
    });
  });

  describe('Inngest errors', () => {
    it('returns 500 when Inngest send fails', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      setupDbUserSuccess(createMockUser());
      mockInngest.send.mockRejectedValue(new Error('Inngest unavailable'));

      // Execute
      const response = await POST();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to trigger sync' });
    });
  });

  describe('Event payload', () => {
    it('sends correct event data to Inngest', async () => {
      // Setup
      const userId = 'user_xyz';
      const unipileAccountId = 'unipile_123';
      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);
      setupDbUserSuccess(
        createMockUser({ id: userId, unipileAccountId })
      );
      mockInngest.send.mockResolvedValue({ ids: ['event_test'] });

      // Execute
      await POST();

      // Assert
      expect(mockInngest.send).toHaveBeenCalledTimes(1);
      expect(mockInngest.send).toHaveBeenCalledWith({
        name: 'sync/profile-viewers.trigger',
        data: {
          userId,
          unipileAccountId,
        },
      });
    });
  });
});
