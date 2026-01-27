# LinkedIn Automation MVP Overview

## Philosophy

Indie maker ethos: **Ship fast, iterate based on real usage.** Don't let perfect be the enemy of good enough.

**Strategy:** Warm outbound — engage people who already showed interest (profile viewers), not cold prospecting.

## Core Loop

```
Signal Capture → Lead Qualification → Message Generation → Outreach Execution
```

Get this loop working end-to-end first. Everything else is enhancement.

---

## MVP Feature Scope

### What's In

| Feature | MVP Scope |
|---------|-----------|
| **Lead Source** | Profile viewers only |
| **Qualification** | Basic filters (job title, company size) |
| **Research** | LinkedIn profile data + headline + recent posts |
| **Message Gen** | AI personalization with 3-5 context signals |
| **Execution** | Connection requests with personalized note |
| **Safety** | Unipile-managed rate limiting + our daily caps |
| **Dashboard** | View leads, review messages, basic metrics |
| **Campaigns** | Organize outreach with tone/CTA settings |

### What's Out (Phase 2+)

- Post engagers, followers, competitor monitoring
- Full ICP scoring with firmographic enrichment
- 60+ data signals (blogs, newsletters, videos)
- Voice training / tone matching
- InMails
- Multi-message sequences / follow-ups
- Smart throttling / account health monitoring
- Team / multi-seat functionality
- Agency / white-label features
- CRM integrations
- Email channel
- Slack notifications
- Advanced analytics
- Mobile app

---

## Campaign Settings

Users configure campaigns to control outreach behavior.

### Campaign Configuration

| Setting | Options | Description |
|---------|---------|-------------|
| **Campaign Name** | Free text | e.g., "January SaaS Founders" |
| **Tone of Voice** | Professional / Friendly / Direct | Controls AI message style |
| **Call-to-Action** | Book a call / Reply for info / Visit site | What you want them to do |
| **Calendar Link** | URL (optional) | Calendly/Cal.com link for easy booking |
| **Auto-approve** | On / Off | Skip manual review for this campaign |

### Example Campaign

```typescript
interface Campaign {
  id: string;
  name: string;
  tone: 'professional' | 'friendly' | 'direct';
  cta: 'book_call' | 'reply' | 'visit_site';
  calendarLink?: string;
  autoApprove: boolean;
  createdAt: Date;
  userId: string;
}
```

---

## Message Generation

AI generates personalized messages using lead context + campaign settings.

### Input Signals (What AI Sees)

| Signal | Source | Example |
|--------|--------|---------|
| First name | Profile | "Sarah" |
| Headline | Profile | "VP of Engineering at Stripe" |
| Company | Profile | "Stripe" |
| Recent post | Profile activity | "Just shipped our new API..." |
| Mutual connections | Profile | 3 shared connections |
| Tone | Campaign setting | "friendly" |
| CTA | Campaign setting | "book_call" |
| Calendar link | Campaign setting | "https://cal.com/you/30min" |

### Output Format

```typescript
interface GeneratedMessage {
  message: string;          // The actual message text
  qualityScore: number;     // 0-100
  issues: string[];         // Any quality problems
  usedSignals: string[];    // Which signals were referenced
}
```

### Example Prompt Template

```
You are writing a LinkedIn connection request for {userName}.

Lead info:
- Name: {lead.name}
- Headline: {lead.headline}
- Company: {lead.company}
- Recent activity: {lead.recentPost}

Campaign settings:
- Tone: {campaign.tone}
- Goal: {campaign.cta}
- Calendar: {campaign.calendarLink}

Rules:
- Keep under 300 characters (LinkedIn limit for connection notes)
- Reference something specific from their profile
- Match the requested tone
- Include calendar link only if CTA is "book_call"
- Never be pushy or salesy
- Sound like a real human, not a template

Write a personalized connection request.
```

### Quality Check Criteria

Message must score ≥60 to pass:

| Check | Points Deducted |
|-------|-----------------|
| Too short (<50 chars) | -30 |
| Too long (>300 chars) | -20 |
| Missing first name | -20 |
| No profile detail referenced | -25 |
| Spam phrases detected | -30 |
| Asks for meeting in first message (unless CTA is book_call) | -15 |

---

## Technical Architecture

### Components

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Dashboard     │◀───▶│  Backend API    │◀───▶│   Unipile API   │
│   (Next.js)     │     │  (Next.js API)  │     │   (LinkedIn)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │  AI Agent       │
                        │  (Vercel SDK)   │
                        └─────────────────┘
```

**Key change from extension approach:** We use Unipile's cloud API instead of a Chrome extension. This means:
- No extension to build/maintain
- No Chrome Web Store approval needed
- Unipile handles selectors, auth challenges, rate limiting
- Faster time to market

### Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Monorepo | Turborepo + pnpm | Vercel-native, shared types |
| LinkedIn API | Unipile | No Partner Program needed, 500+ endpoints |
| Backend | Next.js API Routes | No separate server needed |
| Database | Neon PostgreSQL + Drizzle | Serverless, generous free tier, great TS |
| Background Jobs | Inngest | Event-driven, retries, rate limiting |
| AI Framework | Vercel AI SDK v6 | ToolLoopAgent, streaming |
| AI Model | Claude (Anthropic) | Best for agentic reasoning |
| Frontend | Next.js 15 + shadcn/ui | Fast to ship |
| Auth | Clerk | 10 min setup |
| Hosting | Vercel | Simple deployment |

See [architecture-decisions.md](./architecture-decisions.md) for detailed rationale.

---

## Unipile Integration — How It Works

### Authentication Flow

```
User clicks "Connect LinkedIn" in Dashboard
        ↓
We generate Unipile Hosted Auth link
        ↓
User authenticates via Unipile's white-label OAuth
        ↓
Unipile handles 2FA/checkpoints automatically
        ↓
We receive account_id via webhook
        ↓
Account is connected and ready
```

### Data Flow

```
1. Capture Profile Viewers
   Backend → Unipile "Get Raw Data" → Profile viewers list → Database

2. Generate Messages
   Lead data → AI Agent → Personalized message → Actions table

3. Execute Outreach
   Approved actions → Unipile POST /users/invite → Connection sent
```

### Key Unipile Endpoints We Use

| Endpoint | Purpose |
|----------|---------|
| `POST /api/v1/linkedin` (Raw Data) | Capture profile viewers |
| `GET /api/v1/users/{id}` | Get full profile data for leads |
| `POST /api/v1/users/invite` | Send connection request with note |
| `GET /api/v1/users/invitations/sent` | Track pending invitations |
| Webhooks | Real-time: invitation accepted, messages received |

### Rate Limiting Strategy

Unipile manages LinkedIn's rate limits, but we add our own safety layer:

| Limit | Value | Rationale |
|-------|-------|-----------|
| Daily connections | 25 | Well under LinkedIn's ~100/week |
| Profile viewer sync | Every 4 hours | Don't hammer the endpoint |
| Min gap between actions | 5 minutes | Spread actions naturally |

---

## Backend (Next.js API Routes)

No separate backend server — everything runs in Next.js API routes.

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/auth/unipile/connect` | Generate Unipile auth link |
| `POST /api/webhooks/unipile` | Receive Unipile events |
| `GET /api/leads` | Dashboard fetches lead list |
| `POST /api/leads/:id/approve` | Dashboard approves message |
| `GET /api/campaigns` | Dashboard fetches campaigns |
| `POST /api/campaigns` | Create new campaign |
| `GET /api/stats` | Dashboard fetches metrics |
| `POST /api/sync/profile-viewers` | Trigger profile viewer sync |

### Background Jobs (Inngest)

| Function | Trigger | Purpose |
|----------|---------|---------|
| `sync-profile-viewers` | Cron: every 4 hours | Fetch new viewers from Unipile |
| `execute-approved-action` | Event: action.approved | Send connection request |
| `process-webhook` | Event: unipile.webhook | Handle Unipile events |
| `generate-message` | Event: lead.qualified | Generate AI message for lead |
| `check-invitation-status` | Cron: every hour | Update accepted/rejected status |

**Why Inngest over simple cron:**
- Built-in retries with exponential backoff
- Rate limiting to stay under LinkedIn limits
- Step functions for complex workflows
- Great dashboard for debugging

---

## Database Schema (Neon + Drizzle)

### Enums

```typescript
// Defined as PostgreSQL enums for type safety
tone: 'professional' | 'friendly' | 'direct'
cta: 'book_call' | 'reply' | 'visit_site'
leadStatus: 'new' | 'qualified' | 'messaged' | 'connected' | 'replied' | 'skipped'
actionStatus: 'pending' | 'approved' | 'rejected' | 'sent' | 'failed'
leadSource: 'profile_viewer'
```

### Core Tables

```typescript
// Users (synced from Clerk)
users: {
  id: string (PK, Clerk ID)
  email: string
  name?: string
  calendarLink?: string

  // Unipile connection
  unipileAccountId?: string (unique)
  linkedInProfileUrl?: string
  linkedInConnectedAt?: Date

  // Settings
  dailyLimit: number (default: 25)
  timezone: string (default: 'America/Los_Angeles')

  // Health tracking
  lastSyncAt?: Date
  lastSyncError?: string

  createdAt: Date
  updatedAt: Date
}

// Campaigns
campaigns: {
  id: string (UUID)
  userId: string (FK → users, CASCADE)

  name: string
  tone: ToneEnum (default: 'professional')
  cta: CtaEnum (default: 'reply')
  calendarLink?: string

  // Qualification filters (JSON as text)
  qualificationRules?: string // {"titleKeywords": [], "excludeCompanies": []}

  autoApprove: boolean (default: false)
  isActive: boolean (default: true)

  // Denormalized stats (updated by Inngest)
  totalLeads: number (default: 0)
  totalSent: number (default: 0)
  totalAccepted: number (default: 0)
  totalReplied: number (default: 0)

  createdAt: Date
  updatedAt: Date
}

// Leads
leads: {
  id: string (UUID)
  userId: string (FK → users, CASCADE)
  campaignId?: string (FK → campaigns, SET NULL)

  // LinkedIn identity
  linkedInId: string          // Unipile provider_id
  profileUrl: string

  // Profile data
  firstName?: string
  lastName?: string
  fullName: string
  headline?: string
  company?: string
  location?: string
  profileImageUrl?: string

  // Enrichment data
  about?: string
  recentPost?: string
  mutualConnections?: number

  // Status
  source: LeadSourceEnum (default: 'profile_viewer')
  status: LeadStatusEnum (default: 'new')

  // Timestamps
  viewedAt?: Date              // When they viewed our profile
  enrichedAt?: Date            // When we fetched full profile
  connectionAcceptedAt?: Date  // When they accepted our request

  createdAt: Date
  updatedAt: Date

  // Indexes
  UNIQUE(userId, linkedInId)   // Prevent duplicates
  INDEX(userId)
  INDEX(status)
}

// Actions (the outreach queue)
actions: {
  id: string (UUID)
  userId: string (FK → users, CASCADE)
  leadId: string (FK → leads, CASCADE)
  campaignId: string (FK → campaigns, CASCADE)

  type: string (default: 'connection_request')
  message: string

  // AI generation metadata
  qualityScore?: number (0-100)
  usedSignals?: string (JSON array as text)
  generatedAt?: Date

  // Status tracking
  status: ActionStatusEnum (default: 'pending')
  approvedAt?: Date
  rejectedAt?: Date
  sentAt?: Date

  // Unipile tracking
  unipileRequestId?: string

  // Error handling
  error?: string
  retryCount: number (default: 0)

  createdAt: Date
  updatedAt: Date

  // Indexes
  INDEX(userId)
  INDEX(status)
  INDEX(leadId)
  INDEX(sentAt)
}

// Webhook Events (for debugging)
webhookEvents: {
  id: string (UUID)
  userId?: string (FK → users, SET NULL)
  unipileAccountId?: string    // For correlation before user linked

  source: string               // 'unipile', 'clerk', etc.
  eventType: string
  payload: string (JSON as text)

  processedAt?: Date
  error?: string

  createdAt: Date

  // Indexes
  INDEX(unipileAccountId)
}
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **UUID text IDs** | Easier than auto-increment, better for distributed systems |
| **Clerk ID as user PK** | No separate internal ID needed, direct integration |
| **Denormalized campaign stats** | Avoid COUNT queries on dashboard, updated via Inngest |
| **Unique constraint on leads** | `(userId, linkedInId)` prevents duplicate leads |
| **JSON as text** | Drizzle/Neon limitation, parse in application layer |
| **Cascade deletes** | User deletion cleans up all related data |
| **Set null on campaign delete** | Preserve leads for historical value |

---

## Dashboard (MVP)

### Views Needed

1. **Onboarding** — Connect LinkedIn via Unipile
2. **Lead Queue** — New leads awaiting action
3. **Message Review** — Approve/edit before sending
4. **Campaigns** — Create and manage campaigns
5. **Sent/History** — Track what went out
6. **Settings** — Calendar link, daily limits
7. **Basic Stats** — Sent count, acceptance rate, reply rate

Keep it simple. Tables and basic stats. No fancy charts.

---

## Biggest Risks

### 1. Unipile Dependency

We're relying on a third-party service.

**Mitigations:**
- Unipile is established with good documentation
- We can always build extension later if needed
- Per-account cost is manageable for MVP validation

### 2. LinkedIn Detection

Even with Unipile, LinkedIn can detect automation patterns.

**Why Unipile is safer than DIY:**
- They maintain session persistence
- Handle checkpoint challenges automatically
- Manage rate limiting intelligently
- Update when LinkedIn changes

**Our additional safety:**
- Stay well under rate limits (25/day vs 100/week allowed)
- Only warm outreach (profile viewers = implicit interest)
- Personalized messages (not templates)

### 3. Message Quality

Bad AI messages = spam complaints = bans.

**Mitigation:**
- Quality scoring with minimum threshold (≥60)
- Human approval by default
- Specific profile details required
- No spam phrases allowed

---

## Success Metrics (MVP)

- [ ] Can connect LinkedIn via Unipile
- [ ] Can sync profile viewers
- [ ] Can create campaigns with tone/CTA settings
- [ ] Can generate personalized messages (quality score ≥60)
- [ ] Can send connection requests via Unipile
- [ ] Webhooks receive invitation accepted events
- [ ] Basic dashboard shows activity
- [ ] One real user (founder) runs it for 1 week without issues

---

## Build Order

| Step | What | Why First |
|------|------|-----------|
| 1 | Scaffold monorepo | Foundation for everything |
| 2 | Database schema (Neon + Drizzle) | Defines our data model |
| 3 | Unipile integration | Core dependency, test early |
| 4 | Inngest setup | Background job infrastructure |
| 5 | API routes (leads, campaigns) | Backend logic |
| 6 | AI agent for messages | Message generation |
| 7 | Dashboard skeleton | Basic UI to see data |
| 8 | Inngest functions (sync, execute) | Automation loop |
| 9 | Webhooks (Unipile → Inngest) | Real-time updates |

---

## Phase 2 Considerations (Post-MVP)

- Slack notifications (reply alerts, daily summary)
- Email channel via Unipile
- Multi-message sequences / follow-ups
- Post engagers as lead source
- Voice/tone training from user's sent messages
- Advanced analytics
- Chrome extension for organic capture (hybrid approach)

---

*Created: January 2026*
*Updated: January 2026 — Switched to Unipile architecture*
