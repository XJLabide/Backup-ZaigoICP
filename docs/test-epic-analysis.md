# Test Coverage Epic - Dependency & Pattern Analysis

## Executive Summary

The LinkedIn Automation codebase has **one completed epic (fn-1-7ye: LinkedIn Connection)** with established test patterns. No other epics exist yet in `.flow/epics/`. Test infrastructure is partially in place with Vitest configured but missing E2E testing. Creating a comprehensive test epic is feasible and should depend on foundational test infrastructure first.

---

## 1. EXISTING TEST-RELATED EPICS & TASKS

### Current State
- **Only one epic tracked**: fn-1-7ye (LinkedIn Connection) - **DONE**
- **No dedicated test epic** exists
- **Task fn-1-7ye.8** (Write integration tests) was part of LinkedIn Connection epic
  - Status: Done
  - Coverage: 25 tests passing for 3 API endpoints
  - Approach: Vitest + mocking + integration tests

### Test Task Details (fn-1-7ye.8)

**File**: `/home/natty/linkedin-automation/.flow/tasks/fn-1-7ye.8.md`

**Tests Implemented**:
```
API Routes:
- POST /api/auth/unipile/connect (125 lines of test)
- POST /api/webhooks/unipile (486 lines of test)
- GET /api/user/status (238 lines of test)
```

**Test Coverage**:
- Authentication flows (authenticated/unauthenticated)
- Webhook signature verification
- Event handling (account.connected, account.disconnected)
- Idempotency (duplicate webhook handling)
- Error paths (invalid signatures, Unipile failures)

---

## 2. DEPENDENCIES AFFECTING TEST IMPLEMENTATION

### Infrastructure Dependencies

#### A. Test Runner & Framework (FOUNDATION)
- **Vitest 4.0.18** already configured in `/home/natty/linkedin-automation/apps/web/vitest.config.ts`
- **Setup file** at `__tests__/setup.ts` with:
  - Mock setup for `server-only` (Next.js pattern)
  - Environment variable defaults
  - Global mock reset

**Import**: New tests can immediately use Vitest without additional setup.

#### B. Next.js & API Route Testing

**Files involved**:
- Route handlers: `app/api/*/route.ts`
- Requires: Mocking `@clerk/nextjs/server` for auth
- Requires: Request/Response mock objects

**Pattern established**:
```typescript
// From fn-1-7ye.8 tests
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Create mock Request with JSON body
function createMockRequest(body: object) {
  return new Request('http://localhost:3000', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
```

#### C. Database Testing Dependencies

- **Drizzle ORM** schema at `lib/db/schema.ts`
- **Database URL** mocked: `postgresql://test:test@localhost:5432/test`
- **Mocking pattern**: Mock `@/lib/db` module entirely (no real DB access in tests)

**Current approach** (from fn-1-7ye.8):
```typescript
vi.mock('@/lib/db', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  processedWebhooks: { /* schema mock */ },
  users: { /* schema mock */ },
}));
```

**Limitation**: No actual database integration tests. New tests must continue mocking.

#### D. Crypto & Security Testing

- **Timing-safe comparison** tested: `crypto.timingSafeEqual()`
- **Mocking pattern** established in fn-1-7ye.8

**Available**: Can test signature verification, HMAC validation without external libs.

#### E. Environment Variables

**Setup in `.flow/setup.ts`**:
```
UNIPILE_DSN = https://api.unipile.com
UNIPILE_ACCESS_TOKEN = test-access-token
UNIPILE_WEBHOOK_SECRET = test-webhook-secret
NEXT_PUBLIC_APP_URL = http://localhost:3000
DATABASE_URL = postgresql://test:test@localhost:5432/test
```

**Implication**: Tests can rely on these being available. Add more as features expand.

### Architectural Dependencies

#### A. Clerk Auth System
- **Required for**: All protected routes (`/dashboard/*`)
- **Testing implication**: Every dashboard test needs auth mocking
- **Pattern**: `createMockAuthResponse(userId)` helper (established in fn-1-7ye.8)

#### B. Unipile SDK Integration
- **Dependency**: `/lib/unipile/client.ts` (initialized in fn-1-7ye.1)
- **Testing implication**: Mock all SDK calls
- **Pattern**: `vi.mock('@/lib/unipile/*')` (established)

#### C. Drizzle ORM & Database Schema
- **Stability**: Schema defined in `lib/db/schema.ts`
- **Testing implication**: Tests use snapshot schema for mocking
- **Risk**: Schema changes require test updates

#### D. React Component Testing
- **Components exist** but NO unit tests yet:
  - `components/linkedin-connection-status.tsx`
  - Needs: React Testing Library or Vitest JSX support
  - **NOT TESTED** - gap identified

#### E. Next.js Middleware
- **Exists**: `middleware.ts` for Clerk auth guards
- **Testing implication**: Hard to unit test, requires integration tests
- **Gap**: No middleware tests in fn-1-7ye.8

---

## 3. PATTERNS FROM COMPLETED EPIC fn-1-7ye

### Testing Strategy Used

