# fn-2-pbf.6 Add CI integration and test documentation

## Description
Add CI integration and test documentation:
- GitHub Actions workflow for running tests
- Coverage reporting with thresholds
- Test documentation in README

**Size:** S
**Files:**
- `.github/workflows/test.yml` (new)
- `README.md` (update)
- `docs/testing.md` (new, optional)

## Approach

1. GitHub Actions workflow:
   - Trigger on push/PR to main/staging
   - Setup Node.js, pnpm, install deps
   - Run unit/integration tests with coverage
   - Run E2E tests with Playwright
   - Upload coverage report as artifact
   - Fail if coverage below threshold

2. README updates:
   - Add "Testing" section with commands
   - Document test types (unit, integration, component, E2E)
   - Link to docs/testing.md for details

3. Optional docs/testing.md:
   - Test architecture overview
   - How to write new tests
   - Mock patterns to follow
   - Troubleshooting common issues

## Key context

Follow existing README pattern at `README.md:1-100`.
Use Playwright GitHub Actions setup: https://playwright.dev/docs/ci-intro
## Acceptance
- [ ] `.github/workflows/test.yml` created
- [ ] Workflow runs unit tests with coverage
- [ ] Workflow runs E2E tests
- [ ] Workflow fails if coverage < 70%
- [ ] README.md has "Testing" section with commands
- [ ] Tests pass in CI on staging branch
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
