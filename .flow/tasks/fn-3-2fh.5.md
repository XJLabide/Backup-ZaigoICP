# fn-3-2fh.5 Campaign API - list endpoint

## Description
Create GET /api/campaigns endpoint to list user campaigns with stats.

**Size:** M
**Files:**
- `apps/web/app/api/campaigns/route.ts` (add GET handler)

## Approach

- Auth check, filter by userId
- Support pagination via query params (page, limit)
- Return campaigns with denormalized stats from table
- Order by createdAt desc (newest first)

Reference: Drizzle query patterns in `docs/database-schema.md:385-395`

## Key context

- Stats are denormalized on campaigns table (totalLeads, totalSent, etc.)
- Default limit: 10, max limit: 50
- Include total count for pagination UI
## Acceptance
- [ ] GET /api/campaigns returns user campaigns
- [ ] Returns 401 if not authenticated
- [ ] Supports `page` and `limit` query params
- [ ] Returns total count for pagination
- [ ] Campaigns ordered by createdAt desc
- [ ] Only returns campaigns owned by authenticated user
- [ ] Integration test covers pagination
## Done summary
Implemented GET /api/campaigns endpoint with pagination support (page/limit query params), filtering by authenticated user, ordering by createdAt desc, and returning total count for pagination UI. Added 14 integration tests covering happy paths, pagination edge cases, authentication, and error handling.
## Evidence
- Commits: 93b38c9ac16233b62485432d147abfc47bfd6a1e
- Tests: pnpm test -- route.test.ts
- PRs: