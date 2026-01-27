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
}));

// Mock @/lib/unipile/auth
vi.mock('@/lib/unipile/auth', () => ({
  generateAuthLink: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { generateAuthLink } from '@/lib/unipile/auth';
import { POST } from '@/app/api/auth/unipile/connect/route';

const mockAuth = vi.mocked(auth);
const mockGenerateAuthLink = vi.mocked(generateAuthLink);

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

    mockGenerateAuthLink.mockRejectedValue('String error');

    // Execute
    const response = await POST();
    const data = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'String error' });
  });
});
