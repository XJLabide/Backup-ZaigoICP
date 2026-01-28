# Test Patterns Reference - Quick Copy-Paste Guide

Based on completed Epic fn-1-7ye, here are the exact patterns to follow for new tests.

---

## Setup Pattern (goes at top of every test file)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// 1. Mock external dependencies FIRST (before imports)
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/unipile/auth', () => ({
  generateAuthLink: vi.fn(),
}));

vi.mock('crypto', () => ({
  createHash: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn().mockReturnValue('mock-hash-abc123'),
  })),
  timingSafeEqual: vi.fn((a, b) => a.toString() === b.toString()),
}));

// 2. Import what you need to test
import { auth } from '@clerk/nextjs/server';
import { generateAuthLink } from '@/lib/unipile/auth';
import { POST } from '@/app/api/auth/unipile/connect/route';

// 3. Create mocked versions for easier use in tests
const mockAuth = vi.mocked(auth);
const mockGenerateAuthLink = vi.mocked(generateAuthLink);

// 4. Global helpers used across tests
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
  };
}

function createMockRequest(body?: object, method = 'POST') {
  return new Request('http://localhost:3000/api/test', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}
```

---

## Test Structure Pattern

```typescript
describe('POST /api/auth/unipile/connect', () => {
  
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  // Happy path
  describe('authenticated user', () => {
    it('returns URL for authenticated user', async () => {
      // Arrange
      mockAuth.mockReturnValue(createMockAuthResponse('user_123'));
      mockGenerateAuthLink.mockResolvedValue({
        url: 'https://unipile.com/auth/xyz',
      });

      // Act
      const request = createMockRequest();
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ url: 'https://unipile.com/auth/xyz' });
      expect(mockGenerateAuthLink).toHaveBeenCalledWith('user_123');
    });
  });

  // Error cases
  describe('unauthenticated user', () => {
    it('returns 401 for unauthenticated user', async () => {
      // Arrange
      mockAuth.mockReturnValue(createMockAuthResponse(null));

      // Act
      const request = createMockRequest();
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(401);
    });
  });

  // Failure modes
  describe('error handling', () => {
    it('returns 500 when Unipile fails', async () => {
      // Arrange
      mockAuth.mockReturnValue(createMockAuthResponse('user_123'));
      mockGenerateAuthLink.mockRejectedValue(
        new Error('Unipile service unavailable')
      );

      // Act
      const request = createMockRequest();
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(500);
    });
  });
});
```

---

## Database Mocking Pattern

```typescript
vi.mock('@/lib/db', () => {
  const mockDbModule = {
    db: {
      insert: vi.fn(),
      select: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      query: {
        users: {
          findMany: vi.fn(),
          findUnique: vi.fn(),
          findFirst: vi.fn(),
        },
        processedWebhooks: {
          findUnique: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
        },
      },
    },
    processedWebhooks: {
      eventId: 'event_id',
      eventType: 'event_type',
      processedAt: 'processed_at',
      payload: 'payload',
    },
    users: {
      id: 'id',
      clerkUserId: 'clerk_user_id',
      unipileAccountId: 'unipile_account_id',
      linkedInConnectedAt: 'linkedin_connected_at',
      updatedAt: 'updated_at',
    },
  };
  return mockDbModule;
});

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value })),
  and: vi.fn((...conditions) => ({ type: 'and', conditions })),
  isNull: vi.fn((field) => ({ field, isNull: true })),
  lt: vi.fn((field, value) => ({ field, lt: value })),
}));
```

**In test**:
```typescript
it('updates user on webhook', async () => {
  const mockDb = vi.mocked(db);
  mockDb.insert().mockResolvedValue({ id: '123' });

  // Test code...

  expect(mockDb.insert).toHaveBeenCalled();
});
```

---

## Webhook Testing Pattern

```typescript
describe('POST /api/webhooks/unipile', () => {
  
  it('handles account.connected event', async () => {
    // Arrange
    const payload = {
      event: 'account.connected',
      account_id: 'acc_123',
      name: 'user_456', // Clerk user ID
    };

    mockVerify.mockReturnValue({ valid: true });
    mockDispatch.mockResolvedValue({ success: true });

    // Act
    const request = createMockRequest(payload);
    request.headers.set('X-Unipile-Signature', 'valid-sig');
    const response = await POST(request);

    // Assert
    expect(response.status).toBe(200);
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'account.connected',
        account_id: 'acc_123',
      })
    );
  });

  it('duplicate webhook is idempotent', async () => {
    // Arrange
    const payload = { event: 'account.connected', account_id: 'acc_123' };
    mockVerify.mockReturnValue({ valid: true });
    mockDispatch.mockResolvedValue({ success: true });

    // Act - send same webhook twice
    const request1 = createMockRequest(payload);
    request1.headers.set('X-Unipile-Signature', 'sig');
    
    await POST(request1);
    const response2 = await POST(request1); // Same payload

    // Assert
    expect(response2.status).toBe(200);
    // Should only have called dispatch once
    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  it('returns 401 for invalid signature', async () => {
    // Arrange
    mockVerify.mockReturnValue({ 
      valid: false, 
      error: 'Invalid signature' 
    });

    // Act
    const request = createMockRequest({ event: 'account.connected' });
    const response = await POST(request);

    // Assert
    expect(response.status).toBe(401);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('ignores unknown event types', async () => {
    // Arrange
    mockVerify.mockReturnValue({ valid: true });

    // Act
    const request = createMockRequest({ event: 'unknown.event' });
    const response = await POST(request);

    // Assert
    expect(response.status).toBe(200); // Still 200!
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
```

---

## Component Test Pattern (React Testing Library)

When adding components, use this pattern:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { LinkedInConnectionStatus } from '@/components/linkedin-connection-status';

describe('LinkedInConnectionStatus', () => {
  
  it('displays connected state', () => {
    // Arrange
    const props = {
      status: 'connected' as const,
      connectedAt: '2024-01-27T12:00:00Z',
    };

    // Act
    render(<LinkedInConnectionStatus {...props} />);

    // Assert
    expect(screen.getByText(/connected/i)).toBeInTheDocument();
  });

  it('calls onConnect when button clicked', async () => {
    // Arrange
    const handleConnect = vi.fn();
    render(
      <LinkedInConnectionStatus 
        status="disconnected"
        onConnect={handleConnect}
      />
    );

    // Act
    const button = screen.getByRole('button', { name: /connect/i });
    fireEvent.click(button);

    // Assert
    expect(handleConnect).toHaveBeenCalled();
  });

  it('shows loading state while connecting', () => {
    // Arrange
    render(<LinkedInConnectionStatus status="connecting" />);

    // Assert
    expect(screen.getByRole('status')).toHaveClass('animate-spin');
  });

  it('displays error state with message', () => {
    // Arrange
    render(
      <LinkedInConnectionStatus 
        status="error"
        error="Network timeout"
      />
    );

    // Assert
    expect(screen.getByText(/network timeout/i)).toBeInTheDocument();
  });
});
```

---

## Assertion Patterns

### HTTP Response
```typescript
// Status codes
expect(response.status).toBe(200);
expect(response.status).toBe(401);
expect(response.status).toBe(500);

// Headers
expect(response.headers.get('content-type')).toBe('application/json');

// Body
const data = await response.json();
expect(data).toEqual({ url: 'https://...' });
expect(data).toHaveProperty('url');
```

### Mock Calls
```typescript
// Was called
expect(mockFunction).toHaveBeenCalled();

// Called with specific args
expect(mockFunction).toHaveBeenCalledWith('user_123');
expect(mockFunction).toHaveBeenCalledWith(
  expect.objectContaining({ id: '123' })
);

// Called exactly N times
expect(mockFunction).toHaveBeenCalledTimes(1);

// Not called
expect(mockFunction).not.toHaveBeenCalled();
```

### Async/Await
```typescript
// Resolved value
mockFn.mockResolvedValue({ ok: true });

// Rejected value
mockFn.mockRejectedValue(new Error('Network error'));

// Awaiting response
const response = await POST(request);
const data = await response.json();
```

---

## Environment Variables

These are automatically set in `/home/natty/linkedin-automation/apps/web/__tests__/setup.ts`:

```typescript
UNIPILE_DSN = https://api.unipile.com
UNIPILE_ACCESS_TOKEN = test-access-token
UNIPILE_WEBHOOK_SECRET = test-webhook-secret
NEXT_PUBLIC_APP_URL = http://localhost:3000
DATABASE_URL = postgresql://test:test@localhost:5432/test
```

**For new env vars**, add them to setup.ts:
```typescript
process.env.NEW_VAR = 'test-value';
```

---

## Running Tests

```bash
# Run all tests once
pnpm test

# Run in watch mode (development)
pnpm test:watch

# Run specific file
pnpm test -- connect.test.ts

# Run with coverage
pnpm test -- --coverage

# Run single test by name
pnpm test -- --grep "returns 401"
```

---

## Common Pitfalls & Fixes

### Pitfall 1: Mock Hoisting
**Problem**: Mocks declared after imports don't work
**Solution**: Put ALL `vi.mock()` calls BEFORE imports

```typescript
// WRONG
import { POST } from './route';
vi.mock('./something');

// RIGHT
vi.mock('./something');
import { POST } from './route';
```

### Pitfall 2: Forgetting beforeEach reset
**Problem**: Mock state leaks between tests
**Solution**: Always include beforeEach

```typescript
beforeEach(() => {
  vi.clearAllMocks();
});
```

### Pitfall 3: Async/await missing
**Problem**: "Expected promise not to be undefined"
**Solution**: Make test async and await responses

```typescript
// WRONG
it('returns data', () => {
  const response = POST(request);
  expect(response.status).toBe(200);
});

// RIGHT
it('returns data', async () => {
  const response = await POST(request);
  expect(response.status).toBe(200);
});
```

### Pitfall 4: Not mocking external calls
**Problem**: Tests make real API calls
**Solution**: Mock before testing

```typescript
// BEFORE test
mockGenerateAuthLink.mockResolvedValue({ url: 'https://...' });

// Test code won't call real Unipile
```

---

## File Template for New API Route Test

```typescript
/**
 * Integration tests for {ROUTE_PATH}
 *
 * Tests {BRIEF_DESCRIPTION}:
 * - {Requirement 1}
 * - {Requirement 2}
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: { /* schema */ },
}));

// Imports
import { auth } from '@clerk/nextjs/server';
import { POST } from '@/app/api/{ROUTE}/route';

const mockAuth = vi.mocked(auth);

// Helpers
function createMockAuthResponse(userId: string | null) {
  return {
    userId,
    isAuthenticated: !!userId,
    // ... other properties
  };
}

function createMockRequest(body?: object) {
  return new Request('http://localhost:3000', {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

// Tests
describe('POST {ROUTE_PATH}', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('happy path', () => {
    it('{REQUIREMENT 1}', async () => {
      // Arrange
      mockAuth.mockReturnValue(createMockAuthResponse('user_123'));

      // Act
      const response = await POST(createMockRequest());

      // Assert
      expect(response.status).toBe(200);
    });
  });

  describe('error handling', () => {
    it('{ERROR CASE}', async () => {
      // Arrange
      mockAuth.mockReturnValue(createMockAuthResponse(null));

      // Act
      const response = await POST(createMockRequest());

      // Assert
      expect(response.status).toBe(401);
    });
  });
});
```

---

## Further Reading

- Vitest docs: https://vitest.dev
- React Testing Library: https://testing-library.com/react
- Playwright: https://playwright.dev

**In this codebase**:
- `/home/natty/linkedin-automation/apps/web/__tests__/setup.ts` - Global setup
- `/home/natty/linkedin-automation/apps/web/vitest.config.ts` - Vitest config
- `/home/natty/linkedin-automation/.flow/tasks/fn-1-7ye.8.md` - Task that created these patterns
