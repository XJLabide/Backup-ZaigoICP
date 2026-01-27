# fn-1-7ye.8 Write integration tests for Unipile endpoints

## Description
Write integration tests for the Unipile API endpoints. Focus on API route behavior, not Unipile SDK internals.

**Size:** M
**Files:**
- `apps/web/__tests__/api/auth/unipile/connect.test.ts`
- `apps/web/__tests__/api/webhooks/unipile.test.ts`
- `apps/web/__tests__/api/user/status.test.ts`

## Approach

- Use Vitest for test runner (standard for Next.js)
- Mock Unipile SDK responses
- Mock Clerk auth for authenticated/unauthenticated scenarios
- Test happy paths and error paths
- Test webhook idempotency by sending duplicate events

## Key Context

Focus on testing the route handler logic, not the Unipile SDK itself. Mock external dependencies. Include edge cases: missing auth, invalid payload, duplicate webhook.
## Acceptance
- [ ] Tests for `POST /api/auth/unipile/connect`:
  - Returns URL for authenticated user
  - Returns 401 for unauthenticated user
  - Returns 500 when Unipile fails
- [ ] Tests for `POST /api/webhooks/unipile`:
  - Returns 401 for invalid signature
  - Handles account.connected event
  - Handles account.disconnected event
  - Ignores unknown event types with 200
  - Duplicate webhook is idempotent
- [ ] Tests for `GET /api/user/status`:
  - Returns connected status when user has unipileAccountId
  - Returns disconnected status when user has no unipileAccountId
  - Returns 401 for unauthenticated user
- [ ] All tests pass with `pnpm test`
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
