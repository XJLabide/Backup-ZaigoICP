# Unipile Integration Guide

Detailed implementation guide for integrating Unipile's LinkedIn API into our warm outbound automation platform.

---

## Overview

Unipile provides a unified REST API for LinkedIn without requiring LinkedIn Partner Program approval. We use it for:

1. **Profile viewer capture** — Who viewed our profile
2. **Profile data extraction** — Lead enrichment
3. **Connection requests** — Sending personalized outreach
4. **Webhook events** — Real-time status updates

---

## Authentication Flow

### Hosted Auth (Recommended for MVP)

Unipile provides a white-label OAuth flow that handles all auth complexity.

```typescript
// lib/unipile/client.ts

import { UnipileClient } from 'unipile-node-sdk';

export const unipile = new UnipileClient(
  process.env.UNIPILE_DSN!,
  process.env.UNIPILE_ACCESS_TOKEN!
);

// Generate hosted auth link for user
export async function generateAuthLink(userId: string): Promise<string> {
  const result = await unipile.account.createHostedAuthLink({
    type: 'create',
    provider: 'LINKEDIN',
    success_redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/success`,
    failure_redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/error`,
    expiresOn: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
    notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/unipile`,
    api_url: process.env.UNIPILE_DSN,
    name: userId, // We use this to identify the user in webhooks
  });

  return result.url;
}
```

### Auth Flow Sequence

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Dashboard     │     │   Unipile       │     │   LinkedIn      │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │ 1. Click "Connect"    │                       │
         │──────────────────────▶│                       │
         │                       │                       │
         │ 2. Return auth URL    │                       │
         │◀──────────────────────│                       │
         │                       │                       │
         │ 3. Redirect user      │                       │
         │───────────────────────│──────────────────────▶│
         │                       │                       │
         │                       │ 4. User logs in       │
         │                       │◀──────────────────────│
         │                       │                       │
         │                       │ 5. Handle 2FA/checkpoints
         │                       │◀─────────────────────▶│
         │                       │                       │
         │ 6. Webhook: connected │                       │
         │◀──────────────────────│                       │
         │                       │                       │
         │ 7. Redirect to success│                       │
         │◀──────────────────────│                       │
```

### API Route: Generate Auth Link

```typescript
// app/api/auth/unipile/connect/route.ts

import { auth } from '@clerk/nextjs/server';
import { generateAuthLink } from '@/lib/unipile/client';

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const authUrl = await generateAuthLink(userId);
  return Response.json({ url: authUrl });
}
```

---

## Webhook Handling

Unipile sends events for account status changes and new messages.

### Webhook Types We Handle

| Event Type | Purpose | Our Action |
|------------|---------|------------|
| `account.connected` | LinkedIn account linked | Store `account_id` for user |
| `account.disconnected` | Session expired | Notify user to reconnect |
| `account.checkpoint` | 2FA/verification needed | Notify user |
| `message.received` | New LinkedIn message | Track replies |
| `invitation.accepted` | Connection accepted | Update lead status |

### Webhook Handler

```typescript
// app/api/webhooks/unipile/route.ts

import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { users, leads, webhookEvents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  const body = await request.json();
  const headersList = headers();

  // Verify webhook signature (if configured)
  const signature = headersList.get('Unipile-Signature');
  // TODO: Verify signature against secret

  // Log all events for debugging
  await db.insert(webhookEvents).values({
    eventType: body.event,
    payload: body,
    createdAt: new Date(),
  });

  switch (body.event) {
    case 'account.connected':
      await handleAccountConnected(body);
      break;
    case 'account.disconnected':
      await handleAccountDisconnected(body);
      break;
    case 'invitation.accepted':
      await handleInvitationAccepted(body);
      break;
    case 'message.received':
      await handleMessageReceived(body);
      break;
    // Add more handlers as needed
  }

  return Response.json({ received: true });
}

async function handleAccountConnected(body: any) {
  const userId = body.name; // We passed userId as 'name' in auth link
  const accountId = body.account_id;

  await db.update(users)
    .set({
      unipileAccountId: accountId,
      linkedInConnectedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

async function handleAccountDisconnected(body: any) {
  const accountId = body.account_id;

  await db.update(users)
    .set({
      unipileAccountId: null,
      linkedInConnectedAt: null,
      lastSyncError: 'Account disconnected',
      updatedAt: new Date(),
    })
    .where(eq(users.unipileAccountId, accountId));

  // TODO: Send notification to user
}

async function handleInvitationAccepted(body: any) {
  // When someone accepts our connection request
  const acceptedById = body.invitee?.provider_id;
  if (!acceptedById) return;

  // Update lead status
  await db.update(leads)
    .set({
      status: 'connected',
      connectionAcceptedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(leads.linkedInId, acceptedById));

  // Update campaign stats
  const lead = await db.query.leads.findFirst({
    where: eq(leads.linkedInId, acceptedById),
  });

  if (lead?.campaignId) {
    await db.update(campaigns)
      .set({
        totalAccepted: sql`${campaigns.totalAccepted} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, lead.campaignId));
  }
}

