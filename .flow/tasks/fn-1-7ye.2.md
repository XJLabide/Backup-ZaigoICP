# fn-1-7ye.2 Create auth link generation API endpoint

## Description
Create the API endpoint that generates Unipile OAuth authorization links. When called, it creates a hosted auth link tied to the current user.

**Size:** S
**Files:**
- `apps/web/app/api/auth/unipile/connect/route.ts`
- `apps/web/lib/unipile/auth.ts`

## Approach

- Follow pattern from `/docs/unipile-integration.md:80-97`
- Use `auth()` from `@clerk/nextjs/server` for session validation
- Pass Clerk `userId` in the `name` field for webhook correlation
- Set `success_redirect_url` and `failure_redirect_url` using `NEXT_PUBLIC_APP_URL`
- Return JSON with the auth URL

## Key Context

The `name` field in `createHostedAuthLink` is critical - it's how we correlate webhooks back to users. Unipile returns this value in webhook payloads.

Unipile SDK may return expiry info; log it for debugging but do not hard-code assumptions about expiry duration.

## Acceptance
- [ ] `POST /api/auth/unipile/connect` returns `{ url: string }` for authenticated users
- [ ] Returns 401 for unauthenticated requests
- [ ] Returns 500 with error message if Unipile client fails
- [ ] Clerk userId passed in `name` field of auth link request
- [ ] Structured log emitted on success with userId (include expiresAt if SDK returns it)

## Done summary
Created POST /api/auth/unipile/connect endpoint that generates Unipile hosted auth links for LinkedIn OAuth. Returns 401 for unauthenticated requests, 500 with error message on failure, and includes structured logging with userId and expiresOn.
## Evidence
- Commits: 42051e0, c207add8b0c0d360253150f4fda4d2d64fe672bd
- Tests: npx tsc --noEmit
- PRs: