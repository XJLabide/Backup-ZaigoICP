# fn-2-pbf.5 Add E2E tests for auth and LinkedIn connection flows

## Description
Add Playwright E2E tests for critical user flows:
- Authentication flow (sign-in, protected routes)
- LinkedIn connection onboarding flow

**Size:** M
**Files:**
- `apps/web/e2e/auth.spec.ts` (new)
- `apps/web/e2e/onboarding.spec.ts` (new)
- `apps/web/e2e/global.setup.ts` (new)

## Approach

1. Global setup:
   - Configure Clerk testing token setup using `@clerk/testing/playwright`
   - Create authenticated storage state for reuse

2. Auth flow tests:
   - Test unauthenticated user redirected to sign-in
   - Test sign-in page renders
   - Test authenticated user can access /dashboard
   - Test middleware protects /dashboard routes

3. Onboarding flow tests:
   - Test /onboarding shows LinkedIn connection status
   - Test Connect button triggers OAuth flow (mock Unipile redirect)
   - Test /onboarding/success polls for connection
   - Test /onboarding/error shows retry option
   - Test already-connected user sees connected state

Note: For Unipile OAuth, use MSW to mock the auth link endpoint. Cannot test actual Unipile OAuth in E2E without sandbox environment.

## Key context

Follow Clerk E2E pattern from: https://clerk.com/docs/testing/playwright
Use `setupClerkTestingToken({ page })` before navigating to authenticated routes.
## Acceptance
- [ ] `e2e/global.setup.ts` configures Clerk testing token
- [ ] `e2e/auth.spec.ts` with 4+ test cases for auth flow
- [ ] `e2e/onboarding.spec.ts` with 5+ test cases for onboarding flow
- [ ] Tests use Page Object Model pattern for maintainability
- [ ] All E2E tests pass with `pnpm test:e2e`
- [ ] Tests work in CI (headless mode)
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
