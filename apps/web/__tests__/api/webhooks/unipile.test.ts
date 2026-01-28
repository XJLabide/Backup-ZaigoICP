/**
 * Integration tests for POST /api/webhooks/unipile
 *
 * Tests webhook endpoint behavior:
 * - Returns 401 for invalid signature
 * - Handles account.connected event
 * - Handles account.disconnected event
 * - Ignores unknown event types with 200
 * - Duplicate webhook is idempotent
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock crypto (used for hashing and timing-safe compare)
vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('crypto')>();
  const mockedModule = {
    ...actual,
    createHash: vi.fn(() => ({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn().mockReturnValue('mock-hash-abc123'),
    })),
    timingSafeEqual: vi.fn((a: Buffer, b: Buffer) => a.toString() === b.toString()),
  };
  return {
    ...mockedModule,
    default: mockedModule,
  };
});

// Mock @/lib/db - use __mocks__ pattern for hoisting
vi.mock('@/lib/db', () => {
  const mockDbModule = {
    db: {
      insert: vi.fn(),
      select: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    processedWebhooks: {
      eventId: 'event_id',
      eventType: 'event_type',
      createdAt: 'created_at',
      processedAt: 'processed_at',
      payload: 'payload',
    },
    users: {
      id: 'id',
      unipileAccountId: 'unipile_account_id',
      linkedInConnectedAt: 'linkedin_connected_at',
      lastSyncError: 'last_sync_error',
      updatedAt: 'updated_at',
    },
  };
  return mockDbModule;
});

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value })),
  and: vi.fn((...conditions) => ({ type: 'and', conditions })),
  isNull: vi.fn((field) => ({ field, isNull: true })),
  lt: vi.fn((field, value) => ({ field, lt: value })),
}));

// Mock @/lib/unipile/webhook-verify
vi.mock('@/lib/unipile/webhook-verify', () => ({
  verifyWebhookSignature: vi.fn(),
}));

// Mock @/lib/unipile/webhook-handlers
vi.mock('@/lib/unipile/webhook-handlers', () => ({
  dispatchWebhookEvent: vi.fn(),
}));

import { db } from '@/lib/db';
import { verifyWebhookSignature } from '@/lib/unipile/webhook-verify';
import { dispatchWebhookEvent } from '@/lib/unipile/webhook-handlers';
import { POST } from '@/app/api/webhooks/unipile/route';

const mockDb = vi.mocked(db);
const mockVerify = vi.mocked(verifyWebhookSignature);
const mockDispatch = vi.mocked(dispatchWebhookEvent);

/**
 * Helper to create a mock Request with JSON body
 */
function createMockRequest(
  body: object | string,
  signature: string | null = 'test-webhook-secret'
): Request {
  const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
  const headers = new Headers({
    'Content-Type': 'application/json',
  });
  if (signature !== null) {
    headers.set('X-Unipile-Signature', signature);
  }
  return new Request('http://localhost:3000/api/webhooks/unipile', {
    method: 'POST',
    headers,
    body: bodyString,
  });
}

/**
 * Helper to set up mock db insert that succeeds
 */
function setupDbInsertSuccess() {
  mockDb.insert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      onConflictDoNothing: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ eventId: 'mock-hash-abc123' }]),
      }),
    }),
  } as unknown as ReturnType<typeof mockDb.insert>);
}

/**
 * Helper to set up mock db insert that returns empty (duplicate)
 */
function setupDbInsertDuplicate() {
  mockDb.insert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      onConflictDoNothing: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
  } as unknown as ReturnType<typeof mockDb.insert>);
}

/**
 * Helper to set up mock db select for checking existing event
 */
function setupDbSelectExisting(processedAt: Date | null, createdAt: Date = new Date()) {
  mockDb.select.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([{ processedAt, createdAt }]),
      }),
    }),
  } as unknown as ReturnType<typeof mockDb.select>);
}

/**
 * Helper to set up mock db update that succeeds
 */
function setupDbUpdateSuccess() {
  mockDb.update.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  } as unknown as ReturnType<typeof mockDb.update>);
}

