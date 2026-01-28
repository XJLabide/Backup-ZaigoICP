/**
 * Integration tests for GET /api/me
 *
 * Tests user sync endpoint behavior:
 * - Creates new user in database
 * - Updates existing user in database
 * - Returns 401 for unauthenticated requests
 * - Returns 404 when Clerk user not found
 * - Returns 500 for database errors
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @clerk/nextjs/server
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));

// Mock @/lib/db
vi.mock('@/lib/db', () => {
  const mockDbModule = {
    db: {
      query: {
        users: {
          findFirst: vi.fn(),
        },
      },
      update: vi.fn(),
      insert: vi.fn(),
    },
    users: {
      id: 'id',
      email: 'email',
      name: 'name',
      updatedAt: 'updated_at',
    },
  };
  return mockDbModule;
});

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value })),
}));

import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { GET, PATCH } from '@/app/api/me/route';

const mockAuth = vi.mocked(auth);
const mockCurrentUser = vi.mocked(currentUser);
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
 * Helper to create mock Clerk user
 */
function createMockClerkUser(options: {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string;
}) {
  return {
    id: options.id,
    firstName: options.firstName ?? null,
    lastName: options.lastName ?? null,
    emailAddresses: options.email
      ? [{ emailAddress: options.email }]
      : [],
    // Other Clerk user properties
    username: null,
    imageUrl: '',
    hasImage: false,
    primaryEmailAddressId: null,
    primaryPhoneNumberId: null,
    primaryWeb3WalletId: null,
    phoneNumbers: [],
    web3Wallets: [],
    externalAccounts: [],
    samlAccounts: [],
    organizationMemberships: [],
    passwordEnabled: false,
    twoFactorEnabled: false,
    totp_enabled: false,
    backupCodeEnabled: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    publicMetadata: {},
    privateMetadata: {},
    unsafeMetadata: {},
    lastSignInAt: null,
    banned: false,
    locked: false,
    createOrganizationEnabled: true,
    deleteSelfEnabled: true,
    legalAcceptedAt: null,
    lastActiveAt: null,
    createOrganization: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
    getSessions: vi.fn(),
    verifyPassword: vi.fn(),
    getPrimaryEmailAddress: vi.fn(),
    getOrganizationMemberships: vi.fn(),
  };
}

/**
 * Helper to set up mock db for existing user
 */
function setupDbExistingUser(user: { id: string; email: string; name: string | null }) {
  (mockDb.query.users.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(user);
  mockDb.update.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([user]),
      }),
    }),
  } as unknown as ReturnType<typeof mockDb.update>);
}

/**
 * Helper to set up mock db for new user
 */
function setupDbNewUser() {
  (mockDb.query.users.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  mockDb.insert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
      }]),
    }),
  } as unknown as ReturnType<typeof mockDb.insert>);
}

describe('GET /api/me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authenticated requests', () => {
    it('creates new user when not in database', async () => {
      // Setup: authenticated user not in DB
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      mockCurrentUser.mockResolvedValue(createMockClerkUser({
        id: 'user_123',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
      }) as never);
      setupDbNewUser();

      // Execute
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.user).toBeDefined();
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('updates existing user in database', async () => {
      // Setup: authenticated user already in DB
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      mockCurrentUser.mockResolvedValue(createMockClerkUser({
        id: 'user_123',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
      }) as never);
      setupDbExistingUser({
        id: 'user_123',
        email: 'old@example.com',
        name: 'Old Name',
      });

      // Execute
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.user).toBeDefined();
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('handles user with only first name', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      mockCurrentUser.mockResolvedValue(createMockClerkUser({
        id: 'user_123',
        firstName: 'Test',
        lastName: null,
        email: 'test@example.com',
      }) as never);
      setupDbNewUser();

      // Execute
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.user).toBeDefined();
    });

    it('handles user with no name', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      mockCurrentUser.mockResolvedValue(createMockClerkUser({
        id: 'user_123',
        firstName: null,
        lastName: null,
        email: 'test@example.com',
      }) as never);
      setupDbNewUser();

      // Execute
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.user).toBeDefined();
    });

    it('handles user with no email', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      mockCurrentUser.mockResolvedValue(createMockClerkUser({
        id: 'user_123',
        firstName: 'Test',
        email: undefined,
      }) as never);
      setupDbNewUser();

      // Execute
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.user).toBeDefined();
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
      expect(mockCurrentUser).not.toHaveBeenCalled();
    });
  });

  describe('Clerk errors', () => {
    it('returns 404 when Clerk user not found', async () => {
      // Setup: authenticated but currentUser returns null
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      mockCurrentUser.mockResolvedValue(null);

      // Execute
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'User not found in Clerk' });
    });
  });

  describe('Database errors', () => {
    it('returns 500 for database errors', async () => {
      // Setup: authenticated user, Clerk works, DB fails
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      mockCurrentUser.mockResolvedValue(createMockClerkUser({
        id: 'user_123',
        firstName: 'Test',
        email: 'test@example.com',
      }) as never);
      (mockDb.query.users.findFirst as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Connection refused'));

      // Execute
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to sync user' });
    });

    it('handles non-Error database exceptions', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      mockCurrentUser.mockResolvedValue(createMockClerkUser({
        id: 'user_123',
        firstName: 'Test',
        email: 'test@example.com',
      }) as never);
      (mockDb.query.users.findFirst as ReturnType<typeof vi.fn>).mockRejectedValue('String error');

      // Execute
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to sync user' });
    });
  });
});

