/**
 * Unit tests for lib/unipile/webhook-handlers.ts
 *
 * Tests webhook event handlers for Unipile webhooks:
 * - handleAccountConnected: Updates user with unipileAccountId
 * - handleAccountDisconnected: Clears user's connection
 * - dispatchWebhookEvent: Routes to correct handler
 * - Idempotent operations for duplicate events
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock server-only
vi.mock('server-only', () => ({}));

// Mock @/lib/db
vi.mock('@/lib/db', () => ({
  db: {
    update: vi.fn(),
  },
  users: {
    id: 'id',
    unipileAccountId: 'unipileAccountId',
    linkedInConnectedAt: 'linkedInConnectedAt',
    lastSyncError: 'lastSyncError',
    updatedAt: 'updatedAt',
  },
}));

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value })),
}));

import { db } from '@/lib/db';
import {
  handleAccountConnected,
  handleAccountDisconnected,
  dispatchWebhookEvent,
  AccountConnectedPayload,
  AccountDisconnectedPayload,
} from '@/lib/unipile/webhook-handlers';

const mockDb = vi.mocked(db);

describe('lib/unipile/webhook-handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleAccountConnected', () => {
    it('returns success when user is updated', async () => {
      // Setup
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 'user_123' }]),
          }),
        }),
      } as unknown as ReturnType<typeof mockDb.update>);

      const payload: AccountConnectedPayload = {
        event: 'account.connected',
        account_id: 'acc_123',
        name: 'user_123',
      };

      // Execute
      const result = await handleAccountConnected(payload);

      // Assert
      expect(result).toEqual({ success: true });
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('returns error when user not found', async () => {
      // Setup
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]), // Empty array = no user found
          }),
        }),
      } as unknown as ReturnType<typeof mockDb.update>);

      const payload: AccountConnectedPayload = {
        event: 'account.connected',
        account_id: 'acc_123',
        name: 'nonexistent_user',
      };

      // Execute
      const result = await handleAccountConnected(payload);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'User not found: nonexistent_user',
      });
    });

    it('returns error when name (userId) is missing', async () => {
      const payload = {
        event: 'account.connected',
        account_id: 'acc_123',
        name: '',
      } as AccountConnectedPayload;

      const result = await handleAccountConnected(payload);

      expect(result).toEqual({
        success: false,
        error: 'Missing required fields: name (userId) or account_id',
      });
    });

    it('returns error when account_id is missing', async () => {
      const payload = {
        event: 'account.connected',
        account_id: '',
        name: 'user_123',
      } as AccountConnectedPayload;

      const result = await handleAccountConnected(payload);

      expect(result).toEqual({
        success: false,
        error: 'Missing required fields: name (userId) or account_id',
      });
    });

    it('handles database errors gracefully', async () => {
      // Setup
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockRejectedValue(new Error('Connection refused')),
          }),
        }),
      } as unknown as ReturnType<typeof mockDb.update>);

      const payload: AccountConnectedPayload = {
        event: 'account.connected',
        account_id: 'acc_123',
        name: 'user_123',
      };

      // Execute
      const result = await handleAccountConnected(payload);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Connection refused',
      });
    });

    it('handles non-Error exceptions', async () => {
      // Setup
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockRejectedValue('String error'),
          }),
        }),
      } as unknown as ReturnType<typeof mockDb.update>);

      const payload: AccountConnectedPayload = {
        event: 'account.connected',
        account_id: 'acc_123',
        name: 'user_123',
      };

      // Execute
      const result = await handleAccountConnected(payload);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'String error',
      });
    });
  });

  describe('handleAccountDisconnected', () => {
    it('returns success when account is disconnected', async () => {
      // Setup
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as unknown as ReturnType<typeof mockDb.update>);

      const payload: AccountDisconnectedPayload = {
        event: 'account.disconnected',
        account_id: 'acc_123',
      };

      // Execute
      const result = await handleAccountDisconnected(payload);

      // Assert
      expect(result).toEqual({ success: true });
    });

    it('returns success even when account not found (idempotent)', async () => {
      // Setup - no rows affected is not an error
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as unknown as ReturnType<typeof mockDb.update>);

      const payload: AccountDisconnectedPayload = {
        event: 'account.disconnected',
        account_id: 'nonexistent_acc',
      };

      // Execute
      const result = await handleAccountDisconnected(payload);

      // Assert
      expect(result).toEqual({ success: true });
    });

    it('returns error when account_id is missing', async () => {
      const payload = {
        event: 'account.disconnected',
        account_id: '',
      } as AccountDisconnectedPayload;

      const result = await handleAccountDisconnected(payload);

      expect(result).toEqual({
        success: false,
        error: 'Missing required field: account_id',
      });
    });

    it('handles database errors gracefully', async () => {
      // Setup
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('Database timeout')),
        }),
      } as unknown as ReturnType<typeof mockDb.update>);

      const payload: AccountDisconnectedPayload = {
        event: 'account.disconnected',
        account_id: 'acc_123',
      };

      // Execute
      const result = await handleAccountDisconnected(payload);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Database timeout',
      });
    });
  });

  describe('dispatchWebhookEvent', () => {
    it('routes account.connected to handleAccountConnected', async () => {
      // Setup
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 'user_123' }]),
          }),
        }),
      } as unknown as ReturnType<typeof mockDb.update>);

      const payload: AccountConnectedPayload = {
        event: 'account.connected',
        account_id: 'acc_123',
        name: 'user_123',
      };

      // Execute
      const result = await dispatchWebhookEvent(payload);

      // Assert
      expect(result).toEqual({ success: true });
    });

    it('routes account.disconnected to handleAccountDisconnected', async () => {
      // Setup
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as unknown as ReturnType<typeof mockDb.update>);

      const payload: AccountDisconnectedPayload = {
        event: 'account.disconnected',
        account_id: 'acc_123',
      };

      // Execute
      const result = await dispatchWebhookEvent(payload);

      // Assert
      expect(result).toEqual({ success: true });
    });

    it('returns success for unknown event types (prevents retry loops)', async () => {
      // Setup - spy on console.log
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const payload = {
        event: 'unknown.event',
        some_data: 'value',
      };

      // Execute
      const result = await dispatchWebhookEvent(payload);

      // Assert
      expect(result).toEqual({ success: true });
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"event":"webhook_unknown_event_type"')
      );

      consoleSpy.mockRestore();
    });

    it('logs unknown event types with metadata', async () => {
      // Setup
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const payload = {
        event: 'account.updated',
        data: 'some data',
      };

      // Execute
      await dispatchWebhookEvent(payload);

      // Assert
      expect(consoleSpy).toHaveBeenCalled();
      const logArg = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(logArg);
      expect(parsed.event).toBe('webhook_unknown_event_type');
      expect(parsed.eventType).toBe('account.updated');
      expect(parsed.timestamp).toBeDefined();

      consoleSpy.mockRestore();
    });
  });
});