async function handleMessageReceived(body: any) {
  // Check if this is a reply to our outreach
  const senderId = body.sender?.provider_id;
  if (!senderId) return;

  // Update lead status if we messaged them
  await db.update(leads)
    .set({
      status: 'replied',
      updatedAt: new Date(),
    })
    .where(eq(leads.linkedInId, senderId));

  // Update campaign stats
  const lead = await db.query.leads.findFirst({
    where: eq(leads.linkedInId, senderId),
  });

  if (lead?.campaignId) {
    await db.update(campaigns)
      .set({
        totalReplied: sql`${campaigns.totalReplied} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, lead.campaignId));
  }
}
```

---

## Capturing Profile Viewers

This is the core of our warm outbound strategy — getting people who already showed interest.

### The "Get Raw Data" Approach

Unipile's standard endpoints don't expose profile viewers directly. We use the "Magic Route" to access this data.

```typescript
// lib/unipile/profile-viewers.ts

import { unipile } from './client';

interface ProfileViewer {
  linkedInId: string;
  profileUrl: string;
  name: string;
  headline: string;
  viewedAt: Date;
}

export async function getProfileViewers(
  accountId: string
): Promise<ProfileViewer[]> {
  // Use the raw LinkedIn endpoint for profile viewers
  const response = await unipile.request.send({
    path: ['linkedin'],
    method: 'POST',
    parameters: { account_id: accountId },
    body: {
      method: 'GET',
      request_url: 'https://www.linkedin.com/voyager/api/identity/wvmpCards',
      encoding: false,
    },
  });

  // Parse the response into our format
  const viewers: ProfileViewer[] = [];

  for (const card of response.data?.elements || []) {
    if (card.insightCard?.insight?.profileViewer) {
      const viewer = card.insightCard.insight.profileViewer;
      viewers.push({
        linkedInId: extractLinkedInId(viewer.actorUrn),
        profileUrl: `https://www.linkedin.com/in/${viewer.publicIdentifier}`,
        name: `${viewer.firstName} ${viewer.lastName}`,
        headline: viewer.headline || '',
        viewedAt: new Date(card.insightCard.createdAt),
      });
    }
  }

  return viewers;
}

function extractLinkedInId(urn: string): string {
  // urn:li:fs_miniProfile:abc123 -> abc123
  return urn.split(':').pop() || '';
}
```

### Sync Job

```typescript
// app/api/sync/profile-viewers/route.ts

import { db } from '@/lib/db';
import { users, leads } from '@/lib/db/schema';
import { getProfileViewers } from '@/lib/unipile/profile-viewers';
import { eq, and } from 'drizzle-orm';

export async function POST() {
  // Get all users with connected LinkedIn
  const connectedUsers = await db.select()
    .from(users)
    .where(users.unipileAccountId.isNotNull());

  let totalSynced = 0;

  for (const user of connectedUsers) {
    try {
      const viewers = await getProfileViewers(user.unipileAccountId!);

      for (const viewer of viewers) {
        // Check if we already have this lead
        const existing = await db.select()
          .from(leads)
          .where(and(
            eq(leads.userId, user.id),
            eq(leads.linkedInId, viewer.linkedInId)
          ))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(leads).values({
            userId: user.id,
            linkedInId: viewer.linkedInId,
            profileUrl: viewer.profileUrl,
            fullName: viewer.name,
            headline: viewer.headline,
            viewedAt: viewer.viewedAt,
            source: 'profile_viewer',
            status: 'new',
          });
          totalSynced++;
        }
      }
    } catch (error) {
      console.error(`Error syncing for user ${user.id}:`, error);
    }
  }

  return Response.json({ synced: totalSynced });
}
```

### Inngest Function for Sync

```typescript
// lib/inngest/functions/sync-profile-viewers.ts

import { inngest } from '../client';
import { db } from '@/lib/db';
import { users, leads } from '@/lib/db/schema';
import { getProfileViewers } from '@/lib/unipile/profile-viewers';
import { eq, and } from 'drizzle-orm';

export const syncProfileViewers = inngest.createFunction(
  {
    id: 'sync-profile-viewers',
    retries: 3,
  },
  { cron: '0 */4 * * *' }, // Every 4 hours
  async ({ step }) => {
    // Get all users with connected LinkedIn
    const connectedUsers = await step.run('get-connected-users', async () => {
      return db.select()
        .from(users)
        .where(users.unipileAccountId.isNotNull());
    });

    let totalSynced = 0;

    for (const user of connectedUsers) {
      const synced = await step.run(`sync-user-${user.id}`, async () => {
        const viewers = await getProfileViewers(user.unipileAccountId!);
        let count = 0;

        for (const viewer of viewers) {
          const existing = await db.select()
            .from(leads)
            .where(and(
              eq(leads.userId, user.id),
              eq(leads.linkedInId, viewer.linkedInId)
            ))
            .limit(1);

          if (existing.length === 0) {
            await db.insert(leads).values({
              userId: user.id,
              linkedInId: viewer.linkedInId,
              profileUrl: viewer.profileUrl,
              fullName: viewer.name,
              headline: viewer.headline,
              viewedAt: viewer.viewedAt,
              source: 'profile_viewer',
              status: 'new',
            });
            count++;
          }
        }
        return count;
      });

      totalSynced += synced;
    }

    return { synced: totalSynced };
  }
);
```

---

## Fetching Full Profile Data

When we need more data about a lead for message personalization.

```typescript
// lib/unipile/profiles.ts

import { unipile } from './client';

interface LinkedInProfile {
  linkedInId: string;
  name: string;
  headline: string;
  company?: string;
  location?: string;
  about?: string;
  experience: Array<{
    title: string;
    company: string;
    current: boolean;
  }>;
  recentPosts?: string[];
}

