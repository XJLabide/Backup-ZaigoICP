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
import { GET } from '@/app/api/me/route';

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
