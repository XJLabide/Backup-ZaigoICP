/**
 * Integration tests for PATCH and DELETE /api/campaigns/[id]
 *
 * Tests campaign update and delete endpoints:
 * PATCH:
 * - Updates campaign fields with partial data
 * - Returns 401 for unauthenticated requests
 * - Returns 404 for campaigns not found or not owned
 * - Returns 400 for validation errors
 * - Returns 500 for database errors
 * - Updates updatedAt timestamp
 *
 * DELETE:
 * - Deletes campaign and returns 204
 * - Returns 401 for unauthenticated requests
 * - Returns 404 for campaigns not found or not owned
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
  and: vi.fn((...conditions) => ({ type: 'and', conditions })),
}));

// Mock @/lib/db
vi.mock('@/lib/db', () => {
  const mockDbModule = {
    db: {
      select: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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
      isActive: 'is_active',
      updatedAt: 'updated_at',
      createdAt: 'created_at',
    },
  };
  return mockDbModule;
});

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { PATCH, DELETE } from '@/app/api/campaigns/[id]/route';

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
 * Helper to create a mock PATCH request with JSON body
 */
function createMockPatchRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/campaigns/campaign_123', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/**
 * Helper to create a mock DELETE request
 */
function createMockDeleteRequest(): Request {
  return new Request('http://localhost:3000/api/campaigns/campaign_123', {
    method: 'DELETE',
  });
}

/**
 * Helper to create mock params (Next.js 15 async params)
 */
function createMockParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
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

/**
 * Helper to set up mock db for select (find campaign)
 */
function setupDbSelectSuccess(campaign: Record<string, unknown> | null) {
  mockDb.select.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(campaign ? [campaign] : []),
    }),
  } as unknown as ReturnType<typeof mockDb.select>);
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
 * Helper to set up mock db for update success
 */
function setupDbUpdateSuccess(campaign: Record<string, unknown>) {
  mockDb.update.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([campaign]),
      }),
    }),
  } as unknown as ReturnType<typeof mockDb.update>);
}

/**
 * Helper to set up mock db for update failure
 */
function setupDbUpdateFailure(error: Error) {
  mockDb.update.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockRejectedValue(error),
      }),
    }),
  } as unknown as ReturnType<typeof mockDb.update>);
}

/**
 * Helper to set up mock db for delete success
 */
function setupDbDeleteSuccess() {
  mockDb.delete.mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  } as unknown as ReturnType<typeof mockDb.delete>);
}

/**
 * Helper to set up mock db for delete failure
 */
function setupDbDeleteFailure(error: Error) {
  mockDb.delete.mockReturnValue({
    where: vi.fn().mockRejectedValue(error),
  } as unknown as ReturnType<typeof mockDb.delete>);
}

