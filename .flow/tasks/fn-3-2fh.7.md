# fn-3-2fh.7 Single lead assignment to campaign

## Description
Create endpoint to assign a single lead to a campaign.

**Size:** M
**Files:**
- `apps/web/app/api/leads/[id]/assign/route.ts` (new)

## Approach

- PATCH endpoint with campaignId in body
- Verify lead ownership and campaign ownership
- Update lead.campaignId and lead.status to 'qualified'
- Emit `lead/qualified` event via Inngest
- Increment campaign.totalLeads

Reference: Drizzle update pattern in `docs/database-schema.md:401-410`

## Key context

- Lead can only be in ONE campaign (FK constraint)
- Reassigning removes from old campaign (no event for old)
- Status 'qualified' triggers message generation
- If lead already has pending action for this campaign, skip event
## Acceptance
- [ ] PATCH /api/leads/:id/assign assigns lead to campaign
- [ ] Returns 401 if not authenticated
- [ ] Returns 404 if lead not owned by user
- [ ] Returns 404 if campaign not owned by user
- [ ] Updates lead.campaignId and lead.status
- [ ] Emits `lead/qualified` Inngest event
- [ ] Increments campaign.totalLeads
- [ ] Integration test covers reassignment case
## Done summary
Implemented PATCH /api/leads/[id]/assign endpoint for single lead assignment to campaigns. Includes ownership verification, status update to 'qualified', campaign totalLeads counter management for both assignment and reassignment, and lead/qualified Inngest event emission with pending action check to avoid duplicates.
## Evidence
- Commits: c4e132a5c65704bc15db1fd81d7bb2349513dea0
- Tests: pnpm test -- __tests__/api/leads/[id]/assign/route.test.ts (11 tests passed)
- PRs: