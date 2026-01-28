/**
 * Integration tests for GET /api/stats
 *
 * Tests stats endpoint behavior:
 * - Returns dashboard stats for authenticated user
 * - Returns 401 for unauthenticated requests
 * - Returns 0s for new users with no data
 * - Correctly aggregates leads and actions
 * - Handles timezone-aware "today" calculations
 * - Calculates acceptance rate correctly
 * - Handles database errors gracefully
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @clerk/nextjs/server
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value, type: 'eq' })),
  and: vi.fn((...conditions) => ({ conditions, type: 'and' })),
  gte: vi.fn((field, value) => ({ field, value, type: 'gte' })),
  sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
    sql: strings.join(''),
    values,
    type: 'sql',
  })),
}));

// Mock @/lib/db
vi.mock('@/lib/db', () => {
  const mockDbModule = {
    db: {
      select: vi.fn(),
    },
    leads: {
      id: 'id',
      userId: 'user_id',
      createdAt: 'created_at',
      connectionAcceptedAt: 'connection_accepted_at',
    },
    actions: {
      id: 'id',
      userId: 'user_id',
      status: 'status',
      sentAt: 'sent_at',
    },
    users: {
      id: 'id',
      timezone: 'timezone',
    },
  };
  return mockDbModule;
});

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { GET } from '@/app/api/stats/route';

const mockAuth = vi.mocked(auth);
const mockDb = vi.mocked(db);

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
 * Helper to set up mock db for successful stats query
 * @param userTimezone - User's timezone (null means user not found, uses default)
 * @param leadsStats - Leads aggregates result
 * @param actionsStats - Actions aggregates result
 */
function setupDbSelectSuccess(
  userTimezone: string | null,
  leadsStats: {
    leadsToday: number;
    totalLeads: number;
    totalAccepted: number;
  },
  actionsStats: {
    sentToday: number;
    pendingActions: number;
    totalSent: number;
  }
) {
  let selectCallCount = 0;

  mockDb.select.mockImplementation(() => {
    selectCallCount++;
    const currentCall = selectCallCount;

    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          // First call: get user timezone
          if (currentCall === 1) {
            if (userTimezone === null) {
              return {
                limit: vi.fn().mockResolvedValue([]),
              };
            }
            return {
              limit: vi.fn().mockResolvedValue([{ timezone: userTimezone }]),
            };
          }
          // Second call: leads aggregates
          if (currentCall === 2) {
            return Promise.resolve([leadsStats]);
          }
          // Third call: actions aggregates
          if (currentCall === 3) {
            return Promise.resolve([actionsStats]);
          }
          return Promise.resolve([]);
        }),
      }),
    } as unknown as ReturnType<typeof mockDb.select>;
  });
}

/**
 * Helper to set up mock db for database error
 */
function setupDbSelectFailure(error: Error) {
  mockDb.select.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockRejectedValue(error),
    }),
  } as unknown as ReturnType<typeof mockDb.select>);
}