describe('PATCH /api/campaigns/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authenticated requests - Happy path', () => {
    it('updates campaign name', async () => {
      // Setup
      const userId = 'user_123';
      const campaignId = 'campaign_123';
      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);
      setupDbSelectSuccess(createMockCampaign({ id: campaignId, userId }));
      setupDbUpdateSuccess(
        createMockCampaign({
          id: campaignId,
          userId,
          name: 'Updated Campaign',
          updatedAt: new Date(),
        })
      );

      // Execute
      const request = createMockPatchRequest({ name: 'Updated Campaign' });
      const response = await PATCH(request, createMockParams(campaignId));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.campaign).toBeDefined();
      expect(data.campaign.name).toBe('Updated Campaign');
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('updates campaign tone', async () => {
      // Setup
      const userId = 'user_123';
      const campaignId = 'campaign_123';
      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);
      setupDbSelectSuccess(createMockCampaign({ id: campaignId, userId }));
      setupDbUpdateSuccess(
        createMockCampaign({
          id: campaignId,
          userId,
          tone: 'friendly',
          updatedAt: new Date(),
        })
      );

      // Execute
      const request = createMockPatchRequest({ tone: 'friendly' });
      const response = await PATCH(request, createMockParams(campaignId));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.campaign.tone).toBe('friendly');
    });

    it('updates campaign cta', async () => {
      // Setup
      const userId = 'user_123';
      const campaignId = 'campaign_123';
      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);
      setupDbSelectSuccess(createMockCampaign({ id: campaignId, userId }));
      setupDbUpdateSuccess(
        createMockCampaign({
          id: campaignId,
          userId,
          cta: 'book_call',
          updatedAt: new Date(),
        })
      );

      // Execute
      const request = createMockPatchRequest({ cta: 'book_call' });
      const response = await PATCH(request, createMockParams(campaignId));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.campaign.cta).toBe('book_call');
    });

    it('updates campaign calendarLink', async () => {
      // Setup
      const userId = 'user_123';
      const campaignId = 'campaign_123';
      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);
      setupDbSelectSuccess(createMockCampaign({ id: campaignId, userId }));
      setupDbUpdateSuccess(
        createMockCampaign({
          id: campaignId,
          userId,
          calendarLink: 'https://calendly.com/newlink',
          updatedAt: new Date(),
        })
      );

      // Execute
      const request = createMockPatchRequest({
        calendarLink: 'https://calendly.com/newlink',
      });
      const response = await PATCH(request, createMockParams(campaignId));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.campaign.calendarLink).toBe('https://calendly.com/newlink');
    });

    it('updates campaign autoApprove', async () => {
      // Setup
      const userId = 'user_123';
      const campaignId = 'campaign_123';
      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);
      setupDbSelectSuccess(createMockCampaign({ id: campaignId, userId }));
      setupDbUpdateSuccess(
        createMockCampaign({
          id: campaignId,
          userId,
          autoApprove: true,
          updatedAt: new Date(),
        })
      );

      // Execute
      const request = createMockPatchRequest({ autoApprove: true });
      const response = await PATCH(request, createMockParams(campaignId));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.campaign.autoApprove).toBe(true);
    });

    it('updates campaign isActive', async () => {
      // Setup
      const userId = 'user_123';
      const campaignId = 'campaign_123';
      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);
      setupDbSelectSuccess(createMockCampaign({ id: campaignId, userId }));
      setupDbUpdateSuccess(
        createMockCampaign({
          id: campaignId,
          userId,
          isActive: false,
          updatedAt: new Date(),
        })
      );

      // Execute
      const request = createMockPatchRequest({ isActive: false });
      const response = await PATCH(request, createMockParams(campaignId));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.campaign.isActive).toBe(false);
    });

    it('updates multiple fields at once', async () => {
      // Setup
      const userId = 'user_123';
      const campaignId = 'campaign_123';
      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);
      setupDbSelectSuccess(createMockCampaign({ id: campaignId, userId }));
      setupDbUpdateSuccess(
        createMockCampaign({
          id: campaignId,
          userId,
          name: 'New Name',
          tone: 'direct',
          autoApprove: true,
          updatedAt: new Date(),
        })
      );

      // Execute
      const request = createMockPatchRequest({
        name: 'New Name',
        tone: 'direct',
        autoApprove: true,
      });
      const response = await PATCH(request, createMockParams(campaignId));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.campaign.name).toBe('New Name');
      expect(data.campaign.tone).toBe('direct');
      expect(data.campaign.autoApprove).toBe(true);
    });

    it('allows setting calendarLink to null', async () => {
      // Setup
      const userId = 'user_123';
      const campaignId = 'campaign_123';
      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);
      setupDbSelectSuccess(
        createMockCampaign({
          id: campaignId,
          userId,
          calendarLink: 'https://old.link',
        })
      );
      setupDbUpdateSuccess(
        createMockCampaign({
          id: campaignId,
          userId,
          calendarLink: null,
          updatedAt: new Date(),
        })
      );

      // Execute
      const request = createMockPatchRequest({ calendarLink: null });
      const response = await PATCH(request, createMockParams(campaignId));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.campaign.calendarLink).toBeNull();
    });
  });

  describe('Unauthenticated requests', () => {
    it('returns 401 for unauthenticated user', async () => {
      // Setup: no authenticated user
      mockAuth.mockResolvedValue(createMockAuthResponse(null) as never);

      // Execute
      const request = createMockPatchRequest({ name: 'Updated' });
      const response = await PATCH(request, createMockParams('campaign_123'));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
      expect(mockDb.select).not.toHaveBeenCalled();
      expect(mockDb.update).not.toHaveBeenCalled();
    });
  });

  describe('Campaign not found or not owned', () => {
    it('returns 404 when campaign does not exist', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      setupDbSelectSuccess(null);

      // Execute
      const request = createMockPatchRequest({ name: 'Updated' });
      const response = await PATCH(
        request,
        createMockParams('nonexistent_campaign')
      );
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Campaign not found' });
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('returns 404 when campaign belongs to another user', async () => {
      // Setup - campaign exists but belongs to different user
      // The query with userId filter returns empty
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      setupDbSelectSuccess(null); // Owner check returns empty

      // Execute
      const request = createMockPatchRequest({ name: 'Updated' });
      const response = await PATCH(
        request,
        createMockParams('other_user_campaign')
      );
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Campaign not found' });
      expect(mockDb.update).not.toHaveBeenCalled();
    });
  });

  describe('Validation errors', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
    });

    it('returns 400 when no fields provided', async () => {
      // Execute
      const request = createMockPatchRequest({});
      const response = await PATCH(request, createMockParams('campaign_123'));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    it('returns 400 for empty name', async () => {
      // Execute
      const request = createMockPatchRequest({ name: '' });
      const response = await PATCH(request, createMockParams('campaign_123'));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details.name).toBeDefined();
    });

    it('returns 400 for invalid tone enum value', async () => {
      // Execute
      const request = createMockPatchRequest({ tone: 'aggressive' });
      const response = await PATCH(request, createMockParams('campaign_123'));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details.tone).toBeDefined();
    });

    it('returns 400 for invalid cta enum value', async () => {
      // Execute
      const request = createMockPatchRequest({ cta: 'buy_now' });
      const response = await PATCH(request, createMockParams('campaign_123'));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details.cta).toBeDefined();
    });

    it('returns 400 for invalid calendarLink URL', async () => {
      // Execute
      const request = createMockPatchRequest({ calendarLink: 'not-a-url' });
      const response = await PATCH(request, createMockParams('campaign_123'));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details.calendarLink).toBeDefined();
    });

    it('returns 400 for invalid qualificationRules JSON', async () => {
      // Execute
      const request = createMockPatchRequest({
        qualificationRules: 'not valid json',
      });
      const response = await PATCH(request, createMockParams('campaign_123'));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details.qualificationRules).toBeDefined();
    });

    it('returns 400 for invalid autoApprove type', async () => {
      // Execute
      const request = createMockPatchRequest({ autoApprove: 'yes' });
      const response = await PATCH(request, createMockParams('campaign_123'));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details.autoApprove).toBeDefined();
    });
  });

  describe('Database errors', () => {
    it('returns 500 for database select errors', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      setupDbSelectFailure(new Error('Connection refused'));

      // Execute
      const request = createMockPatchRequest({ name: 'Updated' });
      const response = await PATCH(request, createMockParams('campaign_123'));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to update campaign' });
    });

    it('returns 500 for database update errors', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      setupDbSelectSuccess(createMockCampaign());
      setupDbUpdateFailure(new Error('Update failed'));

      // Execute
      const request = createMockPatchRequest({ name: 'Updated' });
      const response = await PATCH(request, createMockParams('campaign_123'));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to update campaign' });
    });
  });
});

describe('DELETE /api/campaigns/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authenticated requests - Happy path', () => {
    it('deletes campaign and returns 204', async () => {
      // Setup
      const userId = 'user_123';
      const campaignId = 'campaign_123';
      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);
      setupDbSelectSuccess(createMockCampaign({ id: campaignId, userId }));
      setupDbDeleteSuccess();

      // Execute
      const request = createMockDeleteRequest();
      const response = await DELETE(request, createMockParams(campaignId));

      // Assert
      expect(response.status).toBe(204);
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('returns empty body for successful deletion', async () => {
      // Setup
      const userId = 'user_123';
      const campaignId = 'campaign_123';
      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);
      setupDbSelectSuccess(createMockCampaign({ id: campaignId, userId }));
      setupDbDeleteSuccess();

      // Execute
      const request = createMockDeleteRequest();
      const response = await DELETE(request, createMockParams(campaignId));

      // Assert - 204 responses should have no body
      expect(response.status).toBe(204);
      const text = await response.text();
      expect(text).toBe('');
    });
  });

  describe('Unauthenticated requests', () => {
    it('returns 401 for unauthenticated user', async () => {
      // Setup: no authenticated user
      mockAuth.mockResolvedValue(createMockAuthResponse(null) as never);

      // Execute
      const request = createMockDeleteRequest();
      const response = await DELETE(request, createMockParams('campaign_123'));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
      expect(mockDb.select).not.toHaveBeenCalled();
      expect(mockDb.delete).not.toHaveBeenCalled();
    });
  });

  describe('Campaign not found or not owned', () => {
    it('returns 404 when campaign does not exist', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      setupDbSelectSuccess(null);

      // Execute
      const request = createMockDeleteRequest();
      const response = await DELETE(
        request,
        createMockParams('nonexistent_campaign')
      );
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Campaign not found' });
      expect(mockDb.delete).not.toHaveBeenCalled();
    });

    it('returns 404 when campaign belongs to another user', async () => {
      // Setup - campaign exists but belongs to different user
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      setupDbSelectSuccess(null); // Owner check returns empty

      // Execute
      const request = createMockDeleteRequest();
      const response = await DELETE(
        request,
        createMockParams('other_user_campaign')
      );
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Campaign not found' });
      expect(mockDb.delete).not.toHaveBeenCalled();
    });
  });

  describe('Database errors', () => {
    it('returns 500 for database select errors', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      setupDbSelectFailure(new Error('Connection refused'));

      // Execute
      const request = createMockDeleteRequest();
      const response = await DELETE(request, createMockParams('campaign_123'));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to delete campaign' });
    });

    it('returns 500 for database delete errors', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      setupDbSelectSuccess(createMockCampaign());
      setupDbDeleteFailure(new Error('Delete failed'));

      // Execute
      const request = createMockDeleteRequest();
      const response = await DELETE(request, createMockParams('campaign_123'));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to delete campaign' });
    });
  });
});