export async function getFullProfile(
  accountId: string,
  profileUrl: string
): Promise<LinkedInProfile | null> {
  try {
    const profile = await unipile.users.getProfile({
      account_id: accountId,
      identifier: profileUrl,
      linkedin_sections: ['experience', 'about'],
      notify: false, // Don't notify them we viewed
    });

    const currentJob = profile.positions?.find((p: any) => p.isCurrent);

    return {
      linkedInId: profile.provider_id,
      name: `${profile.first_name} ${profile.last_name}`,
      headline: profile.headline,
      company: currentJob?.company_name,
      location: profile.location,
      about: profile.about,
      experience: (profile.positions || []).map((p: any) => ({
        title: p.title,
        company: p.company_name,
        current: p.isCurrent,
      })),
    };
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
}
```

---

## Sending Connection Requests

The core outreach action.

```typescript
// lib/unipile/invitations.ts

import { unipile } from './client';

interface InvitationResult {
  success: boolean;
  requestId?: string;
  error?: string;
}

export async function sendConnectionRequest(
  accountId: string,
  profileUrl: string,
  message: string
): Promise<InvitationResult> {
  try {
    const result = await unipile.users.sendInvitation({
      account_id: accountId,
      provider_id: profileUrl, // Can use URL or provider_id
      message: message.substring(0, 300), // LinkedIn limit
    });

    return {
      success: true,
      requestId: result.id,
    };
  } catch (error: any) {
    console.error('Error sending invitation:', error);

    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}
```

### Action Execution (Inngest)

```typescript
// lib/inngest/functions/execute-action.ts

import { inngest } from '../client';
import { db } from '@/lib/db';
import { actions, leads, users } from '@/lib/db/schema';
import { sendConnectionRequest } from '@/lib/unipile/invitations';
import { eq, and, gte } from 'drizzle-orm';

const DAILY_LIMIT = 25;

export const executeApprovedAction = inngest.createFunction(
  {
    id: 'execute-approved-action',
    retries: 2,
    // Rate limit: max 1 action per 5 minutes per user
    rateLimit: {
      key: 'event.data.userId',
      limit: 1,
      period: '5m',
    },
  },
  { event: 'action/approved' },
  async ({ event, step }) => {
    const { actionId, userId } = event.data;

    // Check daily limit
    const canExecute = await step.run('check-daily-limit', async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const sentToday = await db.select()
        .from(actions)
        .where(and(
          eq(actions.userId, userId),
          eq(actions.status, 'sent'),
          gte(actions.sentAt, todayStart)
        ));

      return sentToday.length < DAILY_LIMIT;
    });

    if (!canExecute) {
      return { skipped: true, reason: 'daily_limit_reached' };
    }

    // Get action details
    const actionData = await step.run('get-action-data', async () => {
      const result = await db.select({
        action: actions,
        lead: leads,
        user: users,
      })
      .from(actions)
      .innerJoin(leads, eq(actions.leadId, leads.id))
      .innerJoin(users, eq(actions.userId, users.id))
      .where(eq(actions.id, actionId))
      .limit(1);

      return result[0];
    });

    if (!actionData) {
      throw new Error(`Action ${actionId} not found`);
    }

    const { action, lead, user } = actionData;

    // Execute the connection request
    const result = await step.run('send-connection-request', async () => {
      return sendConnectionRequest(
        user.unipileAccountId!,
        lead.profileUrl,
        action.message
      );
    });

    // Update status based on result
    await step.run('update-status', async () => {
      if (result.success) {
        await db.update(actions)
          .set({
            status: 'sent',
            sentAt: new Date(),
            unipileRequestId: result.requestId,
          })
          .where(eq(actions.id, action.id));

        await db.update(leads)
          .set({ status: 'messaged' })
          .where(eq(leads.id, lead.id));
      } else {
        await db.update(actions)
          .set({
            status: 'failed',
            error: result.error,
          })
          .where(eq(actions.id, action.id));
      }
    });

    return { success: result.success, actionId };
  }
);
```

### Triggering the Action

When an action is approved in the dashboard:

```typescript
// app/api/leads/[id]/approve/route.ts

import { inngest } from '@/lib/inngest/client';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  // ... approve logic ...

  // Trigger Inngest function
  await inngest.send({
    name: 'action/approved',
    data: {
      actionId: action.id,
      userId: action.userId,
    },
  });

  return Response.json({ success: true });
}
```

---

## Error Handling

### Common Unipile Errors

| Error Type | Meaning | Our Response |
|------------|---------|--------------|
| `errors/invalid_credentials` | Auth failed | Prompt user to reconnect |
| `errors/checkpoint_error` | 2FA needed | Show notification |
| `errors/disconnected_account` | Session expired | Prompt reconnect |
| `errors/rate_limit` | Too many requests | Back off, retry later |
| `errors/profile_not_found` | Invalid LinkedIn URL | Mark lead as skipped |

### Error Handler

```typescript
// lib/unipile/errors.ts

import { UnsuccessfulRequestError } from 'unipile-node-sdk';

export function handleUnipileError(error: unknown): {
  type: string;
  message: string;
  retryable: boolean;
} {
  if (error instanceof UnsuccessfulRequestError) {
    const { type, status } = error.body;

    switch (type) {
      case 'errors/invalid_credentials':
      case 'errors/disconnected_account':
        return {
          type: 'auth_error',
          message: 'LinkedIn connection expired. Please reconnect.',
          retryable: false,
        };

      case 'errors/checkpoint_error':
        return {
          type: 'checkpoint',
          message: 'LinkedIn requires verification. Please check your account.',
          retryable: false,
        };

      case 'errors/rate_limit':
        return {
          type: 'rate_limit',
          message: 'Rate limited. Will retry later.',
          retryable: true,
        };

      default:
        return {
          type: 'unknown',
          message: error.message || 'Unknown Unipile error',
          retryable: false,
        };
    }
  }

  return {
    type: 'network',
    message: String(error),
    retryable: true,
  };
}
```

---

## Inngest Setup

### Client Configuration

```typescript
// lib/inngest/client.ts

