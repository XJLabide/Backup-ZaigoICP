# fn-3-2fh.11 Inngest generate-message function

## Description
Create Inngest function that generates messages when leads are qualified.

**Size:** L (split if needed during implementation)
**Files:**
- `apps/web/lib/inngest/functions/generate-message.ts` (new)
- `apps/web/lib/inngest/index.ts` (update exports)
- `apps/web/app/api/inngest/route.ts` (register function)

## Approach

- Listen for `lead/qualified` event
- Wrap operations in `step.run()` for durability
- Idempotency: check if action exists for lead+campaign
- Fetch lead + campaign data
- Generate message, score it, create action record
- Respect autoApprove setting

## Key context

- Idempotency key: `event.data.leadId + "-" + event.data.campaignId`
- Throttle: 5 per minute per user (prevent API abuse)
- Retries: 3 with exponential backoff
- If score < 60, still create action but flag it
- If autoApprove, set status='approved' else 'pending'
## Acceptance
- [ ] Function triggers on `lead/qualified` event
- [ ] Uses step.run() for each operation
- [ ] Checks for existing action (idempotency)
- [ ] Fetches lead and campaign data
- [ ] Calls message generator
- [ ] Calls quality scorer
- [ ] Creates action record with message + score
- [ ] Respects autoApprove campaign setting
- [ ] Updates campaign.totalLeads stat (if not already)
- [ ] Handles AI API errors gracefully (retry)
- [ ] Integration test with mocked AI
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
