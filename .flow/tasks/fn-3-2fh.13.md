# fn-3-2fh.13 Campaign detail and edit pages

## Description
Create campaign detail page and edit form.

**Size:** M
**Files:**
- `apps/web/app/(dashboard)/campaigns/[id]/page.tsx` (new)
- `apps/web/app/(dashboard)/campaigns/[id]/edit/page.tsx` (new)

## Approach

- Detail page: show campaign info, stats, list of assigned leads
- Edit page: reuse campaign-form with pre-filled values
- Add delete confirmation dialog
- Show link to messages for this campaign

Reference: Next.js 15 dynamic route params are Promises

## Key context

- Detail page shows campaign settings and performance
- Quick actions: Edit, Delete, View Messages
- Edit form pre-populates from existing campaign
- Delete requires confirmation (modal)
- Redirect to /campaigns after delete
## Acceptance
- [ ] /campaigns/:id shows campaign detail
- [ ] Shows campaign name, tone, cta, settings
- [ ] Shows stats: totalLeads, totalSent, etc.
- [ ] Links to assigned leads (or count)
- [ ] Edit button links to /campaigns/:id/edit
- [ ] /campaigns/:id/edit shows edit form
- [ ] Form pre-populated with campaign data
- [ ] Delete button shows confirmation dialog
- [ ] Delete calls DELETE /api/campaigns/:id
- [ ] Redirects to /campaigns after delete
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
