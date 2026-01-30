/**
 * Integration tests for POST /api/auth/unipile/connect
 *
 * Tests the auth link generation endpoint behavior:
 * - Returns URL for authenticated user
 * - Returns 401 for unauthenticated user
 * - Returns 500 when Unipile fails
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @clerk/nextjs/server
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));

// Mock @/lib/unipile/auth
vi.mock('@/lib/unipile/auth', () => ({
  generateAuthLink: vi.fn(),
}));

// Mock @/lib/db
vi.mock('@/lib/db', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoUpdate: vi.fn(),
      })),
    })),
  },
  users: {
    id: 'id', // Need this for the target field
  },
}));

import { auth, currentUser } from '@clerk/nextjs/server';
import { generateAuthLink } from '@/lib/unipile/auth';
import { db } from '@/lib/db';
import { POST } from '@/app/api/auth/unipile/connect/route';

const mockAuth = vi.mocked(auth);
const mockCurrentUser = vi.mocked(currentUser);
const mockGenerateAuthLink = vi.mocked(generateAuthLink);
const mockDbInsert = vi.mocked(db.insert);

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

describe('POST /api/auth/unipile/connect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns URL for authenticated user', async () => {
    // Setup: authenticated user
    mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);

    // Mock currentUser returning Clerk user data
    mockCurrentUser.mockResolvedValue({
      id: 'user_123',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      firstName: 'Test',
      lastName: 'User',
    } as never);

    // Mock database upsert
    const mockOnConflictDoUpdate = vi.fn();
    const mockValues = vi.fn(() => ({ onConflictDoUpdate: mockOnConflictDoUpdate }));
    mockDbInsert.mockReturnValue({ values: mockValues } as never);

    const expectedUrl = 'https://auth.unipile.com/link/abc123';
    const expectedExpiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    mockGenerateAuthLink.mockResolvedValue({
      url: expectedUrl,
      expiresOn: expectedExpiry,
    });

    // Execute
    const response = await POST();
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data).toEqual({ url: expectedUrl });
    expect(mockGenerateAuthLink).toHaveBeenCalledWith('user_123');
    expect(mockDbInsert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith({
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
    });
    expect(mockOnConflictDoUpdate).toHaveBeenCalled();
  });

  it('returns 401 for unauthenticated user', async () => {
    // Setup: no authenticated user
    mockAuth.mockResolvedValue(createMockAuthResponse(null) as never);

    // Execute
    const response = await POST();
    const data = await response.json();

    // Assert
    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
    expect(mockGenerateAuthLink).not.toHaveBeenCalled();
  });

  it('returns 500 when Unipile fails', async () => {
    // Setup: authenticated user but Unipile fails
    mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);

    // Mock currentUser
    mockCurrentUser.mockResolvedValue({
      id: 'user_123',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      firstName: 'Test',
      lastName: 'User',
    } as never);

    // Mock database upsert
    const mockOnConflictDoUpdate = vi.fn();
    const mockValues = vi.fn(() => ({ onConflictDoUpdate: mockOnConflictDoUpdate }));
    mockDbInsert.mockReturnValue({ values: mockValues } as never);

    const errorMessage = 'Unipile API connection failed';
    mockGenerateAuthLink.mockRejectedValue(new Error(errorMessage));

    // Execute
    const response = await POST();
    const data = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(data).toEqual({ error: errorMessage });
  });

  it('handles non-Error exceptions from Unipile', async () => {
    // Setup: authenticated user but Unipile throws non-Error
    mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);

    // Mock currentUser
    mockCurrentUser.mockResolvedValue({
      id: 'user_123',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      firstName: 'Test',
      lastName: 'User',
    } as never);

    // Mock database upsert
    const mockOnConflictDoUpdate = vi.fn();
    const mockValues = vi.fn(() => ({ onConflictDoUpdate: mockOnConflictDoUpdate }));
    mockDbInsert.mockReturnValue({ values: mockValues } as never);

    mockGenerateAuthLink.mockRejectedValue('String error');

    // Execute
    const response = await POST();
    const data = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'String error' });
  });

  it('upserts user atomically', async () => {
    // Setup: test upsert behavior (works for both new and existing users)
    mockAuth.mockResolvedValue(createMockAuthResponse('user_new') as never);

    // Mock currentUser
    mockCurrentUser.mockResolvedValue({
      id: 'user_new',
      emailAddresses: [{ emailAddress: 'new@example.com' }],
      firstName: 'New',
      lastName: 'User',
    } as never);

    // Mock database upsert
    const mockOnConflictDoUpdate = vi.fn();
    const mockValues = vi.fn(() => ({ onConflictDoUpdate: mockOnConflictDoUpdate }));
    mockDbInsert.mockReturnValue({ values: mockValues } as never);

    const expectedUrl = 'https://auth.unipile.com/link/xyz789';
    const expectedExpiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    mockGenerateAuthLink.mockResolvedValue({
      url: expectedUrl,
      expiresOn: expectedExpiry,
    });

    // Execute
    const response = await POST();
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data).toEqual({ url: expectedUrl });
    expect(mockDbInsert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith({
      id: 'user_new',
      email: 'new@example.com',
      name: 'New User',
    });
    expect(mockOnConflictDoUpdate).toHaveBeenCalled();
  });

  it('returns 404 when currentUser returns null', async () => {
    // Setup: authenticated session but currentUser fails
    mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
    mockCurrentUser.mockResolvedValue(null);

    // Execute
    const response = await POST();
    const data = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(data).toEqual({ error: 'User not found in Clerk' });
    expect(mockDbInsert).not.toHaveBeenCalled();
    expect(mockGenerateAuthLink).not.toHaveBeenCalled();
  });
});