/**
 * Helper to set up mock db for PATCH update
 */
function setupDbPatchUpdate(user: {
  id: string;
  email: string;
  name: string | null;
  timezone?: string;
  dailyLimit?: number;
  calendarLink?: string | null;
}) {
  mockDb.update.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([user]),
      }),
    }),
  } as unknown as ReturnType<typeof mockDb.update>);
}

describe('PATCH /api/me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authenticated requests - valid updates', () => {
    it('updates dailyLimit when provided', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      setupDbPatchUpdate({
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        dailyLimit: 30,
      });

      const request = new Request('http://localhost/api/me', {
        method: 'PATCH',
        body: JSON.stringify({ dailyLimit: 30 }),
      });

      // Execute
      const response = await PATCH(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.user).toBeDefined();
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('updates timezone when provided', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      setupDbPatchUpdate({
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        timezone: 'America/New_York',
      });

      const request = new Request('http://localhost/api/me', {
        method: 'PATCH',
        body: JSON.stringify({ timezone: 'America/New_York' }),
      });

      // Execute
      const response = await PATCH(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.user).toBeDefined();
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('updates calendarLink when provided', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      setupDbPatchUpdate({
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        calendarLink: 'https://calendly.com/user',
      });

      const request = new Request('http://localhost/api/me', {
        method: 'PATCH',
        body: JSON.stringify({ calendarLink: 'https://calendly.com/user' }),
      });

      // Execute
      const response = await PATCH(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.user).toBeDefined();
    });

    it('updates multiple fields at once', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      setupDbPatchUpdate({
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        timezone: 'Europe/London',
        dailyLimit: 20,
      });

      const request = new Request('http://localhost/api/me', {
        method: 'PATCH',
        body: JSON.stringify({
          timezone: 'Europe/London',
          dailyLimit: 20,
        }),
      });

      // Execute
      const response = await PATCH(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.user).toBeDefined();
    });

    it('sets calendarLink to null when explicitly provided', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      setupDbPatchUpdate({
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        calendarLink: null,
      });

      const request = new Request('http://localhost/api/me', {
        method: 'PATCH',
        body: JSON.stringify({ calendarLink: null }),
      });

      // Execute
      const response = await PATCH(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.user).toBeDefined();
    });
  });

  describe('Validation errors', () => {
    it('returns 400 for invalid calendar link', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);

      const request = new Request('http://localhost/api/me', {
        method: 'PATCH',
        body: JSON.stringify({ calendarLink: 'not-a-url' }),
      });

      // Execute
      const response = await PATCH(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toBeDefined();
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('returns 400 for dailyLimit below minimum', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);

      const request = new Request('http://localhost/api/me', {
        method: 'PATCH',
        body: JSON.stringify({ dailyLimit: 5 }),
      });

      // Execute
      const response = await PATCH(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('returns 400 for dailyLimit above maximum', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);

      const request = new Request('http://localhost/api/me', {
        method: 'PATCH',
        body: JSON.stringify({ dailyLimit: 100 }),
      });

      // Execute
      const response = await PATCH(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('returns 400 for non-integer dailyLimit', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);

      const request = new Request('http://localhost/api/me', {
        method: 'PATCH',
        body: JSON.stringify({ dailyLimit: 25.5 }),
      });

      // Execute
      const response = await PATCH(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('returns 400 for empty timezone', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);

      const request = new Request('http://localhost/api/me', {
        method: 'PATCH',
        body: JSON.stringify({ timezone: '' }),
      });

      // Execute
      const response = await PATCH(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('returns 400 when no fields provided for update', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);

      const request = new Request('http://localhost/api/me', {
        method: 'PATCH',
        body: JSON.stringify({}),
      });

      // Execute
      const response = await PATCH(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('returns 400 for edge case dailyLimit values', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);

      const request = new Request('http://localhost/api/me', {
        method: 'PATCH',
        body: JSON.stringify({ dailyLimit: 'twenty' }),
      });

      // Execute
      const response = await PATCH(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });
  });

  describe('Authentication', () => {
    it('returns 401 for unauthenticated user', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse(null) as never);

      const request = new Request('http://localhost/api/me', {
        method: 'PATCH',
        body: JSON.stringify({ dailyLimit: 30 }),
      });

      // Execute
      const response = await PATCH(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
      expect(mockDb.update).not.toHaveBeenCalled();
    });
  });

  describe('Database operations', () => {
    it('returns 404 when user not found in database', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as unknown as ReturnType<typeof mockDb.update>);

      const request = new Request('http://localhost/api/me', {
        method: 'PATCH',
        body: JSON.stringify({ dailyLimit: 30 }),
      });

      // Execute
      const response = await PATCH(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'User not found' });
    });

    it('returns 500 for database errors', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      mockDb.update.mockRejectedValue(new Error('Connection refused'));

      const request = new Request('http://localhost/api/me', {
        method: 'PATCH',
        body: JSON.stringify({ dailyLimit: 30 }),
      });

      // Execute
      const response = await PATCH(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to update user preferences' });
    });
  });

  describe('Edge cases and boundary values', () => {
    it('accepts dailyLimit at minimum boundary (10)', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      setupDbPatchUpdate({
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        dailyLimit: 10,
      });

      const request = new Request('http://localhost/api/me', {
        method: 'PATCH',
        body: JSON.stringify({ dailyLimit: 10 }),
      });

      // Execute
      const response = await PATCH(request);

      // Assert
      expect(response.status).toBe(200);
    });

    it('accepts dailyLimit at maximum boundary (50)', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      setupDbPatchUpdate({
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        dailyLimit: 50,
      });

      const request = new Request('http://localhost/api/me', {
        method: 'PATCH',
        body: JSON.stringify({ dailyLimit: 50 }),
      });

      // Execute
      const response = await PATCH(request);

      // Assert
      expect(response.status).toBe(200);
    });

    it('rejects dailyLimit below minimum (9)', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);

      const request = new Request('http://localhost/api/me', {
        method: 'PATCH',
        body: JSON.stringify({ dailyLimit: 9 }),
      });

      // Execute
      const response = await PATCH(request);

      // Assert
      expect(response.status).toBe(400);
    });

    it('rejects dailyLimit above maximum (51)', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);

      const request = new Request('http://localhost/api/me', {
        method: 'PATCH',
        body: JSON.stringify({ dailyLimit: 51 }),
      });

      // Execute
      const response = await PATCH(request);

      // Assert
      expect(response.status).toBe(400);
    });

    it('handles calendar link with query parameters', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      const calendarUrl = 'https://calendly.com/user?name=Test&email=test@example.com';
      setupDbPatchUpdate({
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        calendarLink: calendarUrl,
      });

      const request = new Request('http://localhost/api/me', {
        method: 'PATCH',
        body: JSON.stringify({ calendarLink: calendarUrl }),
      });

      // Execute
      const response = await PATCH(request);

      // Assert
      expect(response.status).toBe(200);
    });

    it('handles updates with extra unknown fields', async () => {
      // Setup - unknown fields should be ignored by Zod
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      setupDbPatchUpdate({
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        dailyLimit: 30,
      });

      const request = new Request('http://localhost/api/me', {
        method: 'PATCH',
        body: JSON.stringify({
          dailyLimit: 30,
          unknownField: 'should-be-ignored',
        }),
      });

      // Execute
      const response = await PATCH(request);

      // Assert
      expect(response.status).toBe(200);
    });
  });
});
