# Build Epics

Build sequence for LinkedIn Automation MVP. Each epic delivers something testable and valuable.

---

## Overview

```
Epic 1: Foundation          → Can deploy, can login
Epic 2: LinkedIn Connection → Can connect LinkedIn account
Epic 3: Lead Capture        → Profile viewers sync, can see leads
Epic 4: Campaigns & AI      → Can create campaigns, AI generates messages
Epic 5: Execution Loop      → Can approve and send outreach
Epic 6: Polish & Launch     → Stats, settings, error handling
```

---

## Epic 1: Foundation

**Goal:** Deployable shell with auth working

| Task | Description |
|------|-------------|
| Scaffold monorepo | Turborepo + pnpm + apps/web structure |
| Setup Neon DB | Create database, configure connection |
| Drizzle schema | All tables, migrations, types |
| Drizzle client | Database client setup |
| Clerk auth | Install, configure, middleware |
| Protected routes | Auth guards on dashboard |
| Basic layout | Shell UI with sidebar navigation |
| Vercel deployment | CI/CD pipeline, environment variables |
| Health check | Basic /api/health endpoint |

**Deliverable:** User can sign up, log in, see empty dashboard. Deployed to Vercel.

**Estimated tasks:** 8-10

**Key files created:**
```
apps/web/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── (dashboard)/
│   │   └── layout.tsx
│   ├── api/
│   │   └── health/route.ts
│   └── layout.tsx
├── components/
│   ├── sidebar.tsx
│   └── header.tsx
├── lib/
│   └── db/
│       ├── schema.ts
│       ├── index.ts
│       └── types.ts
└── middleware.ts
```

---

## Epic 2: LinkedIn Connection

**Goal:** User can connect their LinkedIn via Unipile

| Task | Description |
|------|-------------|
| Unipile client setup | SDK installation, client configuration |
| Environment config | UNIPILE_DSN, UNIPILE_ACCESS_TOKEN |
| Generate auth link API | POST /api/auth/unipile/connect |
| Webhook endpoint | POST /api/webhooks/unipile |
| Handle account.connected | Update user with unipileAccountId |
| Handle account.disconnected | Clear connection, notify user |
| Onboarding page | "Connect LinkedIn" UI |
| Connection status component | Show connected/disconnected state |

**Deliverable:** User clicks "Connect LinkedIn", completes OAuth, account is linked.

**Estimated tasks:** 6-8

**Key files created:**
```
apps/web/
├── app/
│   ├── (dashboard)/
│   │   └── onboarding/
│   │       └── page.tsx
│   └── api/
│       ├── auth/
│       │   └── unipile/
│       │       └── connect/route.ts
│       └── webhooks/
│           └── unipile/route.ts
├── components/
│   └── linkedin-connection-status.tsx
└── lib/
    └── unipile/
        ├── client.ts
        └── auth.ts
```

---

## Epic 3: Lead Capture

**Goal:** Profile viewers sync automatically, visible in dashboard

| Task | Description |
|------|-------------|
| Inngest client setup | Installation, client configuration |
| Inngest API route | /api/inngest serve endpoint |
| Profile viewer fetch | Unipile raw data implementation |
| Sync function | Inngest cron: sync-profile-viewers |
| Leads API - list | GET /api/leads with pagination, filters |
| Leads API - detail | GET /api/leads/:id |
| Leads list page | Table with columns, sorting |
| Lead detail modal/page | Full profile information |
| Manual sync button | Trigger sync on demand |
| Sync status indicator | Last sync time, errors |

**Deliverable:** Leads appear in dashboard after sync. User can view lead details.

**Estimated tasks:** 8-10

**Key files created:**
```
apps/web/
├── app/
│   ├── (dashboard)/
│   │   └── leads/
│   │       ├── page.tsx
│   │       └── [id]/page.tsx
│   └── api/
│       ├── inngest/route.ts
│       ├── leads/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       └── sync/
│           └── profile-viewers/route.ts
├── components/
│   ├── leads-table.tsx
│   ├── lead-detail.tsx
│   └── sync-status.tsx
└── lib/
    ├── inngest/
    │   ├── client.ts
    │   ├── index.ts
    │   └── functions/
    │       └── sync-profile-viewers.ts
    └── unipile/
        └── profile-viewers.ts
```

---

## Epic 4: Campaigns & AI Messages

**Goal:** User can create campaigns, AI generates personalized messages

| Task | Description |
|------|-------------|
| Campaign API - create | POST /api/campaigns |
| Campaign API - list | GET /api/campaigns |
| Campaign API - update | PATCH /api/campaigns/:id |
| Campaign API - delete | DELETE /api/campaigns/:id |
| Campaigns list page | View all campaigns with stats |
| Campaign create/edit form | Name, tone, CTA, calendar link, auto-approve |
| AI agent setup | Vercel AI SDK + Claude configuration |
| Message prompt template | System prompt, quality rules |
| Quality scoring logic | Score calculation, issue detection |
| Generate message function | Inngest: lead.qualified → generate |
| Message review page | View generated messages |
| Edit message UI | Allow user edits before approval |
| Assign lead to campaign | Move lead into campaign |
| Bulk assign leads | Select multiple, assign to campaign |

**Deliverable:** User creates campaign, assigns leads, AI generates messages, user can review/edit.

**Estimated tasks:** 12-15

**Key files created:**
```
apps/web/
├── app/
│   ├── (dashboard)/
│   │   ├── campaigns/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── edit/page.tsx
│   │   └── messages/
│   │       └── page.tsx
│   └── api/
│       └── campaigns/
│           ├── route.ts
│           └── [id]/route.ts
├── components/
│   ├── campaign-form.tsx
│   ├── campaign-card.tsx
│   ├── message-review.tsx
│   └── quality-score-badge.tsx
└── lib/
    ├── agents/
    │   ├── message-generator.ts
    │   └── quality-scorer.ts
    └── inngest/
        └── functions/
            └── generate-message.ts
```

---

## Epic 5: Execution Loop

**Goal:** Approved messages get sent via Unipile

| Task | Description |
|------|-------------|
| Approve action API | POST /api/actions/:id/approve |
| Reject action API | POST /api/actions/:id/reject |
| Execute action function | Inngest: action.approved → send |
| Rate limit check | Daily limit (25), per-user tracking |
| Min gap enforcement | 5 minute minimum between actions |
| Send connection request | Unipile POST /users/invite |
| Update action status | pending → approved → sent/failed |
| Handle send errors | Error logging, retry logic |
| Invitation accepted webhook | Handle invitation.accepted event |
| Update lead status | messaged → connected → replied |
| Update campaign stats | Increment counters via Inngest |
| Action history page | View sent, pending, failed |
| Bulk approve UI | Select multiple, approve all |

**Deliverable:** User approves message, it gets sent, status tracked, acceptance detected.

**Estimated tasks:** 10-12

**Key files created:**
```
apps/web/
├── app/
│   ├── (dashboard)/
│   │   └── history/
│   │       └── page.tsx
│   └── api/
│       └── actions/
│           ├── route.ts
│           └── [id]/
│               ├── approve/route.ts
│               └── reject/route.ts
├── components/
│   ├── action-history-table.tsx
│   ├── approve-button.tsx
│   └── bulk-approve.tsx
└── lib/
    ├── inngest/
    │   └── functions/
    │       ├── execute-action.ts
    │       └── update-campaign-stats.ts
    └── unipile/
        └── invitations.ts
```

---

## Epic 6: Polish & Launch

**Goal:** Production-ready with stats and settings

| Task | Description |
|------|-------------|
| Dashboard home page | Overview with key metrics |
| Stats cards | Leads today, sent today, pending |
| Acceptance rate display | Calculate and show percentage |
| Campaign stats | Per-campaign metrics on list/detail |
| Settings page | User preferences UI |
| Calendar link setting | Save/update calendar URL |
| Daily limit setting | Configure personal limit |
| Timezone setting | User timezone preference |
| Error boundary | Graceful error handling |
| Toast notifications | Success/error feedback |
| Loading skeletons | Placeholder during loads |
| Empty states | Helpful messages when no data |
| Mobile responsive | Basic mobile layout |
| Webhook event log | Debug view (admin only) |
| Final testing | End-to-end testing |
| Production environment | Final env vars, domains |

**Deliverable:** Polished MVP ready for real usage.

**Estimated tasks:** 10-12

**Key files created:**
```
apps/web/
├── app/
│   └── (dashboard)/
│       ├── page.tsx (dashboard home)
│       └── settings/
│           └── page.tsx
├── components/
│   ├── stats-card.tsx
│   ├── stats-grid.tsx
│   ├── settings-form.tsx
│   ├── loading-skeleton.tsx
│   ├── empty-state.tsx
│   └── toast-provider.tsx
└── lib/
    └── utils/
        └── stats.ts
```

---

## Summary

| Epic | Focus | Tasks (est.) | Cumulative |
|------|-------|--------------|------------|
| 1. Foundation | Monorepo, DB, Auth, Deploy | 8-10 | 8-10 |
| 2. LinkedIn Connection | Unipile OAuth, Webhooks | 6-8 | 14-18 |
| 3. Lead Capture | Sync, Display, Inngest | 8-10 | 22-28 |
| 4. Campaigns & AI | CRUD, Message Gen, Review | 12-15 | 34-43 |
| 5. Execution Loop | Approve, Send, Rate Limit | 10-12 | 44-55 |
| 6. Polish & Launch | Stats, Settings, QA | 10-12 | 54-67 |

**Total estimated tasks:** 54-67

---

## Dependencies

```
Epic 1 (Foundation)
    │
    ▼
Epic 2 (LinkedIn Connection)
    │
    ▼
Epic 3 (Lead Capture)
    │
    ├──────────────────────┐
    ▼                      ▼
Epic 4 (Campaigns & AI)   (UI components can start in parallel)
    │
    ▼
Epic 5 (Execution Loop)
    │
    ▼
Epic 6 (Polish & Launch)
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Unipile API issues | Test early in Epic 2, have fallback plan |
| LinkedIn rate limits | Conservative limits (25/day), monitor closely |
| AI message quality | Quality scoring threshold (60+), human review default |
| Neon cold starts | Connection pooling, keep-alive queries |
| Inngest reliability | Retries configured, error logging |

---

## Definition of Done (per Epic)

- [ ] All tasks completed
- [ ] Deployed to Vercel (staging)
- [ ] Manual testing passed
- [ ] No console errors
- [ ] Basic error handling in place

---

*Created: January 2026*
