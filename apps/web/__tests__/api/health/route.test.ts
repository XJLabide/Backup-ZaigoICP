/**
 * Integration tests for GET /api/health
 *
 * Tests health check endpoint behavior:
 * - Returns ok status when database is connected
 * - Returns error status when database fails
 * - Returns 503 status code on database error
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @/lib/db
vi.mock('@/lib/db', () => ({
  db: {
    execute: vi.fn(),
  },
}));

// Mock drizzle-orm sql template
vi.mock('drizzle-orm', () => ({
  sql: vi.fn(() => 'SELECT 1'),
}));

import { db } from '@/lib/db';
import { GET } from '@/app/api/health/route';

const mockDb = vi.mocked(db);

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Successful health checks', () => {
    it('returns ok status when database is connected', async () => {
      // Setup: database query succeeds
      mockDb.execute.mockResolvedValue(undefined);

      // Execute
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.db).toBe('connected');
      expect(data.timestamp).toBeDefined();
      expect(mockDb.execute).toHaveBeenCalledTimes(1);
    });

    it('includes timestamp in ISO format', async () => {
      // Setup
      mockDb.execute.mockResolvedValue(undefined);

      // Execute
      const response = await GET();
      const data = await response.json();

      // Assert
      const timestamp = new Date(data.timestamp);
      expect(timestamp.toISOString()).toBe(data.timestamp);
    });
  });

  describe('Database failures', () => {
    it('returns error status when database fails', async () => {
      // Setup: database query fails
      mockDb.execute.mockRejectedValue(new Error('Connection refused'));

      // Execute
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(503);
      expect(data.status).toBe('error');
      expect(data.db).toBe('disconnected');
      expect(data.error).toBe('Connection refused');
      expect(data.timestamp).toBeDefined();
    });

    it('handles non-Error exceptions', async () => {
      // Setup: database throws non-Error
      mockDb.execute.mockRejectedValue('String error');

      // Execute
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(503);
      expect(data.status).toBe('error');
      expect(data.db).toBe('disconnected');
      expect(data.error).toBe('Unknown error');
    });

    it('handles timeout errors', async () => {
      // Setup: database query times out
      mockDb.execute.mockRejectedValue(new Error('Query timeout'));

      // Execute
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(503);
      expect(data.error).toBe('Query timeout');
    });
  });
});
