# fn-1-7ye.7 Create onboarding page with Connect LinkedIn flow

## Description
Create the onboarding page where users connect their LinkedIn account. This is the main user-facing deliverable of the epic.

**Size:** M
**Files:**
- `apps/web/app/(dashboard)/onboarding/page.tsx`
- `apps/web/app/(dashboard)/onboarding/success/page.tsx`
- `apps/web/app/(dashboard)/onboarding/error/page.tsx`

## Approach

- Main page shows connection status component and "Connect LinkedIn" button
- Button click: POST to `/api/auth/unipile/connect`, redirect to returned URL
- Success page: poll `/api/user/status` every 2 seconds for up to 60 seconds
- When connected detected, show success state with "Continue" button
- Error page: show friendly error message with "Try again" button
- All pages require Clerk auth (dashboard route group)

## Key Context

The OAuth flow redirects user away from our app. When they return to success page, the webhook may not have been processed yet. Polling handles this race condition. 60 second timeout handles stuck states.
## Acceptance
- [ ] `/onboarding` page shows LinkedIn connection status
- [ ] "Connect LinkedIn" button calls API and redirects to Unipile
- [ ] `/onboarding/success` page polls for connection status
- [ ] Success page shows "Connected" when webhook processed
- [ ] Success page times out after 60 seconds with friendly message
- [ ] `/onboarding/error` page shows error with retry option
- [ ] All pages protected by Clerk auth
- [ ] Loading states shown during API calls
- [ ] Error states handled gracefully
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
