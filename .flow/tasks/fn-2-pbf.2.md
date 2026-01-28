# fn-2-pbf.2 Add unit tests for API routes (health, me)

## Description
Add unit tests for the two untested API routes:
- `GET /api/health` - Database connectivity check
- `GET /api/me` - User sync/upsert from Clerk

**Size:** S
**Files:**
- `apps/web/__tests__/api/health/route.test.ts` (new)
- `apps/web/__tests__/api/me/route.test.ts` (new)

## Approach

1. `GET /api/health`:
   - Test successful DB connection returns `{ status: "healthy" }`
   - Test DB failure returns 500 with error message
   - Follow pattern at `apps/web/__tests__/api/user/status.test.ts:47-55` for DB mocking

2. `GET /api/me`:
   - Test authenticated user creates/updates DB record
   - Test 401 for unauthenticated request
   - Test 404 when Clerk user not found
   - Test handles missing email gracefully
   - Mock both `currentUser()` and DB upsert

## Key context

Follow existing test patterns:
- `createMockAuthResponse()` helper at `apps/web/__tests__/api/auth/unipile/connect.test.ts:32-53`
- DB mock setup at `apps/web/__tests__/api/user/status.test.ts:18-30`
## Acceptance
- [ ] `__tests__/api/health/route.test.ts` created with 3+ test cases
- [ ] `__tests__/api/me/route.test.ts` created with 5+ test cases
- [ ] Tests cover: success, 401, 404, DB error, edge cases
- [ ] All new tests pass
- [ ] Existing tests still pass
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
