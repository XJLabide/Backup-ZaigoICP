# fn-2-pbf.4 Add component tests for critical UI

## Description
Add React Testing Library component tests for critical UI components:
- `LinkedInConnectionStatus` - 5 states to test
- `OnboardingClient` - Connect button flow
- `SuccessClient` - Polling behavior, timeout handling

**Size:** M
**Files:**
- `apps/web/__tests__/components/linkedin-connection-status.test.tsx` (new)
- `apps/web/__tests__/components/onboarding/client.test.tsx` (new)
- `apps/web/__tests__/components/onboarding/success-client.test.tsx` (new)

## Approach

1. `LinkedInConnectionStatus`:
   - Test "loading" state shows spinner
   - Test "disconnected" state shows Connect button
   - Test "connecting" state shows spinner
   - Test "connected" state shows profile URL and timestamp
   - Test "error" state shows error message
   - Test `formatConnectedAt()` handles invalid dates

2. `OnboardingClient`:
   - Test initial render shows correct status
   - Test Connect button click calls API
   - Test loading state during API call
   - Test redirect on success
   - Test error display on failure

3. `SuccessClient`:
   - Test polling starts on mount
   - Test polling stops when connected
   - Test timeout after 60 seconds
   - Test error handling during polling
   - Test redirect after successful connection

## Key context

Components use `isMounted` pattern at `apps/web/components/linkedin-connection-status.tsx:35-40` to avoid hydration mismatch - tests need to account for this.
Use `userEvent` over `fireEvent` for realistic interactions.
## Acceptance
- [ ] `__tests__/components/linkedin-connection-status.test.tsx` with tests for all 5 states
- [ ] `__tests__/components/onboarding/client.test.tsx` with 5+ test cases
- [ ] `__tests__/components/onboarding/success-client.test.tsx` with 5+ test cases
- [ ] Tests use React Testing Library queries (getByRole, getByText)
- [ ] Tests use userEvent for interactions
- [ ] All component tests pass
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
