/**
 * Integration tests for POST /api/campaigns
 *
 * Tests campaign creation endpoint behavior:
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

// Mock @/lib/db
vi.mock('@/lib/db', () => {
  const mockDbModule = {
    db: {
      insert: vi.fn(),
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
    },
  };
  return mockDbModule;
});

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { POST } from '@/app/api/campaigns/route';

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
 * Helper to create a mock request with JSON body
 */
function createMockRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/campaigns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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
      const request = createMockRequest({ name: 'My Campaign' });
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
      const request = createMockRequest({
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
      const request = createMockRequest({
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
      const request = createMockRequest({ name: 'Test Campaign' });
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
      const request = createMockRequest({});
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details.name).toBeDefined();
    });

    it('returns 400 when name is empty string', async () => {
      // Execute
      const request = createMockRequest({ name: '' });
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details.name).toBeDefined();
    });

    it('returns 400 for invalid tone enum value', async () => {
      // Execute
      const request = createMockRequest({ name: 'Test', tone: 'aggressive' });
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details.tone).toBeDefined();
    });

    it('returns 400 for invalid cta enum value', async () => {
      // Execute
      const request = createMockRequest({ name: 'Test', cta: 'buy_now' });
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details.cta).toBeDefined();
    });

    it('returns 400 for invalid calendarLink URL', async () => {
      // Execute
      const request = createMockRequest({
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
      const request = createMockRequest({
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
      const request = createMockRequest({
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
      const request = createMockRequest({ name: 'Test Campaign' });
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
      const request = createMockRequest({ name: 'Test Campaign' });
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to create campaign' });
    });
  });
});
