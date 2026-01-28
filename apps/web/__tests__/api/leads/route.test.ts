/**
 * Integration tests for GET /api/leads
 *
 * Tests leads endpoint behavior:
 * - Lists leads for authenticated user with cursor pagination
 * - Returns 401 for unauthenticated requests
 * - Supports cursor-based pagination (cursor, limit query params)
 * - Supports filters: status, campaignId, source
 * - Returns nextCursor when more results exist
 * - Returns 400 for invalid cursor format
 * - Returns 400 for invalid filter values
 * - Returns 500 for database errors
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
  gt: vi.fn((field, value) => ({ field, value, type: 'gt' })),
  asc: vi.fn((field) => ({ field, type: 'asc' })),
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
      campaignId: 'campaign_id',
      linkedInId: 'linkedin_id',
      profileUrl: 'profile_url',
      firstName: 'first_name',
      lastName: 'last_name',
      fullName: 'full_name',
      headline: 'headline',
      company: 'company',
      location: 'location',
      profileImageUrl: 'profile_image_url',
      about: 'about',
      recentPost: 'recent_post',
      mutualConnections: 'mutual_connections',
      source: 'source',
      status: 'status',
      viewedAt: 'viewed_at',
      enrichedAt: 'enriched_at',
      connectionAcceptedAt: 'connection_accepted_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    leadStatusEnum: {
      enumValues: ['new', 'qualified', 'messaged', 'connected', 'replied', 'skipped'],
    },
    leadSourceEnum: {
      enumValues: ['profile_viewer'],
    },
  };
  return mockDbModule;
});

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { GET } from '@/app/api/leads/route';

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
 * Helper to create a mock GET request with optional query params
 */
function createMockGetRequest(
  params?: Record<string, string | number>
): Request {
  const url = new URL('http://localhost:3000/api/leads');
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });
  }
  return new Request(url.toString(), {
    method: 'GET',
  });
}

/**
 * Helper to set up mock db for select success
 */
function setupDbSelectSuccess(leadsList: Record<string, unknown>[]) {
  mockDb.select.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(leadsList),
        }),
      }),
    }),
  } as unknown as ReturnType<typeof mockDb.select>);
}

/**
 * Helper to set up mock db for select failure
 */
function setupDbSelectFailure(error: Error) {
  mockDb.select.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockRejectedValue(error),
        }),
      }),
    }),
  } as unknown as ReturnType<typeof mockDb.select>);
}

/**
 * Helper to create a mock lead object
 */
function createMockLead(
  overrides: Partial<Record<string, unknown>> = {}
): Record<string, unknown> {
  return {
    id: 'lead_123',
    userId: 'user_123',
    campaignId: null,
    linkedInId: 'linkedin_abc',
    profileUrl: 'https://linkedin.com/in/johndoe',
    firstName: 'John',
    lastName: 'Doe',
    fullName: 'John Doe',
    headline: 'Software Engineer',
    company: 'Tech Corp',
    location: 'San Francisco, CA',
    profileImageUrl: 'https://linkedin.com/photo.jpg',
    about: null,
    recentPost: null,
    mutualConnections: 5,
    source: 'profile_viewer',
    status: 'new',
    viewedAt: new Date('2024-01-15T10:00:00Z'),
    enrichedAt: null,
    connectionAcceptedAt: null,
    createdAt: new Date('2024-01-15T12:00:00Z'),
    updatedAt: new Date('2024-01-15T12:00:00Z'),
    ...overrides,
  };
}

/**
 * Helper to encode cursor (matches route implementation)
 */
function encodeCursor(date: Date): string {
  return Buffer.from(date.toISOString()).toString('base64');
}

