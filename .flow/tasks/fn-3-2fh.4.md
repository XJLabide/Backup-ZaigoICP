# fn-3-2fh.4 Campaign API - create endpoint

## Description
Create POST /api/campaigns endpoint for campaign creation.

**Size:** M
**Files:**
- `apps/web/app/api/campaigns/route.ts` (new)

## Approach

Follow existing API patterns:
- Auth check via `auth()` from `@clerk/nextjs/server`
- Zod validation for request body
- Drizzle insert with returning()
- Return 201 on success

Reference patterns:
- Auth: `apps/web/app/api/me/route.ts:7-13`
- Insert: `apps/web/lib/db/schema.ts` (campaigns table)

## Key context

- Required fields: `name` only (schema shows notNull)
- Optional fields: `tone`, `cta`, `calendarLink`, `qualificationRules`, `autoApprove`
- Defaults: tone='professional', cta='reply', autoApprove=false
- `qualificationRules` is JSON string - validate with Zod
- Set `userId` from auth context
## Acceptance
- [ ] POST /api/campaigns creates campaign
- [ ] Returns 401 if not authenticated
- [ ] Validates request body with Zod schema
- [ ] Returns 400 on validation error with field details
- [ ] Sets userId from Clerk auth
- [ ] Returns created campaign with 201 status
- [ ] Integration test covers happy path and error cases
## Done summary
Created POST /api/campaigns endpoint with Zod validation, Clerk authentication, and comprehensive integration tests covering 13 test cases for happy path and error scenarios.
## Evidence
- Commits: 662370634cb48280bb8bca0646cb4f60a813f5d8
- Tests: pnpm vitest run campaigns
- PRs: