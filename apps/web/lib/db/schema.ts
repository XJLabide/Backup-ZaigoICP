/**
 * Drizzle ORM schema for Neon PostgreSQL.
 *
 * This schema defines all database tables for the LinkedIn automation platform.
 */

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
  qualificationRules: text('qualification_rules'),

  // Behavior
  autoApprove: boolean('auto_approve').default(false),
  isActive: boolean('is_active').default(true),

  // Denormalized stats
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
    linkedInId: text('linkedin_id').notNull(),
    profileUrl: text('profile_url').notNull(),

    // Profile data (basic)
    firstName: text('first_name'),
    lastName: text('last_name'),
    fullName: text('full_name').notNull(),
    headline: text('headline'),
    company: text('company'),
    location: text('location'),
    profileImageUrl: text('profile_image_url'),

    // Enrichment data
    about: text('about'),
    recentPost: text('recent_post'),
    mutualConnections: integer('mutual_connections'),

    // Status tracking
    source: leadSourceEnum('source').notNull().default('profile_viewer'),
    status: leadStatusEnum('status').notNull().default('new'),

    // Important timestamps
    viewedAt: timestamp('viewed_at'),
    enrichedAt: timestamp('enriched_at'),
    connectionAcceptedAt: timestamp('connection_accepted_at'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userLinkedInUnique: uniqueIndex('leads_user_linkedin_unique').on(
      table.userId,
      table.linkedInId
    ),
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
    qualityScore: integer('quality_score'),
    usedSignals: text('used_signals'),
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
    unipileAccountId: text('unipile_account_id'),

    // Event details
    source: text('source').notNull(),
    eventType: text('event_type').notNull(),
    payload: text('payload').notNull(),

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

// ============ PROCESSED WEBHOOKS (Idempotency) ============

export const processedWebhooks = pgTable('processed_webhooks', {
  eventId: text('event_id').primaryKey(), // SHA256 hash of raw webhook body
  eventType: text('event_type').notNull(),
  processedAt: timestamp('processed_at'), // Nullable: null = in progress, set = completed
  payload: text('payload'), // JSON stringified for debugging
});

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