**Tier 1: Unit Tests** (Planned but not in fn-1-7ye.8)
- Test individual functions: `verifyWebhookSignature()`, auth helpers
- Vitest suitable (no React dependencies)
- **Gap**: fn-1-7ye.8 skipped this for integration tests

**Tier 2: Integration Tests** (FULLY IMPLEMENTED in fn-1-7ye.8)
- Test API route handlers with mocked dependencies
- 25 tests across 3 endpoints
- Mock crypto, Clerk, Drizzle, Unipile SDK
- Test happy path + error cases

**Tier 3: E2E Tests** (PLANNED in fn-1-7ye spec, NOT IMPLEMENTED)
- From `/flow/specs/fn-1-7ye.md` (lines 161-180):
  ```
  ### E2E Tests (Playwright)
  - User visits onboarding, sees "Connect LinkedIn" button
  - Click redirects to external URL (mock)
  - Simulate webhook, verify UI shows "Connected"
  - Disconnect event flips UI to "Disconnected"
  ```
- **Status**: NOT DONE - Playwright not configured

**Tier 4: Manual QA** (EXPECTED but NOT AUTOMATED)
- Local ngrok for real webhook testing
- UI state verification
- No secrets in network tab

### Test File Structure

**Pattern established in fn-1-7ye.8**:
```
apps/web/__tests__/
├── setup.ts                              # Global setup
├── api/
│   ├── auth/
│   │   └── unipile/
│   │       └── connect.test.ts          # 125 lines
│   ├── webhooks/
│   │   └── unipile.test.ts              # 486 lines
│   └── user/
│       └── status.test.ts                # 238 lines
```

**Replicable pattern**:
- Mirror app structure: `__tests__/api/path/to/route.test.ts`
- One test file per route handler
- 100-500 lines per file (based on complexity)

### Mock & Helper Patterns

**Pattern 1: Mock External Dependencies at Top**
```typescript
vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/unipile/auth', () => ({ generateAuthLink: vi.fn() }));
```

**Pattern 2: Create Mock Objects Matching Real Signatures**
```typescript
function createMockAuthResponse(userId: string | null) {
  return {
    userId,
    sessionId: userId ? 'session_123' : null,
    // ... all required properties
    isAuthenticated: !!userId,
  };
}
```

**Pattern 3: Test Both Authenticated & Unauthenticated**
```typescript
describe('POST /api/auth/unipile/connect', () => {
  it('returns 401 for unauthenticated user', () => {
    mockAuth.mockReturnValue(createMockAuthResponse(null));
    // assert 401
  });

  it('returns URL for authenticated user', () => {
    mockAuth.mockReturnValue(createMockAuthResponse('user_123'));
    // assert 200 + url
  });
});
```

**Pattern 4: Test Idempotency**
```typescript
it('duplicate webhook is idempotent', () => {
  const payload = { event: 'account.connected', ... };
  POST(request1);  // First time: updates DB
  POST(request1);  // Same payload: no-op, returns 200
  // Assert DB updated exactly once
});
```

### Test Commands & Scripts

**From package.json**:
```bash
pnpm test              # Run tests once (vitest run)
pnpm test:watch       # Run in watch mode (vitest)
```

**Run pattern** (from fn-1-7ye.8):
```bash
pnpm test              # All tests pass
pnpm test:watch       # Development mode
pnpm --filter web exec tsc --noEmit  # Type check
```

### Evidence & Documentation

**Each task in fn-1-7ye includes**:
- Acceptance criteria checklist
- Done summary
- Evidence section with:
  - Commits (git SHA)
  - Tests command run
  - PR links

**Example (fn-1-7ye.8)**:
```
Tests: pnpm test
Evidence: 
- Commits: 5b32476084c3056d02070b8a80cae3c020a3c29e
- Result: All 25 tests pass
```

### Gaps in fn-1-7ye Testing

1. **No E2E Tests**: Playwright not configured, browser tests missing
2. **No Component Tests**: React Testing Library not set up
3. **No Unit Tests for Utils**: Helper functions untested
4. **No Database Integration**: All DB mocked, no real migrations tested
5. **No Middleware Tests**: Auth guards not tested
6. **No API Docs Generation**: No OpenAPI/Swagger setup
7. **Coverage Reports**: No `--coverage` flag in vitest config
8. **Performance Tests**: No load testing

---

## 4. RECOMMENDED TEST EPIC STRUCTURE

### Foundation Layer (must come first)

**Epic: fn-2-TEST (Comprehensive Test Coverage)**

**Prerequisites**:
- fn-1-7ye (LinkedIn Connection) - DONE ✓
- Vitest already configured - DONE ✓

**Proposed structure**:

