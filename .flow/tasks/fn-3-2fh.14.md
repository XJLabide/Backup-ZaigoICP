# fn-3-2fh.14 Message review page with edit UI

## Description
Create message review page with edit, approve, and reject functionality.

**Size:** M
**Files:**
- `apps/web/app/(dashboard)/messages/page.tsx` (new)
- `apps/web/components/message-review.tsx` (new)
- `apps/web/components/quality-score-badge.tsx` (new)
- `apps/web/app/api/actions/[id]/route.ts` (new - for PATCH)

## Approach

- List pending messages (actions with status=pending)
- Show message text, lead info, quality score, issues
- Inline edit with save, approve, reject buttons
- Quality score badge shows color based on threshold

Reference: `docs/mvp-overview.md:139-150` for quality rules

## Key context

- Messages = actions where status in (pending, approved)
- Quality score badge: green (80+), yellow (60-79), red (<60)
- Edit updates action.message, clears generatedAt (marks as edited)
- Approve sets status='approved', approvedAt=now()
- Reject sets status='rejected', rejectedAt=now()
- Filter by campaign, status
- Character counter during edit (max 300)
## Acceptance
- [ ] /messages page shows pending messages
- [ ] Messages show lead name, headline, company
- [ ] Messages show quality score with color badge
- [ ] Messages show issues list if score < 80
- [ ] Edit button enables inline editing
- [ ] Save button calls PATCH /api/actions/:id
- [ ] Approve button sets status to approved
- [ ] Reject button sets status to rejected
- [ ] Filter by campaign dropdown
- [ ] Filter by status (pending/approved)
- [ ] Character counter shows during edit
- [ ] Prevents save if >300 characters
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
