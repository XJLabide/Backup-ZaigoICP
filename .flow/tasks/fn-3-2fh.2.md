# fn-3-2fh.2 Create Inngest client with typed events

## Description
Create typed Inngest client with event schemas for campaign message generation.

**Size:** S
**Files:**
- `apps/web/lib/inngest/client.ts` (new)
- `apps/web/lib/inngest/index.ts` (new)

## Approach

Follow Inngest TypeScript patterns:
- Define event types for `lead/qualified`, `message/generated`
- Use `EventSchemas.fromRecord<Events>()` for type safety
- Export client as singleton

Reference: https://www.inngest.com/docs/typescript

## Key context

- Event names use slash convention: `domain/action.verb`
- Event data should include userId for multi-tenancy
- Idempotency key: `event.data.leadId + "-" + event.data.campaignId`
## Acceptance
- [ ] `lib/inngest/client.ts` exports typed Inngest client
- [ ] Event types defined: `lead/qualified`, `message/generated`
- [ ] Event data includes leadId, campaignId, userId
- [ ] Client ID is `linkedin-automation`
- [ ] TypeScript types are correct (no any types)
- [ ] Exports work via `lib/inngest/index.ts`
## Done summary
Created typed Inngest client with event schemas for lead/qualified and message/generated events. Client exports via barrel file with full TypeScript type safety.
## Evidence
- Commits: b1a99005cfb7f994d1efd3597750523e249bc374
- Tests: npx tsc --noEmit lib/inngest/client.ts lib/inngest/index.ts
- PRs: