import { inngest } from "../client";
import { db, campaigns } from "@/lib/db";
import { eq, sql } from "drizzle-orm";

/**
 * Inngest function to update campaign statistics in real-time.
 *
 * This function listens to multiple event types and atomically increments
 * the appropriate campaign statistics:
 * - action/sent → increments totalSent
 * - invitation/accepted → increments totalAccepted
 *
 * Uses SQL atomic increments with COALESCE to handle NULL values safely.
 *
 * @example
 * // Trigger when an action is sent
 * await inngest.send({
 *   name: "action/sent",
 *   data: { campaignId: "camp_123", ... }
 * });
 *
 * @example
 * // Trigger when an invitation is accepted
 * await inngest.send({
 *   name: "invitation/accepted",
 *   data: { campaignId: "camp_123", ... }
 * });
 */
export const updateCampaignStatsFunction = inngest.createFunction(
  {
    id: "update-campaign-stats",
    retries: 3,
  },
  [{ event: "action/sent" }, { event: "invitation/accepted" }],
  async ({ event, step }) => {
    const { campaignId } = event.data;

    // Determine which field to increment based on event type
    const field = event.name === "action/sent" ? "totalSent" : "totalAccepted";

    await step.run("increment-stat", async () => {
      if (field === "totalSent") {
        await db
          .update(campaigns)
          .set({
            totalSent: sql`COALESCE(${campaigns.totalSent}, 0) + 1`,
            updatedAt: new Date(),
          })
          .where(eq(campaigns.id, campaignId));
      } else {
        await db
          .update(campaigns)
          .set({
            totalAccepted: sql`COALESCE(${campaigns.totalAccepted}, 0) + 1`,
            updatedAt: new Date(),
          })
          .where(eq(campaigns.id, campaignId));
      }
    });

    return { success: true, campaignId, field };
  }
);
