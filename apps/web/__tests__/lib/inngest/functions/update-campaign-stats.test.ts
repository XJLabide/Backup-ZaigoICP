import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/inngest/client', () => ({
  inngest: {
    createFunction(config: unknown, triggers: unknown, handler: Function) {
      return { config, triggers, handler };
    },
  },
}));

vi.mock('@/lib/db', () => {
  const mockWhere = vi.fn();
  const mockSet = vi.fn(() => ({
    where: mockWhere,
  }));

  return {
    db: {
      update: vi.fn(() => ({
        set: mockSet,
      })),
    },
    campaigns: {
      id: 'campaigns.id',
      totalSent: 'campaigns.totalSent',
      totalAccepted: 'campaigns.totalAccepted',
    },
  };
});

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ eq: [a, b] })),
  sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
    sql: strings,
    values,
  })),
}));

// Import after mocks
import { updateCampaignStatsFunction } from '@/lib/inngest/functions/update-campaign-stats';
import { db, campaigns } from '@/lib/db';
import { eq, sql } from 'drizzle-orm';

describe('update-campaign-stats', () => {
  const mockStep = {
    run: vi.fn((name: string, fn: () => Promise<unknown>) => fn()),
  };

  let mockSet: ReturnType<typeof vi.fn>;
  let mockWhere: ReturnType<typeof vi.fn>;
  let mockEq: ReturnType<typeof vi.fn>;
  let mockSql: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Get the mocked functions from the modules
    const dbModule = vi.mocked(db);
    mockSet = vi.fn(() => ({ where: mockWhere }));
    mockWhere = vi.fn();

    // Reset db.update to return our mocks
    vi.mocked(dbModule.update).mockReturnValue({
      set: mockSet,
    } as any);

    mockEq = vi.mocked(eq);
    mockSql = vi.mocked(sql);
  });

  it('exports updateCampaignStatsFunction', () => {
    expect(updateCampaignStatsFunction).toBeDefined();
    expect(typeof updateCampaignStatsFunction).toBe('object');
  });

  it('has correct function configuration', () => {
    const { config } = updateCampaignStatsFunction as {
      config: { id: string; retries: number };
    };
    expect(config.id).toBe('update-campaign-stats');
    expect(config.retries).toBe(3);
  });

  it('listens to correct event types', () => {
    const { triggers } = updateCampaignStatsFunction as {
      triggers: Array<{ event: string }>;
    };
    expect(triggers).toHaveLength(2);
    expect(triggers[0].event).toBe('action/sent');
    expect(triggers[1].event).toBe('invitation/accepted');
  });

  describe('action/sent event handling', () => {
    it('increments totalSent field', async () => {
      const { handler } = updateCampaignStatsFunction as { handler: Function };
      const mockEvent = {
        name: 'action/sent',
        data: {
          campaignId: 'campaign-1',
          actionId: 'action-1',
          userId: 'user-1',
          leadId: 'lead-1',
        },
      };

      await handler({ event: mockEvent, step: mockStep });

      expect(mockStep.run).toHaveBeenCalledWith('increment-stat', expect.any(Function));
      expect(db.update).toHaveBeenCalledWith(campaigns);
    });

    it('uses COALESCE for NULL safety on totalSent', async () => {
      const { handler } = updateCampaignStatsFunction as { handler: Function };
      const mockEvent = {
        name: 'action/sent',
        data: { campaignId: 'campaign-1' },
      };

      await handler({ event: mockEvent, step: mockStep });

      const setCall = mockSet.mock.calls[0][0];
      expect(setCall.totalSent).toBeDefined();
      expect(mockSql).toHaveBeenCalled();

      // Verify COALESCE is used in the SQL call
      const sqlCall = mockSql.mock.calls.find(call =>
        call[0][0]?.includes?.('COALESCE') ||
        (typeof call[0] === 'object' && call[0].raw?.[0]?.includes?.('COALESCE'))
      );
      expect(sqlCall).toBeDefined();
    });

    it('updates updatedAt timestamp on action/sent', async () => {
      const { handler } = updateCampaignStatsFunction as { handler: Function };
      const mockEvent = {
        name: 'action/sent',
        data: { campaignId: 'campaign-1' },
      };

      const beforeTime = new Date();
      await handler({ event: mockEvent, step: mockStep });
      const afterTime = new Date();

      const setCall = mockSet.mock.calls[0][0];
      expect(setCall.updatedAt).toBeDefined();
      expect(setCall.updatedAt instanceof Date).toBe(true);
      expect(setCall.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(setCall.updatedAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('filters by campaignId on action/sent', async () => {
      const { handler } = updateCampaignStatsFunction as { handler: Function };
      const mockEvent = {
        name: 'action/sent',
        data: { campaignId: 'campaign-123' },
      };

      await handler({ event: mockEvent, step: mockStep });

      expect(mockWhere).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith(campaigns.id, 'campaign-123');
    });

    it('returns success with correct field for action/sent', async () => {
      const { handler } = updateCampaignStatsFunction as { handler: Function };
      const mockEvent = {
        name: 'action/sent',
        data: { campaignId: 'campaign-1' },
      };

      const result = await handler({ event: mockEvent, step: mockStep });

      expect(result).toEqual({
        success: true,
        campaignId: 'campaign-1',
        field: 'totalSent',
      });
    });
  });

  describe('invitation/accepted event handling', () => {
    it('increments totalAccepted field', async () => {
      const { handler } = updateCampaignStatsFunction as { handler: Function };
      const mockEvent = {
        name: 'invitation/accepted',
        data: {
          campaignId: 'campaign-2',
          invitationId: 'invitation-1',
          userId: 'user-2',
          leadId: 'lead-2',
        },
      };

      await handler({ event: mockEvent, step: mockStep });

      expect(mockStep.run).toHaveBeenCalledWith('increment-stat', expect.any(Function));
      expect(db.update).toHaveBeenCalledWith(campaigns);
    });

    it('uses COALESCE for NULL safety on totalAccepted', async () => {
      const { handler } = updateCampaignStatsFunction as { handler: Function };
      const mockEvent = {
        name: 'invitation/accepted',
        data: { campaignId: 'campaign-2' },
      };

      await handler({ event: mockEvent, step: mockStep });

      const setCall = mockSet.mock.calls[0][0];
      expect(setCall.totalAccepted).toBeDefined();
      expect(mockSql).toHaveBeenCalled();

      // Verify COALESCE is used in the SQL call
      const sqlCall = mockSql.mock.calls.find(call =>
        call[0][0]?.includes?.('COALESCE') ||
        (typeof call[0] === 'object' && call[0].raw?.[0]?.includes?.('COALESCE'))
      );
      expect(sqlCall).toBeDefined();
    });

    it('updates updatedAt timestamp on invitation/accepted', async () => {
      const { handler } = updateCampaignStatsFunction as { handler: Function };
      const mockEvent = {
        name: 'invitation/accepted',
        data: { campaignId: 'campaign-2' },
      };

      const beforeTime = new Date();
      await handler({ event: mockEvent, step: mockStep });
      const afterTime = new Date();

      const setCall = mockSet.mock.calls[0][0];
      expect(setCall.updatedAt).toBeDefined();
      expect(setCall.updatedAt instanceof Date).toBe(true);
      expect(setCall.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(setCall.updatedAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('filters by campaignId on invitation/accepted', async () => {
      const { handler } = updateCampaignStatsFunction as { handler: Function };
      const mockEvent = {
        name: 'invitation/accepted',
        data: { campaignId: 'campaign-456' },
      };

      await handler({ event: mockEvent, step: mockStep });

      expect(mockWhere).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith(campaigns.id, 'campaign-456');
    });

    it('returns success with correct field for invitation/accepted', async () => {
      const { handler } = updateCampaignStatsFunction as { handler: Function };
      const mockEvent = {
        name: 'invitation/accepted',
        data: { campaignId: 'campaign-2' },
      };

      const result = await handler({ event: mockEvent, step: mockStep });

      expect(result).toEqual({
        success: true,
        campaignId: 'campaign-2',
        field: 'totalAccepted',
      });
    });
  });

  describe('field determination logic', () => {
    it('correctly maps action/sent to totalSent', async () => {
      const { handler } = updateCampaignStatsFunction as { handler: Function };
      const mockEvent = {
        name: 'action/sent',
        data: { campaignId: 'campaign-1' },
      };

      const result = await handler({ event: mockEvent, step: mockStep });

      expect(result.field).toBe('totalSent');
    });

    it('correctly maps invitation/accepted to totalAccepted', async () => {
      const { handler } = updateCampaignStatsFunction as { handler: Function };
      const mockEvent = {
        name: 'invitation/accepted',
        data: { campaignId: 'campaign-1' },
      };

      const result = await handler({ event: mockEvent, step: mockStep });

      expect(result.field).toBe('totalAccepted');
    });
  });
});
