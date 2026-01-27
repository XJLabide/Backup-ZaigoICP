# fn-3-2fh.12 Campaign list page and create form

## Description
Create campaign list page and new campaign form.

**Size:** M
**Files:**
- `apps/web/app/(dashboard)/campaigns/page.tsx` (new)
- `apps/web/app/(dashboard)/campaigns/new/page.tsx` (new)
- `apps/web/components/campaign-card.tsx` (new)
- `apps/web/components/campaign-form.tsx` (new)

## Approach

- Server component for list page with data fetching
- Client component form with React Hook Form + Zod
- Use shadcn Card, Button, Form components
- Follow existing dashboard layout pattern

Reference UI patterns:
- Page layout: `apps/web/app/(dashboard)/dashboard/page.tsx`
- Form: shadcn form components in `components/ui/`

## Key context

- List shows stats: totalLeads, messages pending, approved
- Empty state when no campaigns
- Link to /campaigns/new from list page
- Form fields: name (required), tone, cta, calendarLink, autoApprove
- Redirect to campaign detail after create
## Acceptance
- [ ] /campaigns page shows list of campaigns
- [ ] Campaign cards show name and stats
- [ ] Empty state when no campaigns
- [ ] "New Campaign" button links to /campaigns/new
- [ ] /campaigns/new shows create form
- [ ] Form validates required fields
- [ ] Form submits to POST /api/campaigns
- [ ] Redirects to /campaigns/:id after success
- [ ] Shows error toast on failure
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
