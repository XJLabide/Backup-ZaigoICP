# Database Schema

Complete Drizzle schema for Neon PostgreSQL.

---

## Overview

| Table | Purpose |
|-------|---------|
| `users` | User accounts (synced from Clerk) |
| `campaigns` | Outreach campaigns with tone/CTA settings |
| `leads` | Captured profile viewers |
| `actions` | Outreach queue (connection requests) |
| `webhookEvents` | Debugging log for Unipile/Clerk events |

---

## Full Schema Implementation

```typescript
// lib/db/schema.ts

import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============ ENUMS ============

export const toneEnum = pgEnum('tone', ['professional', 'friendly', 'direct']);

export const ctaEnum = pgEnum('cta', ['book_call', 'reply', 'visit_site']);

export const leadStatusEnum = pgEnum('lead_status', [
  'new',
  'qualified',
  'messaged',
  'connected',
  'replied',
  'skipped',
]);

export const actionStatusEnum = pgEnum('action_status', [
  'pending',
  'approved',
  'rejected',
  'sent',
  'failed',
]);

export const leadSourceEnum = pgEnum('lead_source', ['profile_viewer']);

// ============ USERS ============

export const users = pgTable('users', {
  // Primary key is Clerk user ID
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name'),
  calendarLink: text('calendar_link'),

  // Unipile LinkedIn connection
  unipileAccountId: text('unipile_account_id').unique(),
  linkedInProfileUrl: text('linkedin_profile_url'),
  linkedInConnectedAt: timestamp('linkedin_connected_at'),

  // User settings
  dailyLimit: integer('daily_limit').default(25),
  timezone: text('timezone').default('America/Los_Angeles'),

  // Connection health tracking
  lastSyncAt: timestamp('last_sync_at'),
  lastSyncError: text('last_sync_error'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============ CAMPAIGNS ============

export const campaigns = pgTable('campaigns', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Campaign settings
  name: text('name').notNull(),
  tone: toneEnum('tone').notNull().default('professional'),
  cta: ctaEnum('cta').notNull().default('reply'),
  calendarLink: text('calendar_link'),

  // Qualification rules (JSON as text)
  // Example: {"titleKeywords": ["founder", "ceo"], "excludeCompanies": ["competitor"]}
  qualificationRules: text('qualification_rules'),

  // Behavior
  autoApprove: boolean('auto_approve').default(false),
  isActive: boolean('is_active').default(true),

  // Denormalized stats (updated by Inngest functions)
  totalLeads: integer('total_leads').default(0),
  totalSent: integer('total_sent').default(0),
  totalAccepted: integer('total_accepted').default(0),
  totalReplied: integer('total_replied').default(0),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============ LEADS ============

export const leads = pgTable(
  'leads',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    campaignId: text('campaign_id').references(() => campaigns.id, {
      onDelete: 'set null',
    }),

    // LinkedIn identity
    linkedInId: text('linkedin_id').notNull(), // Unipile provider_id
    profileUrl: text('profile_url').notNull(),

    // Profile data (basic)
    firstName: text('first_name'),
    lastName: text('last_name'),
    fullName: text('full_name').notNull(),
    headline: text('headline'),
    company: text('company'),
    location: text('location'),
    profileImageUrl: text('profile_image_url'),

    // Enrichment data (from full profile fetch)
    about: text('about'),
    recentPost: text('recent_post'),
    mutualConnections: integer('mutual_connections'),

    // Status tracking
    source: leadSourceEnum('source').notNull().default('profile_viewer'),
    status: leadStatusEnum('status').notNull().default('new'),

    // Important timestamps
    viewedAt: timestamp('viewed_at'), // When they viewed our profile
    enrichedAt: timestamp('enriched_at'), // When we fetched full profile
    connectionAcceptedAt: timestamp('connection_accepted_at'), // When they accepted

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    // Prevent duplicate leads per user
    userLinkedInUnique: uniqueIndex('leads_user_linkedin_unique').on(
      table.userId,
      table.linkedInId
    ),
    // Query optimization indexes
    userIdIdx: index('leads_user_id_idx').on(table.userId),
    statusIdx: index('leads_status_idx').on(table.status),
    campaignIdIdx: index('leads_campaign_id_idx').on(table.campaignId),
  })
);

// ============ ACTIONS ============

export const actions = pgTable(
  'actions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    leadId: text('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    campaignId: text('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),

    // Action details
    type: text('type').notNull().default('connection_request'),
    message: text('message').notNull(),

    // AI generation metadata
    qualityScore: integer('quality_score'), // 0-100
    usedSignals: text('used_signals'), // JSON array as text
    generatedAt: timestamp('generated_at'),

    // Status tracking
    status: actionStatusEnum('status').notNull().default('pending'),
    approvedAt: timestamp('approved_at'),
    rejectedAt: timestamp('rejected_at'),
    sentAt: timestamp('sent_at'),

    // Unipile tracking
    unipileRequestId: text('unipile_request_id'),

    // Error handling
    error: text('error'),
    retryCount: integer('retry_count').default(0),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('actions_user_id_idx').on(table.userId),
    statusIdx: index('actions_status_idx').on(table.status),
    leadIdIdx: index('actions_lead_id_idx').on(table.leadId),
    sentAtIdx: index('actions_sent_at_idx').on(table.sentAt),
  })
);

// ============ WEBHOOK EVENTS ============

export const webhookEvents = pgTable(
  'webhook_events',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    unipileAccountId: text('unipile_account_id'), // For correlation

    // Event details
    source: text('source').notNull(), // 'unipile', 'clerk', etc.
    eventType: text('event_type').notNull(),
    payload: text('payload').notNull(), // JSON as text

    // Processing
    processedAt: timestamp('processed_at'),
    error: text('error'),

    // Timestamp
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    accountIdIdx: index('webhook_events_account_id_idx').on(
      table.unipileAccountId
    ),
    createdAtIdx: index('webhook_events_created_at_idx').on(table.createdAt),
  })
);

// ============ RELATIONS ============

export const usersRelations = relations(users, ({ many }) => ({
  campaigns: many(campaigns),
  leads: many(leads),
  actions: many(actions),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  user: one(users, {
    fields: [campaigns.userId],
    references: [users.id],
  }),
  leads: many(leads),
  actions: many(actions),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  user: one(users, {
    fields: [leads.userId],
    references: [users.id],
  }),
  campaign: one(campaigns, {
    fields: [leads.campaignId],
    references: [campaigns.id],
  }),
  actions: many(actions),
}));

export const actionsRelations = relations(actions, ({ one }) => ({
  user: one(users, {
    fields: [actions.userId],
    references: [users.id],
  }),
  lead: one(leads, {
    fields: [actions.leadId],
    references: [leads.id],
  }),
  campaign: one(campaigns, {
    fields: [actions.campaignId],
    references: [campaigns.id],
  }),
}));
```

---

## Type Exports

```typescript
// lib/db/types.ts

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { users, campaigns, leads, actions, webhookEvents } from './schema';

// Select types (for reading)
export type User = InferSelectModel<typeof users>;
export type Campaign = InferSelectModel<typeof campaigns>;
export type Lead = InferSelectModel<typeof leads>;
export type Action = InferSelectModel<typeof actions>;
export type WebhookEvent = InferSelectModel<typeof webhookEvents>;

// Insert types (for creating)
export type NewUser = InferInsertModel<typeof users>;
export type NewCampaign = InferInsertModel<typeof campaigns>;
export type NewLead = InferInsertModel<typeof leads>;
export type NewAction = InferInsertModel<typeof actions>;
export type NewWebhookEvent = InferInsertModel<typeof webhookEvents>;

// Enum types
export type Tone = 'professional' | 'friendly' | 'direct';
export type Cta = 'book_call' | 'reply' | 'visit_site';
export type LeadStatus = 'new' | 'qualified' | 'messaged' | 'connected' | 'replied' | 'skipped';
export type ActionStatus = 'pending' | 'approved' | 'rejected' | 'sent' | 'failed';
export type LeadSource = 'profile_viewer';
```

---

## Database Client Setup

```typescript
// lib/db/index.ts

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });

// Re-export schema and types
export * from './schema';
export * from './types';
```

---

## Drizzle Config

```typescript
// drizzle.config.ts

import type { Config } from 'drizzle-kit';

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

---

## Common Queries

### Get user's leads with campaign info

```typescript
const userLeads = await db.query.leads.findMany({
  where: eq(leads.userId, userId),
  with: {
    campaign: true,
  },
  orderBy: [desc(leads.createdAt)],
});
```

### Get pending actions for execution

```typescript
const pendingActions = await db
  .select({
    action: actions,
    lead: leads,
    user: users,
  })
  .from(actions)
  .innerJoin(leads, eq(actions.leadId, leads.id))
  .innerJoin(users, eq(actions.userId, users.id))
  .where(eq(actions.status, 'approved'))
  .limit(10);
```

### Count today's sent actions

```typescript
const todayStart = new Date();
todayStart.setHours(0, 0, 0, 0);

const sentToday = await db
  .select({ count: count() })
  .from(actions)
  .where(
    and(
      eq(actions.userId, userId),
      eq(actions.status, 'sent'),
      gte(actions.sentAt, todayStart)
    )
  );
```

### Upsert lead (with duplicate handling)

```typescript
import { sql } from 'drizzle-orm';

await db
  .insert(leads)
  .values({
    userId,
    linkedInId: viewer.linkedInId,
    profileUrl: viewer.profileUrl,
    fullName: viewer.name,
    headline: viewer.headline,
    viewedAt: viewer.viewedAt,
    source: 'profile_viewer',
    status: 'new',
  })
  .onConflictDoUpdate({
    target: [leads.userId, leads.linkedInId],
    set: {
      viewedAt: viewer.viewedAt, // Update last view time
      updatedAt: new Date(),
    },
  });
```

---

## Migrations

```bash
# Generate migration
pnpm drizzle-kit generate:pg

# Push to database (dev)
pnpm drizzle-kit push:pg

# Run migrations (prod)
pnpm drizzle-kit migrate
```

---

## Environment Variables

```bash
# Neon Database
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

---

*Created: January 2026*
