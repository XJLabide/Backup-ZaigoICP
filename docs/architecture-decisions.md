# Architecture Decisions

Technical decisions for the LinkedIn Automation MVP, with rationale.

---

## 1. Unipile vs Chrome Extension

**Decision: Unipile API**

This is the biggest architectural decision. We chose Unipile over building a Chrome extension.

| Factor | Chrome Extension | Unipile |
|--------|------------------|---------|
| Time to market | Weeks | Days |
| Selector maintenance | Our problem | Their problem |
| Auth challenges (2FA) | We handle | They handle |
| Rate limiting | We implement | They manage |
| Chrome Web Store | Approval needed | N/A |
| Ongoing cost | None | Per-account fee |
| "Organic" behavior | Better (real browser) | Good (managed sessions) |

**Why Unipile wins for MVP:**

1. **Speed** — Indie maker ethos. Ship in days, not weeks.
2. **Reliability** — LinkedIn changes DOM frequently. Unipile maintains selectors.
3. **Auth complexity** — 2FA, checkpoints, session persistence all handled.
4. **Focus** — We build product value, not LinkedIn scraping infrastructure.

**Trade-offs accepted:**
- Monthly cost per connected account
- Third-party dependency
- Slightly less "organic" than real browser extension

**Exit strategy:** If Unipile becomes problematic, we can build a Chrome extension later. The core product (AI messaging, campaigns, dashboard) transfers directly.

---

## 2. Monorepo vs Multi-Repo

**Decision: Monorepo**

Why:
- Dashboard and API share types (Lead, Action, User)
- Single PR for cross-cutting changes
- One developer = one repo makes sense
- Even without extension, we may add packages later

If we had separate teams or truly independent deployments, multi-repo would make sense. We don't.

---

## 3. Monorepo Tooling

**Decision: Turborepo + pnpm**

| Option | Pros | Cons |
|--------|------|------|
| Turborepo | Vercel-native, simple, caching | Lighter than Nx |
| Nx | Powerful, mature | Overkill, steep learning curve |
| pnpm workspaces alone | Minimal | No build orchestration |

Turborepo is the Vercel-native choice. We're deploying to Vercel. It handles parallel builds and caching with minimal config.

---

## 4. Database

**Decision: Neon PostgreSQL + Drizzle**

| Option | Pros | Cons |
|--------|------|------|
| Neon | Serverless Postgres, generous free tier, branching | Newer |
| Supabase | Great dashboard, extras (auth, realtime) | Overkill if just using DB |
| Vercel Postgres | Vercel-native | Smaller free tier (256MB) |
| PlanetScale | MySQL, great DX | Not PostgreSQL |

**Why Neon:**
- Serverless PostgreSQL (scales to zero)
- 0.5 GB storage free tier
- Database branching for dev/preview
- Fast cold starts
- Native Drizzle support

**Why Drizzle over Prisma:**
- Lighter (no separate query engine)
- Better TypeScript inference
- Faster runtime
- SQL-like syntax feels natural

---

## 5. Job Queue

**Decision: None for MVP — database is the queue**

Here's my controversial take: **we don't need Redis/BullMQ**.

Why:
- Cron jobs poll for pending actions — that's a pull model
- 25 actions/day = trivial load
- The "queue" is just an `actions` table with a `status` column
- Adding Inngest/BullMQ later is easy if we need it

YAGNI. Don't add infrastructure we don't need yet.

---

## 6. Background Jobs

**Decision: Inngest**

| Option | Pros | Cons |
|--------|------|------|
| Inngest | Event-driven, retries, rate limiting, great dashboard | Another dependency |
| Trigger.dev | Open source, TypeScript-first | Newer |
| Vercel Cron | Built-in, no extra infra | No retries, basic scheduling |
| BullMQ + Redis | Full-featured | Way overkill, infrastructure heavy |

**Why Inngest:**
- **Event-driven** — React to webhooks, user actions, scheduled events
- **Built-in retries** — Automatic exponential backoff
- **Rate limiting** — Prevent hitting LinkedIn limits
- **Step functions** — Break complex jobs into reliable steps
- **Great dashboard** — Debug and monitor jobs visually
- **Vercel-native** — First-class integration

**Our Inngest functions:**
- `sync-profile-viewers` — Scheduled every 4 hours
- `execute-approved-action` — Triggered on action approval
- `process-unipile-webhook` — Triggered on webhook events
- `generate-message` — Triggered when lead qualified

---

## 7. Auth

**Decision: Clerk**

| Option | Pros | Cons |
|--------|------|------|
| Clerk | 10 min setup, handles edge cases | Cost at scale |
| Auth.js | Free, full control | 2+ hours setup, more maintenance |
| Lucia | Lightweight | Most manual |

Indie maker ethos: **don't build auth**. Clerk's free tier is enough for MVP. We can migrate to Auth.js later if cost becomes an issue.

---

## 8. Separate Backend Server?

**Decision: No — Next.js API routes only**

Why NOT a separate Express/FastAPI:
- We don't need WebSockets
- We don't need complex middleware
- One deployment is simpler than two
- Types are shared automatically

Next.js API routes can do everything we need. Adding a separate backend adds deployment complexity, API client generation, and CORS handling for zero benefit.

---

## 9. AI Framework

**Decision: Vercel AI SDK v6**

| Option | Pros | Cons |
|--------|------|------|
| Vercel AI SDK v6 | ToolLoopAgent, streaming, Vercel-native | Vercel ecosystem |
| LangChain | Flexible, many integrations | Complex, heavy |
| Claude SDK directly | Simple, lightweight | No agent loop |

Vercel AI SDK v6 provides `ToolLoopAgent` which handles:
- Tool calling with automatic loops
- Streaming responses
- Error handling and retries

Perfect for our AI message generation agent.

---

## 10. AI Model

**Decision: Claude (Anthropic)**

| Model | Pros | Cons |
|-------|------|------|
| Claude | Best reasoning, great at nuance | Slightly pricier |
| GPT-4 | Fast, good quality | Less nuanced writing |
| GPT-3.5 | Cheap | Quality concerns |

For personalized outreach messages, Claude's nuance and reasoning matter. The cost difference is negligible at our volume (25 messages/day).

---

## Project Structure

```
linkedin-automation/
├── apps/
│   └── web/                      # Next.js 15 (dashboard + API)
│       ├── app/
│       │   ├── (auth)/           # Clerk auth pages
│       │   ├── (dashboard)/
│       │   │   ├── leads/        # Lead queue
│       │   │   ├── messages/     # Message review
│       │   │   ├── campaigns/    # Campaign management
│       │   │   ├── onboarding/   # Unipile connection
│       │   │   └── settings/     # Config
│       │   ├── api/
│       │   │   ├── auth/         # Unipile auth endpoints
│       │   │   ├── webhooks/     # Unipile webhooks
│       │   │   ├── leads/        # Lead CRUD
│       │   │   ├── actions/      # Action management
│       │   │   ├── campaigns/    # Campaign CRUD
│       │   │   ├── sync/         # Profile viewer sync
│       │   │   └── stats/        # Dashboard metrics
│       │   └── layout.tsx
│       ├── components/           # shadcn/ui components
│       ├── lib/
│       │   ├── agents/           # Vercel AI SDK agents
│       │   ├── db/               # Drizzle schema + queries
│       │   ├── unipile/          # Unipile API client
│       │   └── utils/
│       └── package.json
│
├── packages/
│   └── shared/                   # Shared types + utils
│       ├── src/
│       │   ├── types/            # Lead, Action, User, Campaign types
│       │   ├── constants/        # Rate limits, etc.
│       │   └── utils/            # Shared helpers
│       └── package.json
│
├── docs/                         # Documentation
├── turbo.json                    # Turborepo config
├── pnpm-workspace.yaml
├── package.json
└── .env.example
```

Note: No `apps/extension` folder since we're using Unipile instead of a Chrome extension.

---

## Build Order

| Step | What | Why First |
|------|------|-----------|
| 1 | Scaffold monorepo | Foundation for everything |
| 2 | Database schema | Defines our data model |
| 3 | Unipile integration | Core dependency, test early |
| 4 | API routes (leads, campaigns) | Backend logic |
| 5 | AI agent for messages | Message generation |
| 6 | Dashboard skeleton | Basic UI to see data |
| 7 | Cron jobs (sync, execute) | Automation loop |
| 8 | Webhooks | Real-time updates |

---

## Trade-offs Accepted

| Trade-off | Accepted Risk | Why Acceptable |
|-----------|---------------|----------------|
| Unipile dependency | Third-party service | Can build extension later if needed |
| Inngest dependency | Another service | Great DX, free tier generous (25K events/mo) |
| Neon dependency | Serverless DB | Established, Vercel partner, easy to migrate |
| Drizzle over Prisma | Smaller ecosystem | Better TS, lighter, we don't need Prisma's extras |
| No separate backend | Can't scale API independently | Next.js API routes handle our load |
| Clerk over Auth.js | Cost at scale | Free tier enough for MVP, migrate later |

---

## Tech Stack Summary

| Layer | Choice |
|-------|--------|
| Monorepo | Turborepo + pnpm |
| LinkedIn API | Unipile |
| Frontend | Next.js 15 + shadcn/ui + Tailwind |
| Backend | Next.js API Routes |
| Database | Neon PostgreSQL + Drizzle |
| Background Jobs | Inngest |
| Auth | Clerk |
| AI | Vercel AI SDK v6 + Claude |
| Hosting | Vercel |

---

## Why NOT These Alternatives

### Why not Apify?
Apify is for cold outbound scraping (company lists, search results). We're doing warm outbound (profile viewers). Unipile covers our use case with a cleaner API.

### Why not a headless browser (Playwright)?
- Detection risk is high
- Infrastructure complexity
- Unipile abstracts this away

### Why not LinkedIn's official API?
- Requires Partner Program approval (months)
- Limited features (no messaging for most use cases)
- Unipile bypasses these restrictions

### Why not build our own scraping?
- LinkedIn actively fights scrapers
- Selector maintenance is endless
- Auth challenges are complex
- This is not our core value prop

---

*Created: January 2026*
*Updated: January 2026 — Switched to Unipile architecture*
