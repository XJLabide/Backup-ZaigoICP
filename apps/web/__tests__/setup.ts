/**
 * Vitest setup file - global test configuration and mocks.
 */

import { vi, beforeEach, afterEach } from 'vitest';

// Mock server-only import (Next.js pattern)
vi.mock('server-only', () => ({}));

// Reset all mocks between tests
beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Mock environment variables for tests
process.env.UNIPILE_DSN = 'https://api.unipile.com';
process.env.UNIPILE_ACCESS_TOKEN = 'test-access-token';
process.env.UNIPILE_WEBHOOK_SECRET = 'test-webhook-secret';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