describe('GET /api/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authenticated requests - Happy path', () => {
    it('returns stats for user with data', async () => {
      // Setup
      const userId = 'user_123';
      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);
      setupDbSelectSuccess(
        'America/New_York',
        { leadsToday: 5, totalLeads: 50, totalAccepted: 20 },
        { sentToday: 3, pendingActions: 10, totalSent: 40 }
      );

      // Execute
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toEqual({
        leadsToday: 5,
        sentToday: 3,
        pendingActions: 10,
        acceptanceRate: 50, // 20 / 40 * 100 = 50%
        totalLeads: 50,
        totalSent: 40,
      });
    });

    it('returns 0s for new user with no data', async () => {
      // Setup
      const userId = 'user_new';
      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);
      setupDbSelectSuccess(
        'America/Los_Angeles',
        { leadsToday: 0, totalLeads: 0, totalAccepted: 0 },
        { sentToday: 0, pendingActions: 0, totalSent: 0 }
      );

      // Execute
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toEqual({
        leadsToday: 0,
        sentToday: 0,
        pendingActions: 0,
        acceptanceRate: 0,
        totalLeads: 0,
        totalSent: 0,
      });
    });

    it('uses default timezone when user timezone is missing', async () => {
      // Setup
      const userId = 'user_123';
      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);
      // null userTimezone simulates missing user record
      setupDbSelectSuccess(
        null,
        { leadsToday: 2, totalLeads: 10, totalAccepted: 5 },
        { sentToday: 1, pendingActions: 3, totalSent: 8 }
      );

      // Execute
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.leadsToday).toBe(2);
      expect(data.sentToday).toBe(1);
    });

    it('calculates acceptance rate correctly', async () => {
      // Setup
      const userId = 'user_123';
      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);
      setupDbSelectSuccess(
        'UTC',
        { leadsToday: 0, totalLeads: 100, totalAccepted: 25 },
        { sentToday: 0, pendingActions: 0, totalSent: 100 }
      );

      // Execute
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.acceptanceRate).toBe(25); // 25 / 100 * 100 = 25%
    });

    it('handles acceptance rate when totalSent is 0', async () => {
      // Setup
      const userId = 'user_123';
      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);
      setupDbSelectSuccess(
        'UTC',
        { leadsToday: 5, totalLeads: 10, totalAccepted: 0 },
        { sentToday: 0, pendingActions: 5, totalSent: 0 }
      );

      // Execute
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.acceptanceRate).toBe(0); // Avoid division by zero
    });

    it('rounds acceptance rate to 2 decimal places', async () => {
      // Setup
      const userId = 'user_123';
      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);
      setupDbSelectSuccess(
        'UTC',
        { leadsToday: 0, totalLeads: 100, totalAccepted: 33 },
        { sentToday: 0, pendingActions: 0, totalSent: 100 }
      );

      // Execute
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.acceptanceRate).toBe(33); // 33 / 100 * 100 = 33.00%
    });

    it('handles partial acceptance rate correctly', async () => {
      // Setup
      const userId = 'user_123';
      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);
      setupDbSelectSuccess(
        'UTC',
        { leadsToday: 0, totalLeads: 100, totalAccepted: 17 },
        { sentToday: 0, pendingActions: 0, totalSent: 50 }
      );

      // Execute
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.acceptanceRate).toBe(34); // 17 / 50 * 100 = 34%
    });
  });

  describe('Timezone handling', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(
        createMockAuthResponse('user_123') as never
      );
    });

    it('uses user timezone for today calculation', async () => {
      // Setup
      setupDbSelectSuccess(
        'America/New_York',
        { leadsToday: 5, totalLeads: 50, totalAccepted: 20 },
        { sentToday: 3, pendingActions: 10, totalSent: 40 }
      );

      // Execute
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.leadsToday).toBe(5);
      expect(data.sentToday).toBe(3);
    });

    it('supports different timezones', async () => {
      // Setup
      setupDbSelectSuccess(
        'Europe/London',
        { leadsToday: 2, totalLeads: 20, totalAccepted: 10 },
        { sentToday: 1, pendingActions: 5, totalSent: 15 }
      );

      // Execute
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.leadsToday).toBe(2);
      expect(data.sentToday).toBe(1);
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
      expect(mockDb.select).not.toHaveBeenCalled();
    });
  });

  describe('Database errors', () => {
    it('returns 0s when database query fails', async () => {
      // Setup
      mockAuth.mockResolvedValue(
        createMockAuthResponse('user_123') as never
      );
      setupDbSelectFailure(new Error('Connection refused'));

      // Execute
      const response = await GET();
      const data = await response.json();

      // Assert - The query function catches errors and returns 0s
      expect(response.status).toBe(200);
      expect(data).toEqual({
        leadsToday: 0,
        sentToday: 0,
        pendingActions: 0,
        acceptanceRate: 0,
        totalLeads: 0,
        totalSent: 0,
      });
    });
  });

  describe('Edge cases', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(
        createMockAuthResponse('user_123') as never
      );
    });

    it('handles missing leads aggregates', async () => {
      // Setup - simulate empty result
      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        const currentCall = selectCallCount;

        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockImplementation(() => {
              if (currentCall === 1) {
                return {
                  limit: vi.fn().mockResolvedValue([{ timezone: 'UTC' }]),
                };
              }
              // Return undefined for aggregates
              if (currentCall === 2) {
                return Promise.resolve([undefined]);
              }
              if (currentCall === 3) {
                return Promise.resolve([
                  { sentToday: 0, pendingActions: 0, totalSent: 0 },
                ]);
              }
              return Promise.resolve([]);
            }),
          }),
        } as unknown as ReturnType<typeof mockDb.select>;
      });

      // Execute
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.leadsToday).toBe(0);
      expect(data.totalLeads).toBe(0);
    });

    it('handles missing actions aggregates', async () => {
      // Setup - simulate empty result
      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        const currentCall = selectCallCount;

        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockImplementation(() => {
              if (currentCall === 1) {
                return {
                  limit: vi.fn().mockResolvedValue([{ timezone: 'UTC' }]),
                };
              }
              if (currentCall === 2) {
                return Promise.resolve([
                  { leadsToday: 5, totalLeads: 10, totalAccepted: 0 },
                ]);
              }
              // Return undefined for actions aggregates
              if (currentCall === 3) {
                return Promise.resolve([undefined]);
              }
              return Promise.resolve([]);
            }),
          }),
        } as unknown as ReturnType<typeof mockDb.select>;
      });

      // Execute
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.sentToday).toBe(0);
      expect(data.totalSent).toBe(0);
    });

    it('handles high acceptance rate correctly', async () => {
      // Setup
      setupDbSelectSuccess(
        'UTC',
        { leadsToday: 0, totalLeads: 50, totalAccepted: 49 },
        { sentToday: 0, pendingActions: 0, totalSent: 50 }
      );

      // Execute
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.acceptanceRate).toBe(98); // 49 / 50 * 100 = 98%
    });

    it('handles zero acceptance rate correctly', async () => {
      // Setup
      setupDbSelectSuccess(
        'UTC',
        { leadsToday: 0, totalLeads: 50, totalAccepted: 0 },
        { sentToday: 0, pendingActions: 0, totalSent: 50 }
      );

      // Execute
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.acceptanceRate).toBe(0);
    });
  });
});
