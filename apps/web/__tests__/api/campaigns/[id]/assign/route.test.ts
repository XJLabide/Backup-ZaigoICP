/**
 * Integration tests for POST /api/campaigns/[id]/assign
 *
 * Tests bulk lead assignment endpoint behavior:
 * - Bulk-assigns multiple leads to a campaign
 * - Returns 401 for unauthenticated requests
 * - Returns 404 if campaign not owned by user
 * - Returns 400 if >100 leads requested
 * - Returns 400 if some leadIds are not owned by user (partial ownership case)
 * - Updates in transaction (atomic)
 * - Emits lead/qualified events for newly assigned only
 * - Returns count of assigned/skipped leads
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
  inArray: vi.fn((field, values) => ({ field, values, type: 'inArray' })),
  sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
    sql: strings.join('?'),
    values,
    type: 'sql',
  })),
}));

// Mock @/lib/db
vi.mock('@/lib/db', () => {
  const mockDbModule = {
    db: {
      select: vi.fn(),
      update: vi.fn(),
    },
    leads: {
      id: 'id',
      userId: 'user_id',
      campaignId: 'campaign_id',
      status: 'status',
      updatedAt: 'updated_at',
    },
    campaigns: {
      id: 'id',
      userId: 'user_id',
      totalLeads: 'total_leads',
      updatedAt: 'updated_at',
    },
    actions: {
      id: 'id',
      leadId: 'lead_id',
      campaignId: 'campaign_id',
      status: 'status',
    },
  };
  return mockDbModule;
});

// Mock @/lib/inngest
vi.mock('@/lib/inngest', () => ({
  inngest: {
    send: vi.fn(),
  },
}));

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { inngest } from '@/lib/inngest';
import { POST } from '@/app/api/campaigns/[id]/assign/route';

const mockAuth = vi.mocked(auth);
const mockDb = vi.mocked(db);
const mockInngest = vi.mocked(inngest);

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
function createMockPostRequest(campaignId: string, body: unknown): Request {
  return new Request(
    `http://localhost:3000/api/campaigns/${campaignId}/assign`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
}

/**
 * Helper to create mock params (Next.js 15 async params)
 */
function createMockParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

/**
 * Helper to create mock campaign object
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
 * Setup mock db.select for bulk assignment flow:
 * Call 1: campaign lookup
 * Call 2: leads lookup (bulk)
 * Call 3 (optional): pending actions lookup
 */
function setupDbSelectMocks(
  campaign: Record<string, unknown> | null,
  ownedLeads: Array<{ id: string; campaignId: string | null }>,
  pendingActions: Array<{ leadId: string }> = []
) {
  let selectCallCount = 0;
  mockDb.select.mockImplementation(() => {
    selectCallCount++;
    const currentCall = selectCallCount;

    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          if (currentCall === 1) {
            // Campaign lookup
            return Promise.resolve(campaign ? [campaign] : []);
          } else if (currentCall === 2) {
            // Leads lookup (bulk)
            return Promise.resolve(ownedLeads);
          } else {
            // Pending actions lookup
            return Promise.resolve(pendingActions);
          }
        }),
      }),
    } as unknown as ReturnType<typeof mockDb.select>;
  });
}

/**
 * Setup mock db.update
 */
function setupDbUpdateMocks() {
  mockDb.update.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  } as unknown as ReturnType<typeof mockDb.update>);
}

describe('POST /api/campaigns/[id]/assign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authenticated requests - Happy path', () => {
    it('bulk-assigns multiple leads to campaign', async () => {
      // Setup
      const userId = 'user_123';
      const campaignId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const leadIds = [
        'b1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'c1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'd1b2c3d4-e5f6-7890-abcd-ef1234567890',
      ];

      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);

      const campaign = createMockCampaign({ id: campaignId, userId });
      const ownedLeads = leadIds.map((id) => ({ id, campaignId: null }));
      setupDbSelectMocks(campaign, ownedLeads);
      setupDbUpdateMocks();
      mockInngest.send.mockResolvedValue({ ids: ['evt_1', 'evt_2', 'evt_3'] } as never);

      // Execute
      const request = createMockPostRequest(campaignId, { leadIds });
      const response = await POST(request, createMockParams(campaignId));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.assignedCount).toBe(3);
      expect(data.skippedCount).toBe(0);
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockInngest.send).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'lead/qualified',
            data: expect.objectContaining({
              campaignId,
              userId,
            }),
          }),
        ])
      );
    });

    it('skips leads already assigned to the same campaign', async () => {
      // Setup
      const userId = 'user_123';
      const campaignId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const leadIds = [
        'b1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'c1b2c3d4-e5f6-7890-abcd-ef1234567890',
      ];

      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);

      const campaign = createMockCampaign({ id: campaignId, userId });
      // One lead already assigned to this campaign, one not assigned
      const ownedLeads = [
        { id: leadIds[0], campaignId: campaignId }, // Already assigned
        { id: leadIds[1], campaignId: null }, // Not assigned
      ];
      const pendingActions = [{ leadId: leadIds[0] }]; // Lead 0 has pending action
      setupDbSelectMocks(campaign, ownedLeads, pendingActions);
      setupDbUpdateMocks();
      mockInngest.send.mockResolvedValue({ ids: ['evt_1'] } as never);

      // Execute
      const request = createMockPostRequest(campaignId, { leadIds });
      const response = await POST(request, createMockParams(campaignId));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.assignedCount).toBe(1);
      expect(data.skippedCount).toBe(1);
    });

    it('emits events for leads already assigned but without pending action', async () => {
      // Setup
      const userId = 'user_123';
      const campaignId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const leadIds = [
        'b1b2c3d4-e5f6-7890-abcd-ef1234567890',
      ];

      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);

      const campaign = createMockCampaign({ id: campaignId, userId });
      // Lead already assigned but no pending action
      const ownedLeads = [{ id: leadIds[0], campaignId: campaignId }];
      const pendingActions: Array<{ leadId: string }> = []; // No pending actions
      setupDbSelectMocks(campaign, ownedLeads, pendingActions);
      setupDbUpdateMocks();
      mockInngest.send.mockResolvedValue({ ids: ['evt_1'] } as never);

      // Execute
      const request = createMockPostRequest(campaignId, { leadIds });
      const response = await POST(request, createMockParams(campaignId));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.assignedCount).toBe(0);
      expect(data.skippedCount).toBe(1);
      // Event should still be emitted since no pending action
      expect(mockInngest.send).toHaveBeenCalled();
    });

    it('handles reassignment from other campaigns', async () => {
      // Setup
      const userId = 'user_123';
      const campaignId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const oldCampaignId = 'old-camp-id-e5f6-7890-abcd-ef1234567890';
      const leadIds = [
        'b1b2c3d4-e5f6-7890-abcd-ef1234567890',
      ];

      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);

      const campaign = createMockCampaign({ id: campaignId, userId });
      // Lead previously assigned to different campaign
      const ownedLeads = [{ id: leadIds[0], campaignId: oldCampaignId }];
      setupDbSelectMocks(campaign, ownedLeads);
      setupDbUpdateMocks();
      mockInngest.send.mockResolvedValue({ ids: ['evt_1'] } as never);

      // Execute
      const request = createMockPostRequest(campaignId, { leadIds });
      const response = await POST(request, createMockParams(campaignId));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.assignedCount).toBe(1);
      // Should update both old and new campaign totalLeads
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('returns early when all leads already assigned with pending actions', async () => {
      // Setup
      const userId = 'user_123';
      const campaignId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const leadIds = [
        'b1b2c3d4-e5f6-7890-abcd-ef1234567890',
      ];

      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);

      const campaign = createMockCampaign({ id: campaignId, userId });
      const ownedLeads = [{ id: leadIds[0], campaignId: campaignId }];
      const pendingActions = [{ leadId: leadIds[0] }];
      setupDbSelectMocks(campaign, ownedLeads, pendingActions);

      // Execute
      const request = createMockPostRequest(campaignId, { leadIds });
      const response = await POST(request, createMockParams(campaignId));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.assignedCount).toBe(0);
      expect(data.skippedCount).toBe(1);
      expect(mockInngest.send).not.toHaveBeenCalled();
    });
  });

  describe('Unauthenticated requests', () => {
    it('returns 401 for unauthenticated user', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse(null) as never);

      // Execute
      const request = createMockPostRequest('campaign_123', {
        leadIds: ['a1b2c3d4-e5f6-7890-abcd-ef1234567890'],
      });
      const response = await POST(request, createMockParams('campaign_123'));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
      expect(mockDb.select).not.toHaveBeenCalled();
    });
  });

  describe('Campaign not found or not owned', () => {
    it('returns 404 when campaign does not exist', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      setupDbSelectMocks(null, []);

      // Execute
      const request = createMockPostRequest('nonexistent', {
        leadIds: ['a1b2c3d4-e5f6-7890-abcd-ef1234567890'],
      });
      const response = await POST(request, createMockParams('nonexistent'));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Campaign not found' });
    });

    it('returns 404 when campaign belongs to another user', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      setupDbSelectMocks(null, []); // No campaign found for this user

      // Execute
      const request = createMockPostRequest('other_user_campaign', {
        leadIds: ['a1b2c3d4-e5f6-7890-abcd-ef1234567890'],
      });
      const response = await POST(
        request,
        createMockParams('other_user_campaign')
      );
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Campaign not found' });
    });
  });

  describe('Partial ownership validation', () => {
    it('returns 400 if some leadIds are not owned by user', async () => {
      // Setup
      const userId = 'user_123';
      const campaignId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const ownedLeadId = 'b1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const notOwnedLeadId = 'c1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const leadIds = [ownedLeadId, notOwnedLeadId];

      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);

      const campaign = createMockCampaign({ id: campaignId, userId });
      // Only one lead is owned by user
      const ownedLeads = [{ id: ownedLeadId, campaignId: null }];
      setupDbSelectMocks(campaign, ownedLeads);

      // Execute
      const request = createMockPostRequest(campaignId, { leadIds });
      const response = await POST(request, createMockParams(campaignId));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Some leads not found or not owned by user');
      expect(data.details.invalidLeadIds).toContain(notOwnedLeadId);
    });

    it('returns 400 with all invalid lead IDs listed', async () => {
      // Setup
      const userId = 'user_123';
      const campaignId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const notOwnedLeadId1 = 'b1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const notOwnedLeadId2 = 'c1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const leadIds = [notOwnedLeadId1, notOwnedLeadId2];

      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);

      const campaign = createMockCampaign({ id: campaignId, userId });
      // No leads owned by user
      const ownedLeads: Array<{ id: string; campaignId: string | null }> = [];
      setupDbSelectMocks(campaign, ownedLeads);

      // Execute
      const request = createMockPostRequest(campaignId, { leadIds });
      const response = await POST(request, createMockParams(campaignId));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Some leads not found or not owned by user');
      expect(data.details.invalidLeadIds).toHaveLength(2);
      expect(data.details.invalidLeadIds).toContain(notOwnedLeadId1);
      expect(data.details.invalidLeadIds).toContain(notOwnedLeadId2);
    });
  });

  describe('Validation errors', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
    });

    it('returns 400 when leadIds is missing', async () => {
      // Execute
      const request = createMockPostRequest('campaign_123', {});
      const response = await POST(request, createMockParams('campaign_123'));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details.leadIds).toBeDefined();
    });

    it('returns 400 when leadIds is empty array', async () => {
      // Execute
      const request = createMockPostRequest('campaign_123', { leadIds: [] });
      const response = await POST(request, createMockParams('campaign_123'));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details.leadIds).toBeDefined();
    });

    it('returns 400 when >100 leads requested', async () => {
      // Generate 101 valid UUIDs
      const leadIds = Array.from(
        { length: 101 },
        (_, i) =>
          `a1b2c3d4-e5f6-7890-abcd-${i.toString().padStart(12, '0')}`
      );

      // Execute
      const request = createMockPostRequest('campaign_123', { leadIds });
      const response = await POST(request, createMockParams('campaign_123'));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details.leadIds).toBeDefined();
    });

    it('returns 400 when leadIds contains invalid UUID', async () => {
      // Execute
      const request = createMockPostRequest('campaign_123', {
        leadIds: ['not-a-valid-uuid'],
      });
      const response = await POST(request, createMockParams('campaign_123'));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details.leadIds).toBeDefined();
    });

    it('accepts exactly 100 leads', async () => {
      // Generate exactly 100 valid UUIDs
      const leadIds = Array.from(
        { length: 100 },
        (_, i) =>
          `a1b2c3d4-e5f6-7890-abcd-${i.toString().padStart(12, '0')}`
      );

      const userId = 'user_123';
      const campaignId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);

      const campaign = createMockCampaign({ id: campaignId, userId });
      const ownedLeads = leadIds.map((id) => ({ id, campaignId: null }));
      setupDbSelectMocks(campaign, ownedLeads);
      setupDbUpdateMocks();
      mockInngest.send.mockResolvedValue({ ids: [] } as never);

      // Execute
      const request = createMockPostRequest(campaignId, { leadIds });
      const response = await POST(request, createMockParams(campaignId));
      const data = await response.json();

      // Assert - should not be a validation error
      expect(response.status).toBe(200);
      expect(data.assignedCount).toBe(100);
    });
  });

  describe('Database errors', () => {
    it('returns 500 for database query errors', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('Connection refused')),
        }),
      } as unknown as ReturnType<typeof mockDb.select>);

      // Execute
      const request = createMockPostRequest('campaign_123', {
        leadIds: ['a1b2c3d4-e5f6-7890-abcd-ef1234567890'],
      });
      const response = await POST(request, createMockParams('campaign_123'));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to assign leads to campaign' });
    });

    it('returns 500 for database update errors', async () => {
      // Setup
      const userId = 'user_123';
      const campaignId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const leadIds = ['b1b2c3d4-e5f6-7890-abcd-ef1234567890'];

      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);

      const campaign = createMockCampaign({ id: campaignId, userId });
      const ownedLeads = leadIds.map((id) => ({ id, campaignId: null }));
      setupDbSelectMocks(campaign, ownedLeads);

      // Update fails
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('Update failed')),
        }),
      } as unknown as ReturnType<typeof mockDb.update>);

      // Execute
      const request = createMockPostRequest(campaignId, { leadIds });
      const response = await POST(request, createMockParams(campaignId));
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to assign leads to campaign' });
    });
  });
});
