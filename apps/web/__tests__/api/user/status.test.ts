/**
 * Integration tests for GET /api/user/status
 *
 * Tests user status endpoint behavior:
 * - Returns connected status when user has unipileAccountId
 * - Returns disconnected status when user has no unipileAccountId
 * - Returns 401 for unauthenticated user
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @clerk/nextjs/server
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock @/lib/db - inline mock factory for proper hoisting
vi.mock('@/lib/db', () => {
  const mockDbModule = {
    db: {
      select: vi.fn(),
    },
    users: {
      id: 'id',
      unipileAccountId: 'unipile_account_id',
      linkedInConnectedAt: 'linkedin_connected_at',
    },
  };
  return mockDbModule;
});

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value })),
}));

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { GET } from '@/app/api/user/status/route';

const mockAuth = vi.mocked(auth);
const mockDb = vi.mocked(db);

/**
 * Helper to set up mock db select
 */
function setupDbSelect(result: Array<{ unipileAccountId: string | null; linkedInConnectedAt: Date | null }>) {
  mockDb.select.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  } as unknown as ReturnType<typeof mockDb.select>);
}

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

describe('GET /api/user/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authenticated requests', () => {
    it('returns connected status when user has unipileAccountId', async () => {
      // Setup: authenticated user with LinkedIn connected
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);

      const connectedAt = new Date('2024-01-15T10:30:00Z');
      setupDbSelect([{
        unipileAccountId: 'unipile_acc_456',
        linkedInConnectedAt: connectedAt,
      }]);

      // Execute
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toEqual({
        linkedInConnected: true,
        connectedAt: connectedAt.toISOString(),
      });
      // Check Cache-Control header
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    });

    it('returns disconnected status when user has no unipileAccountId', async () => {
      // Setup: authenticated user without LinkedIn connected
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);

      setupDbSelect([{
        unipileAccountId: null,
        linkedInConnectedAt: null,
      }]);

      // Execute
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toEqual({
        linkedInConnected: false,
        connectedAt: null,
      });
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    });

    it('returns disconnected status when user record does not exist', async () => {
      // Setup: authenticated user but no DB record (yet)
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);

      setupDbSelect([]); // No user record found

      // Execute
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toEqual({
        linkedInConnected: false,
        connectedAt: null,
      });
    });

    it('handles connected status with null connectedAt timestamp', async () => {
      // Edge case: unipileAccountId exists but connectedAt is null
      // This shouldn't normally happen but we handle it gracefully
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);

      setupDbSelect([{
        unipileAccountId: 'unipile_acc_456',
        linkedInConnectedAt: null,
      }]);

      // Execute
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toEqual({
        linkedInConnected: true,
        connectedAt: null,
      });
    });
  });

  describe('Unauthenticated requests', () => {
    it('returns 401 for unauthenticated user', async () => {
      // Setup: no authenticated user
      mockAuth.mockResolvedValue(createMockAuthResponse(null) as never);

      // Execute
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      // Ensure no database query was made
      expect(mockDb.select).not.toHaveBeenCalled();
    });
  });

  describe('Database errors', () => {
    it('returns 500 for database errors', async () => {
      // Setup: authenticated user but database fails
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(new Error('Connection refused')),
          }),
        }),
      } as unknown as ReturnType<typeof mockDb.select>);

      // Execute
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Internal server error' });
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    });

    it('handles non-Error database exceptions', async () => {
      // Setup: authenticated user but database throws non-Error
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue('String error'),
          }),
        }),
      } as unknown as ReturnType<typeof mockDb.select>);

      // Execute
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Internal server error' });
    });
  });
});
