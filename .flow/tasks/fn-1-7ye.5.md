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
Implemented GET /api/user/status endpoint that returns LinkedIn connection status for authenticated users. The endpoint queries the user's unipileAccountId to determine connection state and includes linkedInConnectedAt timestamp when connected, with Cache-Control: no-store for fresh polling responses.
## Evidence
- Commits: 863937fb2fc8c112c3a6db6f9fc96e98035c2141
- Tests:
- PRs: