# fn-1-7ye.5 Create user connection status API endpoint

## Description
Create an API endpoint for the UI to poll connection status. Used by the onboarding success page to detect when the webhook has been processed.

**Size:** S
**Files:**
- `apps/web/app/api/user/status/route.ts`

## Approach

- GET endpoint, requires Clerk auth
- Query user record from database
- Return connection status derived from `unipileAccountId` presence
- Include `linkedInConnectedAt` timestamp if connected

## Key Context

This endpoint is polled every 2 seconds by the success page after OAuth redirect. Keep response small and fast.
## Acceptance
- [ ] `GET /api/user/status` returns connection status for authenticated user
- [ ] Returns 401 for unauthenticated requests
- [ ] Response includes `{ linkedInConnected: boolean, connectedAt: string | null }`
- [ ] `linkedInConnected` is true when `unipileAccountId` is not null
- [ ] Response cached with `Cache-Control: no-store` (always fresh)
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
