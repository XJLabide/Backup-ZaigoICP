# fn-3-2fh.6 Campaign API - update and delete endpoints

## Description
Create PATCH and DELETE endpoints for /api/campaigns/[id].

**Size:** M
**Files:**
- `apps/web/app/api/campaigns/[id]/route.ts` (new)

## Approach

- PATCH: Partial update with Zod validation, owner check
- DELETE: Soft-verify owner, hard delete (cascades to actions)
- Both require auth + ownership check

Reference: Next.js 15 dynamic route params are Promises - use `await params`

## Key context

- PATCH should update `updatedAt` timestamp
- DELETE cascades to actions table (schema: onDelete cascade)
- Return 404 if campaign not found or not owned by user
- Don't allow updating `userId` or `id`
## Acceptance
- [ ] PATCH /api/campaigns/:id updates campaign
- [ ] DELETE /api/campaigns/:id deletes campaign
- [ ] Both return 401 if not authenticated
- [ ] Both return 404 if campaign not found or not owned
- [ ] PATCH validates partial body with Zod
- [ ] PATCH updates `updatedAt` timestamp
- [ ] DELETE returns 204 on success
- [ ] Integration tests cover owner validation
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
