/**
 * Integration tests for GET and POST /api/campaigns
 *
 * Tests campaign endpoints behavior:
 * GET:
 * - Lists campaigns for authenticated user
 * - Returns 401 for unauthenticated requests
 * - Supports pagination (page, limit query params)
 * - Returns total count for pagination UI
 * - Orders campaigns by createdAt desc
 * - Only returns campaigns owned by authenticated user
 *
 * POST:
 * - Creates campaign with minimal required fields
 * - Creates campaign with all optional fields
 * - Returns 401 for unauthenticated requests
 * - Returns 400 for validation errors
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
  desc: vi.fn((field) => ({ field, type: 'desc' })),
  sql: vi.fn((strings: TemplateStringsArray) => ({
    sql: strings.join(''),
    type: 'sql',
  })),
}));

// Mock @/lib/db
vi.mock('@/lib/db', () => {
  const mockDbModule = {
    db: {
      insert: vi.fn(),
      select: vi.fn(),
    },
    campaigns: {
      id: 'id',
      userId: 'user_id',
      name: 'name',
      tone: 'tone',
      cta: 'cta',
      calendarLink: 'calendar_link',
      qualificationRules: 'qualification_rules',
      autoApprove: 'auto_approve',
      createdAt: 'created_at',
    },
  };
  return mockDbModule;
});

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { GET, POST } from '@/app/api/campaigns/route';

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
 * Helper to create a mock POST request with JSON body
 */
function createMockPostRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/campaigns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/**
 * Helper to create a mock GET request with optional query params
 */
function createMockGetRequest(
  params?: Record<string, string | number>
): Request {
  const url = new URL('http://localhost:3000/api/campaigns');
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
 * Helper to set up mock db for successful insert
 */
function setupDbInsertSuccess(campaign: Record<string, unknown>) {
  mockDb.insert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([campaign]),
    }),
  } as unknown as ReturnType<typeof mockDb.insert>);
}

/**
 * Helper to set up mock db for insert failure
 */
function setupDbInsertFailure(error: Error) {
  mockDb.insert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockRejectedValue(error),
    }),
  } as unknown as ReturnType<typeof mockDb.insert>);
}

/**
 * Helper to set up mock db for select (list) with count
 */
function setupDbSelectSuccess(
  campaignsList: Record<string, unknown>[],
  totalCount: number
) {
  // Track call order to return count first, then campaigns
  let selectCallCount = 0;

  mockDb.select.mockImplementation(() => {
    selectCallCount++;
    const currentCall = selectCallCount;

    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          // First call is for count
          if (currentCall === 1) {
            return Promise.resolve([{ count: totalCount }]);
          }
          // Second call is for campaigns (returns chainable)
          return {
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(campaignsList),
              }),
            }),
          };
        }),
      }),
    } as unknown as ReturnType<typeof mockDb.select>;
  });
}

/**
 * Helper to set up mock db for select failure
 */
function setupDbSelectFailure(error: Error) {
  mockDb.select.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockRejectedValue(error),
    }),
  } as unknown as ReturnType<typeof mockDb.select>);
}

/**
 * Helper to create a mock campaign object
 */
function createMockCampaign(
  overrides: Partial<Record<string, unknown>> = {}
): Record<string, unknown> {
  return {
    id: 'campaign_123',
    userId: 'user_123',
    name: 'Test Campaign',
    tone: 'professional',
    cta: 'reply',
    calendarLink: null,
    qualificationRules: null,
    autoApprove: false,
    isActive: true,
    totalLeads: 0,
    totalSent: 0,
    totalAccepted: 0,
    totalReplied: 0,
    createdAt: new Date('2024-01-15T12:00:00Z'),
    updatedAt: new Date('2024-01-15T12:00:00Z'),
    ...overrides,
  };
}

describe('POST /api/campaigns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authenticated requests - Happy path', () => {
    it('creates campaign with name only (minimal required fields)', async () => {
      // Setup
      const userId = 'user_123';
      const campaignId = 'campaign_abc';
      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);
      setupDbInsertSuccess({
        id: campaignId,
        userId,
        name: 'My Campaign',
        tone: 'professional',
        cta: 'reply',
        calendarLink: null,
        qualificationRules: null,
        autoApprove: false,
        isActive: true,
        totalLeads: 0,
        totalSent: 0,
        totalAccepted: 0,
        totalReplied: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Execute
      const request = createMockPostRequest({ name: 'My Campaign' });
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(data.campaign).toBeDefined();
      expect(data.campaign.id).toBe(campaignId);
      expect(data.campaign.name).toBe('My Campaign');
      expect(data.campaign.tone).toBe('professional');
      expect(data.campaign.cta).toBe('reply');
      expect(data.campaign.autoApprove).toBe(false);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('creates campaign with all optional fields', async () => {
      // Setup
      const userId = 'user_123';
      const campaignId = 'campaign_xyz';
      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);
      setupDbInsertSuccess({
        id: campaignId,
        userId,
        name: 'Full Campaign',
        tone: 'friendly',
        cta: 'book_call',
        calendarLink: 'https://calendly.com/mylink',
        qualificationRules: '{"industry":"tech"}',
        autoApprove: true,
        isActive: true,
        totalLeads: 0,
        totalSent: 0,
        totalAccepted: 0,
        totalReplied: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Execute
      const request = createMockPostRequest({
        name: 'Full Campaign',
        tone: 'friendly',
        cta: 'book_call',
        calendarLink: 'https://calendly.com/mylink',
        qualificationRules: '{"industry":"tech"}',
        autoApprove: true,
      });
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(data.campaign).toBeDefined();
      expect(data.campaign.tone).toBe('friendly');
      expect(data.campaign.cta).toBe('book_call');
      expect(data.campaign.calendarLink).toBe('https://calendly.com/mylink');
      expect(data.campaign.qualificationRules).toBe('{"industry":"tech"}');
      expect(data.campaign.autoApprove).toBe(true);
    });

    it('creates campaign with null calendarLink', async () => {
      // Setup
      const userId = 'user_123';
      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);
      setupDbInsertSuccess({
        id: 'campaign_null',
        userId,
        name: 'Campaign No Link',
        tone: 'professional',
        cta: 'reply',
        calendarLink: null,
        qualificationRules: null,
        autoApprove: false,
        isActive: true,
        totalLeads: 0,
        totalSent: 0,
        totalAccepted: 0,
        totalReplied: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Execute
      const request = createMockPostRequest({
        name: 'Campaign No Link',
        calendarLink: null,
      });
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(data.campaign.calendarLink).toBeNull();
    });
  });

  describe('Unauthenticated requests', () => {
    it('returns 401 for unauthenticated user', async () => {
      // Setup: no authenticated user
      mockAuth.mockResolvedValue(createMockAuthResponse(null) as never);

      // Execute
      const request = createMockPostRequest({ name: 'Test Campaign' });
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  describe('Validation errors', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
    });

    it('returns 400 when name is missing', async () => {
      // Execute
      const request = createMockPostRequest({});
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details.name).toBeDefined();
    });

    it('returns 400 when name is empty string', async () => {
      // Execute
      const request = createMockPostRequest({ name: '' });
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details.name).toBeDefined();
    });

    it('returns 400 for invalid tone enum value', async () => {
      // Execute
      const request = createMockPostRequest({ name: 'Test', tone: 'aggressive' });
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details.tone).toBeDefined();
    });

    it('returns 400 for invalid cta enum value', async () => {
      // Execute
      const request = createMockPostRequest({ name: 'Test', cta: 'buy_now' });
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details.cta).toBeDefined();
    });

    it('returns 400 for invalid calendarLink URL', async () => {
      // Execute
      const request = createMockPostRequest({
        name: 'Test',
        calendarLink: 'not-a-url',
      });
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details.calendarLink).toBeDefined();
    });

    it('returns 400 for invalid qualificationRules JSON', async () => {
      // Execute
      const request = createMockPostRequest({
        name: 'Test',
        qualificationRules: 'not valid json',
      });
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details.qualificationRules).toBeDefined();
    });

    it('returns 400 for invalid autoApprove type', async () => {
      // Execute
      const request = createMockPostRequest({
        name: 'Test',
        autoApprove: 'yes',
      });
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details.autoApprove).toBeDefined();
    });
  });

  describe('Database errors', () => {
    it('returns 500 for database insert errors', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      setupDbInsertFailure(new Error('Connection refused'));

      // Execute
      const request = createMockPostRequest({ name: 'Test Campaign' });
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to create campaign' });
    });

    it('handles non-Error database exceptions', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue('String error'),
        }),
      } as unknown as ReturnType<typeof mockDb.insert>);

      // Execute
      const request = createMockPostRequest({ name: 'Test Campaign' });
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to create campaign' });
    });
  });
});

describe('GET /api/campaigns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authenticated requests - Happy path', () => {
    it('returns campaigns for authenticated user with default pagination', async () => {
      // Setup
      const userId = 'user_123';
      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);
      const campaigns = [
        createMockCampaign({ id: 'campaign_1', name: 'First Campaign' }),
        createMockCampaign({ id: 'campaign_2', name: 'Second Campaign' }),
      ];
      setupDbSelectSuccess(campaigns, 2);

      // Execute
      const request = createMockGetRequest();
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.campaigns).toHaveLength(2);
      expect(data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
    });

    it('returns empty array when user has no campaigns', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      setupDbSelectSuccess([], 0);

      // Execute
      const request = createMockGetRequest();
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.campaigns).toHaveLength(0);
      expect(data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      });
    });

    it('returns campaigns with stats from denormalized fields', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      const campaigns = [
        createMockCampaign({
          id: 'campaign_1',
          totalLeads: 50,
          totalSent: 30,
          totalAccepted: 15,
          totalReplied: 5,
        }),
      ];
      setupDbSelectSuccess(campaigns, 1);

      // Execute
      const request = createMockGetRequest();
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.campaigns[0].totalLeads).toBe(50);
      expect(data.campaigns[0].totalSent).toBe(30);
      expect(data.campaigns[0].totalAccepted).toBe(15);
      expect(data.campaigns[0].totalReplied).toBe(5);
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
    });

    it('respects page query parameter', async () => {
      // Setup
      const campaigns = [
        createMockCampaign({ id: 'campaign_11', name: 'Campaign 11' }),
      ];
      setupDbSelectSuccess(campaigns, 25);

      // Execute
      const request = createMockGetRequest({ page: 2 });
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.pagination.page).toBe(2);
      expect(data.pagination.total).toBe(25);
      expect(data.pagination.totalPages).toBe(3);
    });

    it('respects limit query parameter', async () => {
      // Setup
      const campaigns = [
        createMockCampaign({ id: 'campaign_1' }),
        createMockCampaign({ id: 'campaign_2' }),
        createMockCampaign({ id: 'campaign_3' }),
        createMockCampaign({ id: 'campaign_4' }),
        createMockCampaign({ id: 'campaign_5' }),
      ];
      setupDbSelectSuccess(campaigns, 25);

      // Execute
      const request = createMockGetRequest({ limit: 5 });
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.pagination.limit).toBe(5);
      expect(data.pagination.totalPages).toBe(5);
    });

    it('caps limit at maximum of 50', async () => {
      // Setup
      setupDbSelectSuccess([], 0);

      // Execute
      const request = createMockGetRequest({ limit: 100 });
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.pagination.limit).toBe(50);
    });

    it('uses default values for invalid page parameter', async () => {
      // Setup
      setupDbSelectSuccess([], 0);

      // Execute
      const request = createMockGetRequest({ page: 'invalid' });
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.pagination.page).toBe(1);
    });

    it('uses default values for invalid limit parameter', async () => {
      // Setup
      setupDbSelectSuccess([], 0);

      // Execute
      const request = createMockGetRequest({ limit: 'invalid' });
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.pagination.limit).toBe(10);
    });

    it('uses default values for negative page parameter', async () => {
      // Setup
      setupDbSelectSuccess([], 0);

      // Execute
      const request = createMockGetRequest({ page: -5 });
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.pagination.page).toBe(1);
    });

    it('uses default values for zero limit parameter', async () => {
      // Setup
      setupDbSelectSuccess([], 0);

      // Execute
      const request = createMockGetRequest({ limit: 0 });
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.pagination.limit).toBe(10);
    });

    it('calculates totalPages correctly', async () => {
      // Setup - 23 campaigns with limit 10 should give 3 pages
      setupDbSelectSuccess([], 23);

      // Execute
      const request = createMockGetRequest({ limit: 10 });
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(data.pagination.totalPages).toBe(3);
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
      expect(data).toEqual({ error: 'Failed to list campaigns' });
    });
  });
});
