/**
 * Inngest function: sync-profile-viewers
 *
 * Cron job that runs hourly to sync LinkedIn profile viewers as leads.
 * Uses step.run() for durability and handles partial failures gracefully.
 */

import { inngest } from "../client";
import { db, users, leads } from "@/lib/db";
import { eq, isNotNull } from "drizzle-orm";
import { getProfileViewers } from "@/lib/unipile/profile-viewers";

/**
 * Result of syncing profile viewers for a single user.
 */
export interface UserSyncResult {
  userId: string;
  viewersFetched: number;
  leadsCreated: number;
  leadsSkipped: number;
  upsertErrors: number;
  error?: string;
}

/**
 * Result of upserting a batch of viewers.
 */
interface UpsertBatchResult {
  leadsCreated: number;
  leadsSkipped: number;
  upsertErrors: number;
}

/**
 * Serializable version of ProfileViewer for Inngest step data.
 * Dates are serialized as ISO strings between steps.
 */
interface SerializableViewer {
  linkedInId: string;
  profileUrl: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  headline: string | null;
  company: string | null;
  location: string | null;
  profileImageUrl: string | null;
  viewedAt: string | null; // ISO date string
}

/**
 * Inngest cron function that syncs LinkedIn profile viewers for all connected users.
 *
 * Schedule: Every hour at minute 0 (0 * * * *)
 * Concurrency: 1 (prevents overlapping runs)
 * Retries: 3 with exponential backoff
 *
 * Flow:
 * 1. Fetch all users with active LinkedIn connections (unipileAccountId not null)
 * 2. For each user:
 *    a. Fetch profile viewers via Unipile API (step.run)
 *    b. Upsert leads with source='profile_viewer' (step.run)
 *    c. Update user's lastSyncAt timestamp (step.run)
 * 3. Log sync results
 */
export const syncProfileViewersFunction = inngest.createFunction(
  {
    id: "sync-profile-viewers",
    // Concurrency: only 1 instance at a time to prevent duplicate processing
    concurrency: {
      limit: 1,
    },
    // Retries: 3 with exponential backoff for transient failures
    retries: 3,
  },
  // Cron trigger: run every hour at minute 0
  { cron: "0 * * * *" },
  async ({ step }) => {
    // Step 1: Fetch all users with active LinkedIn connections
    const connectedUsers = await step.run("fetch-connected-users", async () => {
      const result = await db
        .select({
          id: users.id,
          unipileAccountId: users.unipileAccountId,
        })
        .from(users)
        .where(isNotNull(users.unipileAccountId));

      console.info(
        `[sync-profile-viewers] Found ${result.length} users with LinkedIn connections`
      );

      return result as Array<{ id: string; unipileAccountId: string }>;
    });

    if (connectedUsers.length === 0) {
      console.info("[sync-profile-viewers] No connected users found, skipping");
      return { success: true, usersProcessed: 0, results: [] };
    }

    // Step 2: Process each user with dedicated steps for each operation
    const results: UserSyncResult[] = [];

    for (const user of connectedUsers) {
      let viewersFetched = 0;
      let leadsCreated = 0;
      let leadsSkipped = 0;
      let upsertErrors = 0;
      let error: string | undefined;

      try {
        // Step 2a: Fetch profile viewers from Unipile
        // Return serializable data (Dates converted to ISO strings for Inngest)
        const serializedViewers = await step.run(
          `fetch-viewers-${user.id}`,
          async (): Promise<SerializableViewer[]> => {
            const { viewers } = await getProfileViewers(user.unipileAccountId, {
              limit: 50,
            });

            console.info(
              `[sync-profile-viewers] Fetched ${viewers.length} profile viewers for user ${user.id}`
            );

            // Serialize dates to ISO strings for Inngest step serialization
            return viewers.map((v) => ({
              ...v,
              viewedAt: v.viewedAt ? v.viewedAt.toISOString() : null,
            }));
          }
        );

        viewersFetched = serializedViewers.length;

        // Step 2b: Upsert leads batch
        if (serializedViewers.length > 0) {
          const upsertResult = await step.run(
            `upsert-leads-${user.id}`,
            async (): Promise<UpsertBatchResult> => {
              // Convert ISO strings back to Dates for database insertion
              const viewers = serializedViewers.map((v) => ({
                ...v,
                viewedAt: v.viewedAt ? new Date(v.viewedAt) : null,
              }));
              return await upsertViewersBatch(user.id, viewers);
            }
          );

          leadsCreated = upsertResult.leadsCreated;
          leadsSkipped = upsertResult.leadsSkipped;
          upsertErrors = upsertResult.upsertErrors;
        }

        // Step 2c: Update user sync status
        const hasErrors = upsertErrors > 0;
        await step.run(`update-sync-status-${user.id}`, async () => {
          if (hasErrors) {
            await db
              .update(users)
              .set({
                lastSyncAt: new Date(),
                lastSyncError: `${upsertErrors} upsert error(s) occurred`,
                updatedAt: new Date(),
              })
              .where(eq(users.id, user.id));
          } else {
            await db
              .update(users)
              .set({
                lastSyncAt: new Date(),
                lastSyncError: null,
                updatedAt: new Date(),
              })
              .where(eq(users.id, user.id));
          }
        });

        if (hasErrors) {
          error = `${upsertErrors} upsert error(s) occurred`;
        }
      } catch (stepError) {
        // Log error but continue processing other users
        const errorMessage =
          stepError instanceof Error ? stepError.message : "Unknown error";
        console.error(
          `[sync-profile-viewers] Step failed for user ${user.id}: ${errorMessage}`
        );
        error = errorMessage;

        // Try to update user sync error status
        try {
          await step.run(`update-sync-error-${user.id}`, async () => {
            await db
              .update(users)
              .set({
                lastSyncAt: new Date(),
                lastSyncError: errorMessage,
                updatedAt: new Date(),
              })
              .where(eq(users.id, user.id));
          });
        } catch {
          // If this also fails, just log and continue
          console.error(
            `[sync-profile-viewers] Failed to update sync error for user ${user.id}`
          );
        }
      }

      results.push({
        userId: user.id,
        viewersFetched,
        leadsCreated,
        leadsSkipped,
        upsertErrors,
        error,
      });
    }

    // Step 3: Log summary
    const summary = {
      success: true,
      usersProcessed: results.length,
      totalViewersFetched: results.reduce((sum, r) => sum + r.viewersFetched, 0),
      totalLeadsCreated: results.reduce((sum, r) => sum + r.leadsCreated, 0),
      totalLeadsSkipped: results.reduce((sum, r) => sum + r.leadsSkipped, 0),
      totalUpsertErrors: results.reduce((sum, r) => sum + r.upsertErrors, 0),
      errors: results.filter((r) => r.error).length,
      results,
    };

    console.info(
      `[sync-profile-viewers] Completed: ${summary.usersProcessed} users, ${summary.totalLeadsCreated} new leads, ${summary.totalLeadsSkipped} skipped, ${summary.errors} errors`
    );

    return summary;
  }
);

/**
 * Viewer data for upsert operations.
 * Can be ProfileViewer or deserialized SerializableViewer.
 */
interface ViewerData {
  linkedInId: string;
  profileUrl: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  headline: string | null;
  company: string | null;
  location: string | null;
  profileImageUrl: string | null;
  viewedAt: Date | null;
}

/**
 * Upserts a batch of profile viewers as leads.
 * Uses onConflictDoNothing for atomic deduplication.
 */
async function upsertViewersBatch(
  userId: string,
  viewers: ViewerData[]
): Promise<UpsertBatchResult> {
  let leadsCreated = 0;
  let leadsSkipped = 0;
  let upsertErrors = 0;

  for (const viewer of viewers) {
    try {
      const wasCreated = await upsertLeadAtomic(userId, viewer);
      if (wasCreated) {
        leadsCreated++;
      } else {
        leadsSkipped++;
      }
    } catch (error) {
      console.error(
        `[sync-profile-viewers] Error upserting lead for viewer ${viewer.linkedInId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      upsertErrors++;
    }
  }

  return { leadsCreated, leadsSkipped, upsertErrors };
}

/**
 * Atomically upserts a profile viewer as a lead using onConflictDoNothing.
 * Returns true if a new lead was created, false if it already existed (conflict).
 * Uses the unique index on (userId, linkedInId) for deduplication.
 */
async function upsertLeadAtomic(
  userId: string,
  viewer: ViewerData
): Promise<boolean> {
  // Use onConflictDoNothing for atomic deduplication
  // The unique index leads_user_linkedin_unique handles conflicts
  const result = await db
    .insert(leads)
    .values({
      userId,
      linkedInId: viewer.linkedInId,
      profileUrl: viewer.profileUrl,
      fullName: viewer.fullName,
      firstName: viewer.firstName,
      lastName: viewer.lastName,
      headline: viewer.headline,
      company: viewer.company,
      location: viewer.location,
      profileImageUrl: viewer.profileImageUrl,
      viewedAt: viewer.viewedAt,
      source: "profile_viewer",
      status: "new",
    })
    .onConflictDoNothing({
      target: [leads.userId, leads.linkedInId],
    })
    .returning({ id: leads.id });

  // If result is empty, the conflict occurred (lead already existed)
  return result.length > 0;
}

/**
 * Inngest function for manual profile viewer sync trigger.
 *
 * Triggered via event from POST /api/sync/profile-viewers endpoint.
 * Processes a single user's profile viewers sync request.
 *
 * Retries: 3 with exponential backoff for transient failures
 */
export const manualSyncProfileViewersFunction = inngest.createFunction(
  {
    id: "manual-sync-profile-viewers",
    retries: 3,
  },
  { event: "sync/profile-viewers.trigger" },
  async ({ event, step }) => {
    const { userId, unipileAccountId } = event.data;

    // Use step.run for the sync operation to get durability
    const result = await step.run("sync-profile-viewers", async () => {
      return await performManualSync(userId, unipileAccountId);
    });

    console.info(
      `[manual-sync-profile-viewers] Completed for user ${userId}: ${result.leadsCreated} created, ${result.leadsSkipped} skipped`
    );

    return result;
  }
);

/**
 * Performs the actual sync for a single user.
 * Used by both the manual trigger function and direct API calls.
 */
async function performManualSync(
  userId: string,
  unipileAccountId: string
): Promise<UserSyncResult> {
  let viewersFetched = 0;
  let leadsCreated = 0;
  let leadsSkipped = 0;
  let upsertErrors = 0;
  let error: string | undefined;

  try {
    // Fetch profile viewers from Unipile
    const { viewers } = await getProfileViewers(unipileAccountId, { limit: 50 });
    viewersFetched = viewers.length;

    console.info(
      `[sync-profile-viewers] Fetched ${viewers.length} profile viewers for user ${userId}`
    );

    // Upsert leads batch
    if (viewers.length > 0) {
      const upsertResult = await upsertViewersBatch(userId, viewers);
      leadsCreated = upsertResult.leadsCreated;
      leadsSkipped = upsertResult.leadsSkipped;
      upsertErrors = upsertResult.upsertErrors;
    }

    // Update user sync status
    const hasErrors = upsertErrors > 0;
    if (hasErrors) {
      error = `${upsertErrors} upsert error(s) occurred`;
      await db
        .update(users)
        .set({
          lastSyncAt: new Date(),
          lastSyncError: error,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    } else {
      await db
        .update(users)
        .set({
          lastSyncAt: new Date(),
          lastSyncError: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    }
  } catch (fetchError) {
    error = fetchError instanceof Error ? fetchError.message : "Unknown error";
    console.error(
      `[sync-profile-viewers] Error syncing for user ${userId}: ${error}`
    );

    // Update user sync error status
    await db
      .update(users)
      .set({
        lastSyncAt: new Date(),
        lastSyncError: error,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  return {
    userId,
    viewersFetched,
    leadsCreated,
    leadsSkipped,
    upsertErrors,
    error,
  };
}

/**
 * Manually trigger sync for a specific user.
 * Can be called from an API endpoint for manual sync.
 * Note: This does not use step.run since it's called outside Inngest context.
 *
 * @deprecated Use the Inngest event trigger via inngest.send() instead for durability.
 */
export async function manualSyncProfileViewers(
  userId: string,
  unipileAccountId: string
): Promise<UserSyncResult> {
  return performManualSync(userId, unipileAccountId);
}