import { Inngest, EventSchemas } from 'inngest';

export const inngest = new Inngest({
  id: 'linkedin-automation',
  schemas: new EventSchemas().fromRecord<{
    'action/approved': { data: { actionId: string; userId: string } };
    'lead/qualified': { data: { leadId: string; userId: string; campaignId: string } };
    'unipile/webhook': { data: { event: string; payload: any } };
  }>(),
});
```

### Register Functions

```typescript
// lib/inngest/index.ts

import { syncProfileViewers } from './functions/sync-profile-viewers';
import { executeApprovedAction } from './functions/execute-action';
import { generateMessage } from './functions/generate-message';

export const functions = [
  syncProfileViewers,
  executeApprovedAction,
  generateMessage,
];
```

### API Route

```typescript
// app/api/inngest/route.ts

import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { functions } from '@/lib/inngest';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
```

---

## Environment Variables

```bash
# .env.example

# Unipile Configuration
UNIPILE_DSN=https://api1.unipile.com:13111
UNIPILE_ACCESS_TOKEN=your_access_token_here

# App URLs (for OAuth redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Webhook secret for signature verification
UNIPILE_WEBHOOK_SECRET=your_webhook_secret

# Neon Database
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# Inngest
INNGEST_EVENT_KEY=your_inngest_event_key
INNGEST_SIGNING_KEY=your_inngest_signing_key
```

---

## Rate Limit Strategy

### Our Safety Layer

Even though Unipile manages LinkedIn's rate limits, we add our own conservative limits:

```typescript
// lib/constants/limits.ts

export const LIMITS = {
  // Daily limits (well under LinkedIn's ~100/week)
  DAILY_CONNECTIONS: 25,

  // Timing
  MIN_GAP_BETWEEN_ACTIONS_MS: 5 * 60 * 1000, // 5 minutes
  PROFILE_VIEWER_SYNC_INTERVAL: '0 */4 * * *', // Every 4 hours

  // Quality
  MIN_MESSAGE_QUALITY_SCORE: 60,
  MAX_MESSAGE_LENGTH: 300, // LinkedIn limit
  MIN_MESSAGE_LENGTH: 50,
};
```

### Why So Conservative?

| LinkedIn Limit | Our Limit | Why |
|----------------|-----------|-----|
| ~100 connections/week | 25/day (~175/week) | Stay under to avoid flags |
| No explicit message limit | 5 min gaps | Spread actions naturally |
| Profile views: 80-150/day | Every 4 hours sync | Don't hammer endpoint |

---

## Testing Unipile Integration

### Manual Testing Checklist

- [ ] Generate auth link → Opens Unipile OAuth
- [ ] Complete LinkedIn login → Webhook fires `account.connected`
- [ ] User record updates with `unipileAccountId`
- [ ] Profile viewer sync returns data
- [ ] Send test connection request
- [ ] Webhook fires when invitation accepted

### Test Account Recommendations

1. Use a test LinkedIn account (not your main)
2. Keep daily volume low during testing
3. Monitor for any LinkedIn warnings
4. Test checkpoint handling with 2FA enabled

---

## Monitoring & Observability

### Key Metrics to Track

| Metric | Why |
|--------|-----|
| Webhook event volume | Ensure we're receiving events |
| Profile viewer sync count | Are we capturing leads? |
| Action success rate | Are invitations sending? |
| Error rate by type | Identify integration issues |
| Daily limit utilization | Track usage per user |

### Logging Strategy

```typescript
// lib/logger.ts

export function logUnipileEvent(event: string, data: any) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    source: 'unipile',
    event,
    ...data,
  }));
}
```

---

## Migration Path

If we ever need to move away from Unipile:

1. **Core product is independent** — AI messaging, campaigns, dashboard don't depend on Unipile
2. **Extension fallback** — Can build Chrome extension using same data model
3. **Data portable** — All leads and actions stored in our database

---

*Created: January 2026*