```
Task 1: Test Infrastructure Setup (S)
├── Configure Vitest with coverage reports
├── Add React Testing Library
├── Add Playwright for E2E
└── Document testing patterns

Task 2: Component Unit Tests (M)
├── linkedin-connection-status.tsx
├── Test all 5 states (idle, connecting, connected, etc)
└── Test callbacks and props

Task 3: Utility Function Tests (S)
├── Webhook signature verification
├── Auth helpers
├── Logging utilities
└── Type guards

Task 4: Page Integration Tests (M)
├── /onboarding page interactions
├── /onboarding/success polling
├── /onboarding/error recovery
└── Auth flow

Task 5: E2E Test Suite - Critical Path (M)
├── User auth flow
├── LinkedIn connection flow
├── Webhook simulation
└── UI state verification

Task 6: Coverage & CI Integration (S)
├── Coverage reports in CI
├── Failure gates (80%+ threshold)
├── Test reporting
└── Performance metrics
```

### Dependencies for New Epics

**Any new feature epic (3+) should depend on**:
- [ ] fn-2-TEST (Test Infrastructure) for:
  - Component test examples
  - API test patterns
  - Mock helpers library
  - CI integration

**Reason**: Establishes patterns before feature code diverges.

---

## 5. TEST COVERAGE BY FEATURE

### LinkedIn Connection (fn-1-7ye) - DONE
- **Unit tests**: 0 files
- **Integration tests**: 3 files, 25 tests
- **E2E tests**: 0 (planned but not done)
- **Coverage**: API routes 80%+, components 0%

### Planned Future Epics (from /docs/epics.md)

| Epic | Feature | Test Gaps |
|------|---------|-----------|
| Epic 3 | Lead Capture (Inngest sync) | Need async/cron tests, webhook handler tests |
| Epic 4 | Campaigns & AI | Need AI prompt testing, quality scorer tests |
| Epic 5 | Execution Loop | Need rate limiting tests, retry logic tests |
| Epic 6 | Polish | Need stats calculation tests, settings validation |

### Strategy for Epics 3-6

**Each epic should include**:
1. Unit tests for: utils, helpers, type guards
2. Integration tests for: API routes, database operations
3. E2E tests for: critical user flows
4. Acceptance test: feature flag if needed

**Use fn-2-TEST patterns** for consistency.

---

## 6. IMPLEMENTATION CHECKLIST FOR NEW TEST EPIC

### Phase 1: Infrastructure (Week 1)

- [ ] Configure Vitest with coverage
  - Add `--coverage` flag to vitest config
  - Set coverage threshold (80%)
  - Generate HTML reports
  
- [ ] Install React Testing Library
  - `pnpm add -D @testing-library/react @testing-library/user-event`
  - Update vitest config with JSX environment
  
- [ ] Install Playwright
  - `pnpm add -D @playwright/test`
  - Create `playwright.config.ts`
  - Add `pnpm e2e` script
  
- [ ] Document patterns
  - Mock setup guide
  - Test naming conventions
  - Assertion patterns

### Phase 2: Component Tests (Week 2-3)

- [ ] Test `linkedin-connection-status.tsx`
- [ ] Test form components (when built)
- [ ] Test layout components

### Phase 3: API & Utils (Week 3)

- [ ] Test all `/api/*` routes (not in fn-1-7ye.8)
- [ ] Test utility functions
- [ ] Test type guards

### Phase 4: E2E & Integration (Week 4)

- [ ] E2E test critical user flows
- [ ] Integration tests for Inngest (future epics)
- [ ] Webhook simulation tests

### Phase 5: CI Integration (Week 4-5)

- [ ] GitHub Actions for test runs
- [ ] Coverage reports in PRs
- [ ] Test failure gates

---

## 7. KEY FILES REFERENCED

### Test Infrastructure
- `/home/natty/linkedin-automation/apps/web/vitest.config.ts` - Test runner config
- `/home/natty/linkedin-automation/apps/web/__tests__/setup.ts` - Global mocks & env
- `/home/natty/linkedin-automation/apps/web/package.json` - Test scripts

### Established Tests (fn-1-7ye.8)
- `/home/natty/linkedin-automation/apps/web/__tests__/api/auth/unipile/connect.test.ts`
- `/home/natty/linkedin-automation/apps/web/__tests__/api/webhooks/unipile.test.ts`
- `/home/natty/linkedin-automation/apps/web/__tests__/api/user/status.test.ts`

### Epic Documentation
- `/home/natty/linkedin-automation/.flow/specs/fn-1-7ye.md` - Testing strategy section (lines 161-180)
- `/home/natty/linkedin-automation/.flow/tasks/fn-1-7ye.8.md` - Integration test task details
- `/home/natty/linkedin-automation/docs/epics.md` - Future epics & dependencies

### Architecture Context
- `/home/natty/linkedin-automation/docs/architecture-decisions.md` - Tech stack rationale
- `/home/natty/linkedin-automation/docs/database-schema.md` - Schema for test mocking

---

## SUMMARY

**Status**: Test infrastructure partially in place. Vitest + 25 integration tests exist. Major gaps: E2E tests, component tests, test coverage reporting.

**Blocker**: No blocking external dependencies. Can immediately create Test epic.

**Recommendation**: Create fn-2-TEST epic with 5-6 tasks to fill gaps and establish patterns for future epics.

**Dependencies for new epics**: All future feature epics (3+) should list fn-2-TEST as a dependency for test infrastructure.
