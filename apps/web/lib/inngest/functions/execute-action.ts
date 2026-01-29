/**
 * Inngest function: execute-action
 *
 * Triggers on action/approved event to send LinkedIn connection requests.
 * Enforces daily limits, rate gaps, and updates action status.
 */

import { NonRetriableError } from 'inngest';
import { inngest } from '../client';
import { db, actions, leads, users } from '@/lib/db';
import { eq, and, gte, desc, count } from 'drizzle-orm';
import { sendConnectionRequest } from '@/lib/unipile/invitations';

/**
 * Inngest function that executes approved LinkedIn connection requests.
 *
 * Event: action/approved
 * Idempotency: Uses actionId as idempotency key
 * Throttle: 1 per 5 minutes per user (enforces minimum gap between invitations)
 * Retries: 2 (fewer retries since rate limits are handled manually)
 *
 * Flow:
 * 1. Fetch action with related lead and user data
 * 2. Check daily limit (default 25 per day)
 * 3. Check rate gap (minimum 5 minutes between sends)
 * 4. Send connection request via Unipile
 * 5. Update action status (sent or failed)
 * 6. Emit action/sent event on success
 */
export const executeActionFunction = inngest.createFunction(
  {
    id: 'execute-action',
    // Idempotency: prevent duplicate execution
    idempotency: 'event.data.actionId',
    // Throttle: 1 per 5 minutes per user to enforce gap
    throttle: {
      key: 'event.data.userId',
      limit: 1,
      period: '5m',
    },
    // Retries: 2 with exponential backoff
    retries: 2,
  },
  { event: 'action/approved' },
  async ({ event, step }) => {
    const { actionId, userId } = event.data;

    // Step 1: Fetch action with lead and user data
    const actionData = await step.run('fetch-action-data', async () => {
      const result = await db
        .select({
          action: actions,
          lead: leads,
          user: users,
        })
        .from(actions)
        .innerJoin(leads, eq(actions.leadId, leads.id))
        .innerJoin(users, eq(actions.userId, users.id))
        .where(and(eq(actions.id, actionId), eq(actions.userId, userId)))
        .limit(1);

      if (result.length === 0) {
        throw new NonRetriableError(`Action not found: ${actionId}`);
      }

      const { action, lead, user } = result[0];

      // Validate required fields
      if (!lead.linkedInId) {
        throw new NonRetriableError(`Lead ${lead.id} has no linkedInId`);
      }

      if (!user.unipileAccountId) {
        throw new NonRetriableError(`User ${user.id} has no unipileAccountId`);
      }

      return { action, lead, user };
    });

    const { action, lead, user } = actionData;

    // Step 2: Check daily limit
    await step.run('check-daily-limit', async () => {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const [result] = await db
        .select({ count: count() })
        .from(actions)
        .where(
          and(
            eq(actions.userId, userId),
            eq(actions.status, 'sent'),
            gte(actions.sentAt, today)
          )
        );

      const dailyLimit = user.dailyLimit ?? 25;
      const sentToday = result?.count ?? 0;

      if (sentToday >= dailyLimit) {
        throw new NonRetriableError(
          `Daily limit reached: ${sentToday}/${dailyLimit} invitations sent today`
        );
      }

      console.info(
        `[execute-action] Daily limit check passed: ${sentToday}/${dailyLimit}`
      );
    });

    // Step 3: Check rate gap (minimum 5 minutes between sends)
    await step.run('check-rate-gap', async () => {
      const lastSent = await db
        .select({ sentAt: actions.sentAt })
        .from(actions)
        .where(and(eq(actions.userId, userId), eq(actions.status, 'sent')))
        .orderBy(desc(actions.sentAt))
        .limit(1);

      if (lastSent.length > 0 && lastSent[0].sentAt) {
        const lastSentTime = lastSent[0].sentAt.getTime();
        const now = Date.now();
        const fiveMinutesMs = 5 * 60 * 1000;
        const timeSinceLastSend = now - lastSentTime;

        if (timeSinceLastSend < fiveMinutesMs) {
          const remainingMs = fiveMinutesMs - timeSinceLastSend;
          console.info(
            `[execute-action] Rate gap: waiting ${Math.ceil(remainingMs / 1000)}s before sending`
          );
          await step.sleep('wait-rate-gap', remainingMs);
        }
      }
    });

    // Step 4: Send invitation via Unipile
    const sendResult = await step.run('send-invitation', async () => {
      return sendConnectionRequest({
        accountId: user.unipileAccountId!,
        linkedInId: lead.linkedInId!,
        message: action.message,
      });
    });

    // Step 5: Update action status based on send result
    await step.run('update-action-status', async () => {
      if (sendResult.success) {
        await db
          .update(actions)
          .set({
            status: 'sent',
            sentAt: new Date(),
            unipileRequestId: sendResult.requestId,
            updatedAt: new Date(),
          })
          .where(eq(actions.id, actionId));

        console.info(
          `[execute-action] Successfully sent invitation for action ${actionId}, requestId: ${sendResult.requestId}`
        );
      } else {
        await db
          .update(actions)
          .set({
            status: 'failed',
            error: sendResult.error,
            updatedAt: new Date(),
          })
          .where(eq(actions.id, actionId));

        console.error(
          `[execute-action] Failed to send invitation for action ${actionId}: ${sendResult.error}`
        );

        throw new NonRetriableError(
          `Failed to send invitation: ${sendResult.error}`
        );
      }
    });

    // Step 6: Emit action/sent event (only on success)
    await step.sendEvent('emit-action-sent', {
      name: 'action/sent',
      data: {
        actionId,
        leadId: action.leadId,
        campaignId: action.campaignId,
        userId,
        unipileRequestId: sendResult.requestId!,
      },
    });

    return {
      success: true,
      actionId,
      unipileRequestId: sendResult.requestId,
    };
  }
);
