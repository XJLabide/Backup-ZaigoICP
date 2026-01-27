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
TBD

## Evidence
- Commits:
- Tests:
- PRs:
