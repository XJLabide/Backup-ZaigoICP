/**
 * Inngest function: generate-message
 *
 * Triggers on lead/qualified event to generate AI messages.
 * Uses step.run() for durability and includes idempotency checks.
 */

import { inngest } from "../client";
import { db, leads, campaigns, actions } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { generateMessage } from "@/lib/agents/message-generator";
import { scoreMessage, MIN_QUALITY_SCORE } from "@/lib/agents/quality-scorer";

/**
 * Inngest function that generates personalized LinkedIn messages when leads are qualified.
 *
 * Event: lead/qualified
 * Idempotency: Uses leadId-campaignId as idempotency key
 * Throttle: 5 per minute per user (prevents API abuse)
 * Retries: 3 with exponential backoff
 *
 * Flow:
 * 1. Check for existing action (idempotency)
 * 2. Fetch lead and campaign data
 * 3. Generate message using AI
 * 4. Score message quality
 * 5. Create action record
 * 6. Update campaign stats
 * 7. Emit message/generated event
 */
export const generateMessageFunction = inngest.createFunction(
  {
    id: "generate-message",
    // Idempotency: prevent duplicate processing
    idempotency: "event.data.leadId + '-' + event.data.campaignId",
    // Throttle: 5 per minute per user to prevent API abuse
    throttle: {
      key: "event.data.userId",
      limit: 5,
      period: "1m",
    },
    // Retries: 3 with exponential backoff for AI API failures
    retries: 3,
  },
  { event: "lead/qualified" },
  async ({ event, step }) => {
    const { leadId, campaignId, userId } = event.data;

    // Step 1: Check for existing action (idempotency)
    const existingAction = await step.run("check-existing-action", async () => {
      const existing = await db
        .select({ id: actions.id })
        .from(actions)
        .where(and(eq(actions.leadId, leadId), eq(actions.campaignId, campaignId)))
        .limit(1);

      return existing.length > 0 ? existing[0] : null;
    });

    if (existingAction) {
      console.info(
        `[generate-message] Skipping: action already exists for lead ${leadId} in campaign ${campaignId}`
      );
      return { skipped: true, reason: "action_exists", actionId: existingAction.id };
    }

    // Step 2: Fetch lead data
    const lead = await step.run("fetch-lead", async () => {
      const result = await db
        .select()
        .from(leads)
        .where(and(eq(leads.id, leadId), eq(leads.userId, userId)))
        .limit(1);

      if (result.length === 0) {
        throw new Error(`Lead not found: ${leadId}`);
      }

      return result[0];
    });

    // Step 3: Fetch campaign data
    const campaign = await step.run("fetch-campaign", async () => {
      const result = await db
        .select()
        .from(campaigns)
        .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)))
        .limit(1);

      if (result.length === 0) {
        throw new Error(`Campaign not found: ${campaignId}`);
      }

      return result[0];
    });

    // Step 4: Generate message using AI
    const generatedMessage = await step.run("generate-message", async () => {
      return generateMessage({
        lead: {
          firstName: lead.firstName,
          headline: lead.headline,
          company: lead.company,
          recentPost: lead.recentPost,
          about: lead.about,
        },
        campaign: {
          tone: campaign.tone,
          cta: campaign.cta,
          calendarLink: campaign.calendarLink,
        },
      });
    });

    // Step 5: Score message quality
    const qualityResult = await step.run("score-message", async () => {
      return scoreMessage({
        message: generatedMessage.message,
        lead: {
          firstName: lead.firstName,
          headline: lead.headline,
          company: lead.company,
          recentPost: lead.recentPost,
          about: lead.about,
        },
        campaign: {
          tone: campaign.tone,
          cta: campaign.cta,
          calendarLink: campaign.calendarLink,
        },
        usedSignals: generatedMessage.usedSignals,
      });
    });

    // Step 6: Create action record
    // If score < 60, still create action but it stays pending for review
    // If autoApprove is enabled and score >= 60, set status to 'approved'
    const actionId = await step.run("create-action", async () => {
      const shouldAutoApprove =
        campaign.autoApprove && qualityResult.score >= MIN_QUALITY_SCORE;

      const [newAction] = await db
        .insert(actions)
        .values({
          userId,
          leadId,
          campaignId,
          type: "connection_request",
          message: generatedMessage.message,
          qualityScore: qualityResult.score,
          usedSignals: JSON.stringify(generatedMessage.usedSignals),
          generatedAt: new Date(),
          status: shouldAutoApprove ? "approved" : "pending",
          approvedAt: shouldAutoApprove ? new Date() : null,
        })
        .returning({ id: actions.id });

      console.info(
        `[generate-message] Created action ${newAction.id} with score ${qualityResult.score}, status: ${shouldAutoApprove ? "approved" : "pending"}`
      );

      return newAction.id;
    });

    // Step 7: Update campaign stats (increment totalLeads if this is a new action)
    await step.run("update-campaign-stats", async () => {
      await db
        .update(campaigns)
        .set({
          totalLeads: (campaign.totalLeads ?? 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, campaignId));
    });

    // Step 8: Emit message/generated event for downstream processing
    await step.sendEvent("emit-message-generated", {
      name: "message/generated",
      data: {
        leadId,
        campaignId,
        userId,
        actionId,
        qualityScore: qualityResult.score,
      },
    });

    return {
      success: true,
      actionId,
      qualityScore: qualityResult.score,
      issues: qualityResult.issues,
      usedSignals: generatedMessage.usedSignals,
    };
  }
);