describe('GET /api/leads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authenticated requests - Happy path', () => {
    it('returns leads for authenticated user with default pagination', async () => {
      // Setup
      const userId = 'user_123';
      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);
      const leads = [
        createMockLead({ id: 'lead_1', fullName: 'John Doe' }),
        createMockLead({ id: 'lead_2', fullName: 'Jane Smith' }),
      ];
      setupDbSelectSuccess(leads);

      // Execute
      const request = createMockGetRequest();
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.leads).toHaveLength(2);
      expect(data.nextCursor).toBeNull();
    });

    it('returns empty array when user has no leads', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      setupDbSelectSuccess([]);

      // Execute
      const request = createMockGetRequest();
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.leads).toHaveLength(0);
      expect(data.nextCursor).toBeNull();
    });

    it('returns nextCursor when more results exist', async () => {
      // Setup - return limit+1 results to indicate more exist
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      const leadsWithExtra = [];
      for (let i = 0; i < 21; i++) {
        leadsWithExtra.push(
          createMockLead({
            id: `lead_${i}`,
            createdAt: new Date(`2024-01-15T${String(i).padStart(2, '0')}:00:00Z`),
          })
        );
      }
      setupDbSelectSuccess(leadsWithExtra);

      // Execute
      const request = createMockGetRequest();
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.leads).toHaveLength(20);
      expect(data.nextCursor).not.toBeNull();
      // Verify cursor is valid base64
      expect(() => Buffer.from(data.nextCursor, 'base64')).not.toThrow();
    });

    it('returns leads with all fields populated', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      const leads = [
        createMockLead({
          id: 'lead_full',
          linkedInId: 'li_12345',
          profileUrl: 'https://linkedin.com/in/fullprofile',
          firstName: 'Full',
          lastName: 'Profile',
          fullName: 'Full Profile',
          headline: 'Senior Engineer at BigCorp',
          company: 'BigCorp',
          location: 'New York, NY',
          about: 'Experienced engineer with 10 years...',
          mutualConnections: 15,
          status: 'qualified',
          campaignId: 'campaign_123',
        }),
      ];
      setupDbSelectSuccess(leads);

      // Execute
      const request = createMockGetRequest();
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.leads[0].linkedInId).toBe('li_12345');
      expect(data.leads[0].headline).toBe('Senior Engineer at BigCorp');
      expect(data.leads[0].status).toBe('qualified');
      expect(data.leads[0].campaignId).toBe('campaign_123');
    });
  });

  describe('Cursor pagination', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
    });

    it('accepts valid cursor parameter', async () => {
      // Setup
      const cursorDate = new Date('2024-01-15T10:00:00Z');
      const cursor = encodeCursor(cursorDate);
      const leads = [createMockLead({ id: 'lead_after_cursor' })];
      setupDbSelectSuccess(leads);

      // Execute
      const request = createMockGetRequest({ cursor });
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.leads).toHaveLength(1);
    });

    it('returns 400 for invalid cursor format', async () => {
      // Execute
      const request = createMockGetRequest({ cursor: 'invalid-not-base64!' });
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid cursor format');
    });

    it('returns 400 for cursor with invalid date', async () => {
      // Execute - base64 of 'not-a-date'
      const invalidCursor = Buffer.from('not-a-date').toString('base64');
      const request = createMockGetRequest({ cursor: invalidCursor });
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid cursor format');
    });

    it('cursor from nextCursor can be used for next page', async () => {
      // Setup - first request returns more results
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      const lastLeadDate = new Date('2024-01-15T19:00:00Z');
      const leadsWithExtra = [];
      for (let i = 0; i < 21; i++) {
        leadsWithExtra.push(
          createMockLead({
            id: `lead_${i}`,
            createdAt: i < 20 ? new Date(`2024-01-15T${String(i).padStart(2, '0')}:00:00Z`) : lastLeadDate,
          })
        );
      }
      setupDbSelectSuccess(leadsWithExtra);

      // First request
      const request1 = createMockGetRequest();
      const response1 = await GET(request1);
      const data1 = await response1.json();

      // Get cursor from response
      const nextCursor = data1.nextCursor;
      expect(nextCursor).not.toBeNull();

      // Setup second request
      const secondPageLeads = [createMockLead({ id: 'lead_21' })];
      setupDbSelectSuccess(secondPageLeads);

      // Second request with cursor
      const request2 = createMockGetRequest({ cursor: nextCursor });
      const response2 = await GET(request2);
      const data2 = await response2.json();

      // Assert second page works
      expect(response2.status).toBe(200);
      expect(data2.leads).toHaveLength(1);
    });
  });

  describe('Limit parameter', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
    });

    it('respects limit query parameter', async () => {
      // Setup - return limit+1 to show pagination works
      const leads = [];
      for (let i = 0; i < 6; i++) {
        leads.push(createMockLead({ id: `lead_${i}` }));
      }
      setupDbSelectSuccess(leads);

      // Execute
      const request = createMockGetRequest({ limit: 5 });
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.leads).toHaveLength(5);
      expect(data.nextCursor).not.toBeNull();
    });

    it('caps limit at maximum of 100', async () => {
      // Setup
      setupDbSelectSuccess([]);

      // Execute
      const request = createMockGetRequest({ limit: 200 });
      const response = await GET(request);

      // Assert - should not error, uses max 100
      expect(response.status).toBe(200);
    });

    it('uses default limit of 20 for invalid parameter', async () => {
      // Setup
      setupDbSelectSuccess([]);

      // Execute
      const request = createMockGetRequest({ limit: 'invalid' });
      const response = await GET(request);

      // Assert
      expect(response.status).toBe(200);
    });

    it('uses default limit for zero value', async () => {
      // Setup
      setupDbSelectSuccess([]);

      // Execute
      const request = createMockGetRequest({ limit: 0 });
      const response = await GET(request);

      // Assert
      expect(response.status).toBe(200);
    });

    it('uses default limit for negative value', async () => {
      // Setup
      setupDbSelectSuccess([]);

      // Execute
      const request = createMockGetRequest({ limit: -10 });
      const response = await GET(request);

      // Assert
      expect(response.status).toBe(200);
    });
  });

  describe('Status filter', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
    });

    it('filters by status when provided', async () => {
      // Setup
      const qualifiedLeads = [
        createMockLead({ id: 'lead_1', status: 'qualified' }),
        createMockLead({ id: 'lead_2', status: 'qualified' }),
      ];
      setupDbSelectSuccess(qualifiedLeads);

      // Execute
      const request = createMockGetRequest({ status: 'qualified' });
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.leads).toHaveLength(2);
    });

    it('accepts all valid status values', async () => {
      const validStatuses = ['new', 'qualified', 'messaged', 'connected', 'replied', 'skipped'];

      for (const status of validStatuses) {
        setupDbSelectSuccess([]);
        const request = createMockGetRequest({ status });
        const response = await GET(request);
        expect(response.status).toBe(200);
      }
    });

    it('returns 400 for invalid status value', async () => {
      // Execute
      const request = createMockGetRequest({ status: 'invalid_status' });
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid status filter value');
    });
  });

  describe('CampaignId filter', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
    });

    it('filters by campaignId when provided', async () => {
      // Setup
      const campaignLeads = [
        createMockLead({ id: 'lead_1', campaignId: 'campaign_123' }),
        createMockLead({ id: 'lead_2', campaignId: 'campaign_123' }),
      ];
      setupDbSelectSuccess(campaignLeads);

      // Execute
      const request = createMockGetRequest({ campaignId: 'campaign_123' });
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.leads).toHaveLength(2);
    });

    it('returns empty array when no leads match campaignId', async () => {
      // Setup
      setupDbSelectSuccess([]);

      // Execute
      const request = createMockGetRequest({ campaignId: 'nonexistent_campaign' });
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.leads).toHaveLength(0);
    });
  });

  describe('Source filter', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
    });

    it('filters by source when provided', async () => {
      // Setup
      const profileViewerLeads = [
        createMockLead({ id: 'lead_1', source: 'profile_viewer' }),
      ];
      setupDbSelectSuccess(profileViewerLeads);

      // Execute
      const request = createMockGetRequest({ source: 'profile_viewer' });
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.leads).toHaveLength(1);
    });

    it('returns 400 for invalid source value', async () => {
      // Execute
      const request = createMockGetRequest({ source: 'invalid_source' });
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid source filter value');
    });
  });

  describe('Combined filters', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
    });

    it('supports multiple filters simultaneously', async () => {
      // Setup
      const filteredLeads = [
        createMockLead({
          id: 'lead_1',
          status: 'qualified',
          campaignId: 'campaign_123',
          source: 'profile_viewer',
        }),
      ];
      setupDbSelectSuccess(filteredLeads);

      // Execute
      const request = createMockGetRequest({
        status: 'qualified',
        campaignId: 'campaign_123',
        source: 'profile_viewer',
      });
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.leads).toHaveLength(1);
    });

    it('supports filters with cursor pagination', async () => {
      // Setup
      const cursor = encodeCursor(new Date('2024-01-15T10:00:00Z'));
      const leads = [
        createMockLead({
          id: 'lead_1',
          status: 'new',
          createdAt: new Date('2024-01-15T11:00:00Z'),
        }),
      ];
      setupDbSelectSuccess(leads);

      // Execute
      const request = createMockGetRequest({
        cursor,
        status: 'new',
        limit: 10,
      });
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.leads).toHaveLength(1);
    });
  });

  describe('Unauthenticated requests', () => {
    it('returns 401 for unauthenticated user', async () => {
      // Setup: no authenticated user
      mockAuth.mockResolvedValue(createMockAuthResponse(null) as never);

      // Execute
      const request = createMockGetRequest();
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
      expect(mockDb.select).not.toHaveBeenCalled();
    });
  });

  describe('Database errors', () => {
    it('returns 500 for database query errors', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      setupDbSelectFailure(new Error('Connection refused'));

      // Execute
      const request = createMockGetRequest();
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to list leads' });
    });

    it('handles non-Error database exceptions', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockRejectedValue('String error'),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof mockDb.select>);

      // Execute
      const request = createMockGetRequest();
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to list leads' });
    });
  });
});
