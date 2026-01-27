# fn-3-2fh.8 Bulk lead assignment to campaign

## Description
Create endpoint to bulk-assign multiple leads to a campaign.

**Size:** M
**Files:**
- `apps/web/app/api/campaigns/[id]/assign/route.ts` (new)

## Approach

- POST endpoint with leadIds array in body
- Validate all leads owned by user
- Use transaction for atomic update
- Emit batch of `lead/qualified` events
- Return count of assigned leads

## Key context

- Max 100 leads per request (prevent timeout)
- Use Drizzle `inArray()` for bulk operations
- Transaction ensures all-or-nothing
- Skip leads already assigned to this campaign (don't double-event)
## Acceptance
- [ ] POST /api/campaigns/:id/assign bulk-assigns leads
- [ ] Returns 401 if not authenticated
- [ ] Returns 404 if campaign not owned
- [ ] Validates all leadIds are owned by user
- [ ] Returns 400 if >100 leads requested
- [ ] Updates in transaction (atomic)
- [ ] Emits `lead/qualified` events for newly assigned only
- [ ] Returns count of leads assigned
- [ ] Integration test covers partial ownership case
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
