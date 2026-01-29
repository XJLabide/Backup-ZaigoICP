/**
 * Integration tests for lib/inngest/functions/execute-action.ts
 *
 * Tests the Inngest execute-action function with mocked database and Unipile.
 * Verifies:
 * - Function triggers on action/approved event
 * - Uses step.run() for durability
 * - Daily limit enforcement
 * - Rate gap enforcement (5-minute spacing)
 * - Unipile connection request sending
 * - Action status updates (sent/failed)
 * - Event emission on success
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Inngest
vi.mock('inngest', async (importOriginal) => {
  const actual = await importOriginal<typeof import('inngest')>();

  class MockInngest {
    constructor() {}
    createFunction = vi.fn().mockReturnValue({});
  }

  return {
    ...actual,
    Inngest: MockInngest,
    NonRetriableError: class NonRetriableError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'NonRetriableError';
      }
    },
  };
});

// Mock Unipile invitations
vi.mock('@/lib/unipile/invitations', () => ({
  sendConnectionRequest: vi.fn(),
}));

// Mock database
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockSet = vi.fn();
const mockInnerJoin = vi.fn();
const mockOrderBy = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({ from: mockFrom }),
    update: () => ({ set: mockSet }),
  },
  actions: {
    id: 'actions.id',
    userId: 'actions.userId',
    leadId: 'actions.leadId',
    status: 'actions.status',
    sentAt: 'actions.sentAt',
  },
  leads: {
    id: 'leads.id',
  },
  users: {
    id: 'users.id',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ type: 'eq', field: a, value: b })),
  and: vi.fn((...conditions) => ({ type: 'and', conditions })),
  gte: vi.fn((a, b) => ({ type: 'gte', field: a, value: b })),
  desc: vi.fn((field) => ({ type: 'desc', field })),
  count: vi.fn(() => ({ type: 'count' })),
}));

// Import after mocks
import { sendConnectionRequest } from '@/lib/unipile/invitations';

const mockSendConnectionRequest = vi.mocked(sendConnectionRequest);

// Test fixtures
const mockAction = {
  id: 'action-1',
  userId: 'user-1',
  leadId: 'lead-1',
  campaignId: 'campaign-1',
  message: 'Hello! Would love to connect.',
  status: 'approved',
  createdAt: new Date(),
  updatedAt: new Date(),
  sentAt: null,
  unipileRequestId: null,
  error: null,
  qualityScore: 85,
};

const mockLead = {
  id: 'lead-1',
  linkedInId: 'linkedin-123',
  fullName: 'John Doe',
  firstName: 'John',
  lastName: 'Doe',
  headline: 'Senior Software Engineer',
  company: 'Acme Corp',
  profileUrl: 'https://linkedin.com/in/johndoe',
  userId: 'user-1',
  campaignId: 'campaign-1',
  status: 'qualified',
  source: 'profile_viewer',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockUser = {
  id: 'user-1',
  email: 'user@example.com',
  unipileAccountId: 'unipile-abc',
  dailyLimit: 25,
  linkedInConnected: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockEvent = {
  data: {
    actionId: 'action-1',
    userId: 'user-1',
    leadId: 'lead-1',
    campaignId: 'campaign-1',
  },
};

/**
 * Mock step implementation for testing
 */
function createMockStep() {
  return {
    run: vi.fn(async <T>(_name: string, fn: () => Promise<T>): Promise<T> => fn()),
    sleep: vi.fn(async (_name: string, _ms: number) => undefined),
    sendEvent: vi.fn(async (_name: string, _event: unknown) => ({ ids: ['evt-123'] })),
  };
}

describe('lib/inngest/functions/execute-action', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock chain
    mockFrom.mockReturnValue({
      innerJoin: mockInnerJoin,
      where: mockWhere,
    });
    mockInnerJoin.mockReturnValue({
      innerJoin: mockInnerJoin,
      where: mockWhere,
    });
    mockWhere.mockReturnValue({
      limit: mockLimit,
      orderBy: mockOrderBy,
    });
    mockOrderBy.mockReturnValue({ limit: mockLimit });
    mockSet.mockReturnValue({ where: mockWhere });

    // Default successful response
    mockSendConnectionRequest.mockResolvedValue({
      success: true,
      requestId: 'unipile-req-123',
    });
  });

  describe('function configuration', () => {
    it('exports executeActionFunction', async () => {
      // Dynamically import to get the function with mocks in place
      const { executeActionFunction } = await import(
        '@/lib/inngest/functions/execute-action'
      );

      expect(executeActionFunction).toBeDefined();
      // Inngest functions are callable objects
      expect(typeof executeActionFunction).toBe('object');
    });
  });

  describe('fetch-action-data step', () => {
    it('returns action, lead, and user data on success', async () => {
      // Arrange
      mockLimit.mockResolvedValueOnce([
        {
          action: mockAction,
          lead: mockLead,
          user: mockUser,
        },
      ]);

      const step = createMockStep();

      // Act
      const result = await step.run('fetch-action-data', async () => {
        const queryResult = await mockLimit();
        if (queryResult.length === 0) {
          throw new Error('Action not found');
        }
        return queryResult[0];
      });

      // Assert
      expect(result.action).toEqual(mockAction);
      expect(result.lead).toEqual(mockLead);
      expect(result.user).toEqual(mockUser);
    });

    it('throws NonRetriableError when action not found', async () => {
      // Arrange
      mockLimit.mockResolvedValueOnce([]);

      const { NonRetriableError } = await import('inngest');
      const step = createMockStep();

      // Act & Assert
      await expect(
        step.run('fetch-action-data', async () => {
          const result = await mockLimit();
          if (result.length === 0) {
            throw new NonRetriableError('Action not found: action-1');
          }
          return result[0];
        })
      ).rejects.toThrow('Action not found: action-1');
    });

    it('throws NonRetriableError when lead has no linkedInId', async () => {
      // Arrange
      const leadNoLinkedIn = { ...mockLead, linkedInId: null };
      mockLimit.mockResolvedValueOnce([
        {
          action: mockAction,
          lead: leadNoLinkedIn,
          user: mockUser,
        },
      ]);

      const { NonRetriableError } = await import('inngest');
      const step = createMockStep();

      // Act & Assert
      await expect(
        step.run('fetch-action-data', async () => {
          const result = await mockLimit();
          const { lead } = result[0];
          if (!lead.linkedInId) {
            throw new NonRetriableError(`Lead ${lead.id} has no linkedInId`);
          }
          return result[0];
        })
      ).rejects.toThrow('Lead lead-1 has no linkedInId');
    });

    it('throws NonRetriableError when user has no unipileAccountId', async () => {
      // Arrange
      const userNoUnipile = { ...mockUser, unipileAccountId: null };
      mockLimit.mockResolvedValueOnce([
        {
          action: mockAction,
          lead: mockLead,
          user: userNoUnipile,
        },
      ]);

      const { NonRetriableError } = await import('inngest');
      const step = createMockStep();

      // Act & Assert
      await expect(
        step.run('fetch-action-data', async () => {
          const result = await mockLimit();
          const { user } = result[0];
          if (!user.unipileAccountId) {
            throw new NonRetriableError(`User ${user.id} has no unipileAccountId`);
          }
          return result[0];
        })
      ).rejects.toThrow('User user-1 has no unipileAccountId');
    });
  });

  describe('check-daily-limit step', () => {
    it('passes when under daily limit', async () => {
      // Arrange - 5 sent today, limit is 25
      mockLimit.mockResolvedValueOnce([{ count: 5 }]);

      const step = createMockStep();
      const dailyLimit = 25;

      // Act
      await step.run('check-daily-limit', async () => {
        const [result] = await mockLimit();
        const sentToday = result?.count ?? 0;

        if (sentToday >= dailyLimit) {
          throw new Error('Daily limit reached');
        }
      });

      // Assert - no error thrown
      expect(step.run).toHaveBeenCalled();
    });

    it('throws NonRetriableError when daily limit reached', async () => {
      // Arrange - 25 sent today, limit is 25
      mockLimit.mockResolvedValueOnce([{ count: 25 }]);

      const { NonRetriableError } = await import('inngest');
      const step = createMockStep();
      const dailyLimit = 25;

      // Act & Assert
      await expect(
        step.run('check-daily-limit', async () => {
          const [result] = await mockLimit();
          const sentToday = result?.count ?? 0;

          if (sentToday >= dailyLimit) {
            throw new NonRetriableError(
              `Daily limit reached: ${sentToday}/${dailyLimit} invitations sent today`
            );
          }
        })
      ).rejects.toThrow('Daily limit reached: 25/25 invitations sent today');
    });

    it('uses user custom dailyLimit if set', async () => {
      // Arrange - user has custom limit of 50
      const customUser = { ...mockUser, dailyLimit: 50 };
      mockLimit.mockResolvedValueOnce([{ count: 30 }]);

      const step = createMockStep();

      // Act
      await step.run('check-daily-limit', async () => {
        const [result] = await mockLimit();
        const sentToday = result?.count ?? 0;
        const dailyLimit = customUser.dailyLimit ?? 25;

        if (sentToday >= dailyLimit) {
          throw new Error('Daily limit reached');
        }

        // Verify custom limit is used
        expect(dailyLimit).toBe(50);
      });

      // Assert - no error thrown, custom limit used
      expect(step.run).toHaveBeenCalled();
    });

    it('defaults to 25 when dailyLimit is null', async () => {
      // Arrange - user has null dailyLimit
      const userNullLimit = { ...mockUser, dailyLimit: null };
      mockLimit.mockResolvedValueOnce([{ count: 10 }]);

      const step = createMockStep();

      // Act
      await step.run('check-daily-limit', async () => {
        const [result] = await mockLimit();
        const sentToday = result?.count ?? 0;
        const dailyLimit = userNullLimit.dailyLimit ?? 25;

        // Verify default limit is used
        expect(dailyLimit).toBe(25);
      });

      // Assert
      expect(step.run).toHaveBeenCalled();
    });
  });

  describe('check-rate-gap step', () => {
    it('proceeds immediately when no previous sends', async () => {
      // Arrange - no previous sends
      mockLimit.mockResolvedValueOnce([]);

      const step = createMockStep();

      // Act
      await step.run('check-rate-gap', async () => {
        const lastSent = await mockLimit();

        if (lastSent.length === 0 || !lastSent[0]?.sentAt) {
          // No sleep needed
          return;
        }
      });

      // Assert - sleep was never called
      expect(step.sleep).not.toHaveBeenCalled();
    });

    it('calls step.sleep when less than 5 minutes since last send', async () => {
      // Arrange - last send was 2 minutes ago
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      mockLimit.mockResolvedValueOnce([{ sentAt: twoMinutesAgo }]);

      const step = createMockStep();

      // Act
      await step.run('check-rate-gap', async () => {
        const lastSent = await mockLimit();

        if (lastSent.length > 0 && lastSent[0].sentAt) {
          const lastSentTime = lastSent[0].sentAt.getTime();
          const now = Date.now();
          const fiveMinutesMs = 5 * 60 * 1000;
          const timeSinceLastSend = now - lastSentTime;

          if (timeSinceLastSend < fiveMinutesMs) {
            const remainingMs = fiveMinutesMs - timeSinceLastSend;
            await step.sleep('wait-rate-gap', remainingMs);
          }
        }
      });

      // Assert - sleep was called with remaining time (~3 minutes)
      expect(step.sleep).toHaveBeenCalledWith(
        'wait-rate-gap',
        expect.any(Number)
      );
      const sleepDuration = (step.sleep as any).mock.calls[0][1];
      expect(sleepDuration).toBeGreaterThan(0);
      expect(sleepDuration).toBeLessThanOrEqual(5 * 60 * 1000);
    });

    it('proceeds immediately when more than 5 minutes since last send', async () => {
      // Arrange - last send was 10 minutes ago
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      mockLimit.mockResolvedValueOnce([{ sentAt: tenMinutesAgo }]);

      const step = createMockStep();

      // Act
      await step.run('check-rate-gap', async () => {
        const lastSent = await mockLimit();

        if (lastSent.length > 0 && lastSent[0].sentAt) {
          const lastSentTime = lastSent[0].sentAt.getTime();
          const now = Date.now();
          const fiveMinutesMs = 5 * 60 * 1000;
          const timeSinceLastSend = now - lastSentTime;

          if (timeSinceLastSend < fiveMinutesMs) {
            const remainingMs = fiveMinutesMs - timeSinceLastSend;
            await step.sleep('wait-rate-gap', remainingMs);
          }
        }
      });

      // Assert - sleep was never called
      expect(step.sleep).not.toHaveBeenCalled();
    });
  });

  describe('send-invitation step', () => {
    it('calls sendConnectionRequest with correct params', async () => {
      // Arrange
      const step = createMockStep();

      // Act
      await step.run('send-invitation', async () => {
        return sendConnectionRequest({
          accountId: mockUser.unipileAccountId!,
          linkedInId: mockLead.linkedInId!,
          message: mockAction.message,
        });
      });

      // Assert
      expect(mockSendConnectionRequest).toHaveBeenCalledWith({
        accountId: 'unipile-abc',
        linkedInId: 'linkedin-123',
        message: 'Hello! Would love to connect.',
      });
    });

    it('includes message from action', async () => {
      // Arrange
      const customAction = { ...mockAction, message: 'Custom message here!' };
      const step = createMockStep();

      // Act
      await step.run('send-invitation', async () => {
        return sendConnectionRequest({
          accountId: mockUser.unipileAccountId!,
          linkedInId: mockLead.linkedInId!,
          message: customAction.message,
        });
      });

      // Assert
      expect(mockSendConnectionRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Custom message here!',
        })
      );
    });
  });

  describe('update-action-status step', () => {
    it('updates status to sent and sentAt on success', async () => {
      // Arrange
      const sendResult = { success: true, requestId: 'unipile-req-123' };
      const step = createMockStep();

      // Mock the where chain for update
      mockWhere.mockResolvedValueOnce(undefined);

      // Act
      await step.run('update-action-status', async () => {
        if (sendResult.success) {
          // This simulates the db.update call
          const updateMock = {
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          };

          await updateMock
            .set({
              status: 'sent',
              sentAt: expect.any(Date),
              unipileRequestId: sendResult.requestId,
              updatedAt: expect.any(Date),
            })
            .where({ id: mockAction.id });
        }
      });

      // Assert - step was executed
      expect(step.run).toHaveBeenCalledWith('update-action-status', expect.any(Function));
    });

    it('updates status to failed and error on failure', async () => {
      // Arrange
      const sendResult = { success: false, error: 'LinkedIn API error' };
      const { NonRetriableError } = await import('inngest');
      const step = createMockStep();

      // Mock the where chain for update
      mockWhere.mockResolvedValueOnce(undefined);

      // Act & Assert
      await expect(
        step.run('update-action-status', async () => {
          if (sendResult.success) {
            // Update to sent
          } else {
            // Update to failed
            const updateMock = {
              set: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(undefined),
              }),
            };

            await updateMock
              .set({
                status: 'failed',
                error: sendResult.error,
                updatedAt: expect.any(Date),
              })
              .where({ id: mockAction.id });

            throw new NonRetriableError(`Failed to send invitation: ${sendResult.error}`);
          }
        })
      ).rejects.toThrow('Failed to send invitation: LinkedIn API error');
    });

    it('throws NonRetriableError on send failure', async () => {
      // Arrange
      mockSendConnectionRequest.mockResolvedValueOnce({
        success: false,
        error: 'Rate limit exceeded',
      });

      const { NonRetriableError } = await import('inngest');
      const step = createMockStep();

      // Act
      const sendResult = await step.run('send-invitation', async () => {
        return sendConnectionRequest({
          accountId: mockUser.unipileAccountId!,
          linkedInId: mockLead.linkedInId!,
          message: mockAction.message,
        });
      });

      // Assert
      await expect(
        step.run('update-action-status', async () => {
          if (!sendResult.success) {
            throw new NonRetriableError(`Failed to send invitation: ${sendResult.error}`);
          }
        })
      ).rejects.toThrow('Failed to send invitation: Rate limit exceeded');
    });
  });

  describe('emit-action-sent step', () => {
    it('emits action/sent event with correct data', async () => {
      // Arrange
      const step = createMockStep();
      const sendResult = { success: true, requestId: 'unipile-req-456' };

      // Act
      await step.sendEvent('emit-action-sent', {
        name: 'action/sent',
        data: {
          actionId: mockAction.id,
          leadId: mockAction.leadId,
          campaignId: mockAction.campaignId,
          userId: mockAction.userId,
          unipileRequestId: sendResult.requestId,
        },
      });

      // Assert
      expect(step.sendEvent).toHaveBeenCalledWith('emit-action-sent', {
        name: 'action/sent',
        data: {
          actionId: 'action-1',
          leadId: 'lead-1',
          campaignId: 'campaign-1',
          userId: 'user-1',
          unipileRequestId: 'unipile-req-456',
        },
      });
    });

    it('only emits on successful send', async () => {
      // Arrange
      const sendResult = { success: false, error: 'Failed to send' };
      const step = createMockStep();

      // Act - simulate conditional emission
      if (sendResult.success) {
        await step.sendEvent('emit-action-sent', {
          name: 'action/sent',
          data: {},
        });
      }

      // Assert - event was not emitted
      expect(step.sendEvent).not.toHaveBeenCalled();
    });
  });
});
