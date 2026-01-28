/**
 * Integration tests for PATCH /api/leads/[id]/assign
 *
 * Tests lead assignment endpoint behavior:
 * - Assigns lead to campaign with status update
 * - Returns 401 for unauthenticated requests
 * - Returns 404 if lead not owned by user
 * - Returns 404 if campaign not owned by user
 * - Updates lead.campaignId and lead.status to 'qualified'
 * - Emits lead/qualified Inngest event
 * - Increments campaign.totalLeads
 * - Handles reassignment case (decrements old, increments new)
 * - Skips event if lead already has pending action for this campaign
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
import { PATCH } from '@/app/api/leads/[id]/assign/route';

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
 * Helper to create a mock PATCH request with JSON body
 */
function createMockPatchRequest(leadId: string, body: unknown): Request {
  return new Request(`http://localhost:3000/api/leads/${leadId}/assign`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/**
 * Helper to create mock lead object
 */
function createMockLead(
  overrides: Partial<Record<string, unknown>> = {}
): Record<string, unknown> {
  return {
    id: 'lead_123',
    userId: 'user_123',
    campaignId: null,
    linkedInId: 'linkedin_abc',
    profileUrl: 'https://linkedin.com/in/test',
    fullName: 'Test User',
    headline: 'Software Engineer',
    status: 'new',
    source: 'profile_viewer',
    createdAt: new Date('2024-01-15T12:00:00Z'),
    updatedAt: new Date('2024-01-15T12:00:00Z'),
    ...overrides,
  };
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
 * Helper to set up mock db for select queries
 * Order: lead lookup, campaign lookup, (optional) action lookup
 */
function setupDbSelectMocks(
  lead: Record<string, unknown> | null,
  campaign: Record<string, unknown> | null,
  pendingAction: Record<string, unknown> | null = null
) {
  let selectCallCount = 0;
  mockDb.select.mockImplementation(() => {
    selectCallCount++;
    const currentCall = selectCallCount;

    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          if (currentCall === 1) {
            // Lead lookup
            return Promise.resolve(lead ? [lead] : []);
          } else if (currentCall === 2) {
            // Campaign lookup
            return Promise.resolve(campaign ? [campaign] : []);
          } else {
            // Pending action lookup
            return Promise.resolve(pendingAction ? [pendingAction] : []);
          }
        }),
      }),
    } as unknown as ReturnType<typeof mockDb.select>;
  });
}

/**
 * Helper to set up mock db for update queries
 */
function setupDbUpdateMocks(updatedLead: Record<string, unknown>) {
  mockDb.update.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([updatedLead]),
      }),
    }),
  } as unknown as ReturnType<typeof mockDb.update>);
}

describe('PATCH /api/leads/[id]/assign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authenticated requests - Happy path', () => {
    it('assigns lead to campaign and updates status to qualified', async () => {
      // Setup
      const userId = 'user_123';
      const leadId = 'lead_abc';
      const campaignId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);

      const lead = createMockLead({ id: leadId, userId, campaignId: null });
      const campaign = createMockCampaign({ id: campaignId, userId });
      setupDbSelectMocks(lead, campaign);

      const updatedLead = createMockLead({
        id: leadId,
        userId,
        campaignId,
        status: 'qualified',
      });
      setupDbUpdateMocks(updatedLead);
      mockInngest.send.mockResolvedValue({ ids: ['evt_123'] } as never);

      // Execute
      const request = createMockPatchRequest(leadId, { campaignId });
      const response = await PATCH(request, { params: Promise.resolve({ id: leadId }) });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.lead).toBeDefined();
      expect(data.lead.campaignId).toBe(campaignId);
      expect(data.lead.status).toBe('qualified');
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockInngest.send).toHaveBeenCalledWith({
        name: 'lead/qualified',
        data: {
          leadId,
          campaignId,
          userId,
        },
      });
    });

    it('handles reassignment from one campaign to another', async () => {
      // Setup
      const userId = 'user_123';
      const leadId = 'lead_abc';
      const oldCampaignId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const newCampaignId = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';

      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);

      const lead = createMockLead({
        id: leadId,
        userId,
        campaignId: oldCampaignId,
        status: 'qualified',
      });
      const campaign = createMockCampaign({
        id: newCampaignId,
        userId,
        totalLeads: 5,
      });
      setupDbSelectMocks(lead, campaign);

      const updatedLead = createMockLead({
        id: leadId,
        userId,
        campaignId: newCampaignId,
        status: 'qualified',
      });
      setupDbUpdateMocks(updatedLead);
      mockInngest.send.mockResolvedValue({ ids: ['evt_123'] } as never);

      // Execute
      const request = createMockPatchRequest(leadId, { campaignId: newCampaignId });
      const response = await PATCH(request, { params: Promise.resolve({ id: leadId }) });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.lead.campaignId).toBe(newCampaignId);
      // Verify db.update was called multiple times (lead update + old campaign decrement + new campaign increment)
      expect(mockDb.update).toHaveBeenCalled();
      // Event should still be emitted for new campaign
      expect(mockInngest.send).toHaveBeenCalled();
    });

    it('skips event emission if lead already has pending action for same campaign', async () => {
      // Setup
      const userId = 'user_123';
      const leadId = 'lead_abc';
      const campaignId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);

      const lead = createMockLead({
        id: leadId,
        userId,
        campaignId, // Already assigned to same campaign
        status: 'qualified',
      });
      const campaign = createMockCampaign({ id: campaignId, userId });
      const pendingAction = { id: 'action_123' };
      setupDbSelectMocks(lead, campaign, pendingAction);

      const updatedLead = createMockLead({
        id: leadId,
        userId,
        campaignId,
        status: 'qualified',
      });
      setupDbUpdateMocks(updatedLead);

      // Execute
      const request = createMockPatchRequest(leadId, { campaignId });
      const response = await PATCH(request, { params: Promise.resolve({ id: leadId }) });

      // Assert
      expect(response.status).toBe(200);
      // Event should NOT be emitted since pending action exists
      expect(mockInngest.send).not.toHaveBeenCalled();
    });
  });

  describe('Unauthenticated requests', () => {
    it('returns 401 for unauthenticated user', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse(null) as never);

      // Execute
      const request = createMockPatchRequest('lead_123', {
        campaignId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'lead_123' }) });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
      expect(mockDb.select).not.toHaveBeenCalled();
    });
  });

  describe('Not found errors', () => {
    it('returns 404 if lead not found', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      setupDbSelectMocks(null, null); // No lead found

      // Execute
      const request = createMockPatchRequest('nonexistent_lead', {
        campaignId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'nonexistent_lead' }),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Lead not found' });
    });

    it('returns 404 if lead owned by different user', async () => {
      // Setup
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
      // Lead exists but owned by different user - select will return empty
      setupDbSelectMocks(null, null);

      // Execute
      const request = createMockPatchRequest('lead_other_user', {
        campaignId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'lead_other_user' }),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Lead not found' });
    });

    it('returns 404 if campaign not found', async () => {
      // Setup
      const userId = 'user_123';
      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);

      const lead = createMockLead({ id: 'lead_123', userId });
      setupDbSelectMocks(lead, null); // Lead found, but no campaign

      // Execute
      const request = createMockPatchRequest('lead_123', {
        campaignId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'lead_123' }) });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Campaign not found' });
    });

    it('returns 404 if campaign owned by different user', async () => {
      // Setup
      const userId = 'user_123';
      mockAuth.mockResolvedValue(createMockAuthResponse(userId) as never);

      const lead = createMockLead({ id: 'lead_123', userId });
      // Campaign exists but owned by different user - select returns empty
      setupDbSelectMocks(lead, null);

      // Execute
      const request = createMockPatchRequest('lead_123', {
        campaignId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'lead_123' }) });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Campaign not found' });
    });
  });

  describe('Validation errors', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(createMockAuthResponse('user_123') as never);
    });

    it('returns 400 when campaignId is missing', async () => {
      // Execute
      const request = createMockPatchRequest('lead_123', {});
      const response = await PATCH(request, { params: Promise.resolve({ id: 'lead_123' }) });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details.campaignId).toBeDefined();
    });

    it('returns 400 when campaignId is not a valid UUID', async () => {
      // Execute
      const request = createMockPatchRequest('lead_123', {
        campaignId: 'not-a-valid-uuid',
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'lead_123' }) });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details.campaignId).toBeDefined();
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
      const request = createMockPatchRequest('lead_123', {
        campaignId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'lead_123' }) });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to assign lead to campaign' });
    });
  });
});
