# fn-2-pbf.1 Setup test infrastructure (RTL, Playwright, coverage)

## Description
Install and configure test infrastructure for comprehensive coverage:
- React Testing Library for component tests
- Playwright for E2E tests
- Coverage reporting with thresholds

**Size:** S
**Files:** 
- `apps/web/package.json`
- `apps/web/vitest.config.ts`
- `apps/web/playwright.config.ts` (new)
- `apps/web/__tests__/setup.ts`

## Approach

1. Install dependencies:
   - `@testing-library/react`
   - `@testing-library/user-event`
   - `@testing-library/jest-dom`
   - `@playwright/test`

2. Update `vitest.config.ts`:
   - Add jsdom environment for component tests
   - Add coverage configuration with v8 provider
   - Set coverage thresholds (70% initially)

3. Create `playwright.config.ts`:
   - Configure webServer to start Next.js
   - Set up projects for different browsers
   - Configure test directory at `e2e/`

4. Update `package.json` scripts:
   - `test:coverage` - run with coverage
   - `test:e2e` - run Playwright tests
   - `test:e2e:ui` - Playwright UI mode

## Key context

Follow vitest.config pattern at `apps/web/vitest.config.ts:1-18`.
Playwright config example: https://playwright.dev/docs/test-configuration
## Acceptance
- [ ] `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` installed
- [ ] `@playwright/test` installed
- [ ] `vitest.config.ts` updated with coverage config (provider: v8, threshold: 70%)
- [ ] `playwright.config.ts` created with webServer and browser projects
- [ ] `package.json` has `test:coverage`, `test:e2e`, `test:e2e:ui` scripts
- [ ] `pnpm test` still passes all existing tests
- [ ] `pnpm test:coverage` generates coverage report
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