describe('POST /api/webhooks/unipile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Signature verification', () => {
    it('returns 401 for invalid signature', async () => {
      // Setup: invalid signature
      mockVerify.mockReturnValue({
        valid: false,
        error: 'Invalid signature',
      });

      const request = createMockRequest(
        { event: 'account.connected', account_id: 'acc_123', name: 'user_123' },
        'wrong-signature'
      );

      // Execute
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Invalid signature' });
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('returns 401 for missing signature', async () => {
      // Setup: missing signature
      mockVerify.mockReturnValue({
        valid: false,
        error: 'Missing signature',
      });

      const request = createMockRequest(
        { event: 'account.connected', account_id: 'acc_123', name: 'user_123' },
        null
      );

      // Execute
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Missing signature' });
    });
  });

  describe('account.connected event', () => {
    it('handles account.connected event successfully', async () => {
      // Setup
      mockVerify.mockReturnValue({ valid: true });
      setupDbInsertSuccess();
      mockDispatch.mockResolvedValue({ success: true });
      setupDbUpdateSuccess();

      const request = createMockRequest({
        event: 'account.connected',
        account_id: 'acc_123',
        name: 'user_123',
      });

      // Execute
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toEqual({ received: true });
      expect(mockDispatch).toHaveBeenCalledWith({
        event: 'account.connected',
        account_id: 'acc_123',
        name: 'user_123',
      });
    });
  });

  describe('account.disconnected event', () => {
    it('handles account.disconnected event successfully', async () => {
      // Setup
      mockVerify.mockReturnValue({ valid: true });
      setupDbInsertSuccess();
      mockDispatch.mockResolvedValue({ success: true });
      setupDbUpdateSuccess();

      const request = createMockRequest({
        event: 'account.disconnected',
        account_id: 'acc_123',
      });

      // Execute
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toEqual({ received: true });
      expect(mockDispatch).toHaveBeenCalledWith({
        event: 'account.disconnected',
        account_id: 'acc_123',
      });
    });
  });

  describe('Unknown event types', () => {
    it('ignores unknown event types with 200', async () => {
      // Setup
      mockVerify.mockReturnValue({ valid: true });
      setupDbInsertSuccess();
      mockDispatch.mockResolvedValue({ success: true }); // dispatchWebhookEvent returns success for unknown
      setupDbUpdateSuccess();

      const request = createMockRequest({
        event: 'some.unknown.event',
        data: { foo: 'bar' },
      });

      // Execute
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toEqual({ received: true });
    });
  });

  describe('Idempotency', () => {
    it('duplicate webhook is idempotent - returns 200 without re-processing', async () => {
      // Setup: signature valid
      mockVerify.mockReturnValue({ valid: true });

      // First call: insert succeeds (not a duplicate)
      setupDbInsertSuccess();
      mockDispatch.mockResolvedValue({ success: true });
      setupDbUpdateSuccess();

      const payload = {
        event: 'account.connected',
        account_id: 'acc_123',
        name: 'user_123',
      };

      // First request
      const request1 = createMockRequest(payload);
      const response1 = await POST(request1);
      expect(response1.status).toBe(200);
      expect(mockDispatch).toHaveBeenCalledTimes(1);

      // Reset for second call
      vi.clearAllMocks();

      // Setup second call: insert fails (duplicate), select shows already processed
      mockVerify.mockReturnValue({ valid: true });
      setupDbInsertDuplicate();
      setupDbSelectExisting(new Date()); // Already processed

      // Second request with identical payload
      const request2 = createMockRequest(payload);
      const response2 = await POST(request2);
      const data2 = await response2.json();

      // Assert: returns 200 with duplicate flag, handler NOT called again
      expect(response2.status).toBe(200);
      expect(data2).toEqual({ received: true, duplicate: true });
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('returns 500 when event is in-progress by another worker', async () => {
      // Setup: signature valid
      mockVerify.mockReturnValue({ valid: true });

      // Insert fails, but record is in-progress (processedAt is null, not stale)
      setupDbInsertDuplicate();
      setupDbSelectExisting(null, new Date()); // In progress, not stale

      const request = createMockRequest({
        event: 'account.connected',
        account_id: 'acc_123',
        name: 'user_123',
      });

      // Execute
      const response = await POST(request);
      const data = await response.json();

      // Assert: returns 500 to trigger retry
      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Event in progress' });
    });
  });

  describe('Invalid payloads', () => {
    it('handles invalid JSON gracefully', async () => {
      mockVerify.mockReturnValue({ valid: true });

      const request = new Request('http://localhost:3000/api/webhooks/unipile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Unipile-Signature': 'test-webhook-secret',
        },
        body: 'not valid json{',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ received: true, error: 'Invalid JSON' });
    });

    it('handles non-object payload gracefully', async () => {
      mockVerify.mockReturnValue({ valid: true });

      const request = createMockRequest('"just a string"');

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ received: true, error: 'Invalid payload type' });
    });

    it('handles null payload gracefully', async () => {
      mockVerify.mockReturnValue({ valid: true });

      const request = new Request('http://localhost:3000/api/webhooks/unipile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Unipile-Signature': 'test-webhook-secret',
        },
        body: 'null',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ received: true, error: 'Invalid payload type' });
    });

    it('handles array payload gracefully', async () => {
      mockVerify.mockReturnValue({ valid: true });

      const request = new Request('http://localhost:3000/api/webhooks/unipile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Unipile-Signature': 'test-webhook-secret',
        },
        body: '[1, 2, 3]',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ received: true, error: 'Invalid payload type' });
    });
  });

  describe('Handler errors', () => {
    it('returns 500 for retriable handler errors', async () => {
      mockVerify.mockReturnValue({ valid: true });
      setupDbInsertSuccess();
      mockDispatch.mockResolvedValue({
        success: false,
        error: 'Database connection failed',
      });
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      } as unknown as ReturnType<typeof mockDb.delete>);

      const request = createMockRequest({
        event: 'account.connected',
        account_id: 'acc_123',
        name: 'user_123',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Internal error' });
    });

    it('returns 200 for non-retriable errors (user not found)', async () => {
      mockVerify.mockReturnValue({ valid: true });
      setupDbInsertSuccess();
      mockDispatch.mockResolvedValue({
        success: false,
        error: 'User not found: user_123',
      });
      setupDbUpdateSuccess();

      const request = createMockRequest({
        event: 'account.connected',
        account_id: 'acc_123',
        name: 'user_123',
      });

      const response = await POST(request);
      const data = await response.json();

      // Non-retriable errors return 200 to prevent retry storms
      expect(response.status).toBe(200);
      expect(data).toEqual({ received: true, error: 'Event processing failed' });
    });
  });

  describe('Database errors', () => {
    it('returns 500 for database errors on insert', async () => {
      mockVerify.mockReturnValue({ valid: true });
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn().mockReturnValue({
            returning: vi.fn().mockRejectedValue(new Error('Connection refused')),
          }),
        }),
      } as unknown as ReturnType<typeof mockDb.insert>);

      const request = createMockRequest({
        event: 'account.connected',
        account_id: 'acc_123',
        name: 'user_123',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Database error' });
    });
  });
});
