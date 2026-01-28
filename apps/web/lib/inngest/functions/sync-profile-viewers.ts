/**
 * Inngest function: sync-profile-viewers
 *
 * Cron job that runs hourly to sync LinkedIn profile viewers as leads.
 * Uses step.run() for durability and handles partial failures gracefully.
 */

import { inngest } from "../client";
import { db, users, leads } from "@/lib/db";
import { eq, isNotNull } from "drizzle-orm";
import {
  getProfileViewers,
  type ProfileViewer,
} from "@/lib/unipile/profile-viewers";

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
 * Inngest cron function that syncs LinkedIn profile viewers for all connected users.
 *
 * Schedule: Every hour at minute 0 (0 * * * *)
 * Concurrency: 1 (prevents overlapping runs)
 * Retries: 3 with exponential backoff
 *
 * Flow:
 * 1. Fetch all users with active LinkedIn connections (unipileAccountId not null)
 * 2. For each user, fetch profile viewers via Unipile API
 * 3. Upsert leads with source='profile_viewer' using onConflictDoNothing
 * 4. Update user's lastSyncAt timestamp (only on success, set error on failure)
 * 5. Log sync results
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

    // Step 2: Process each user (each user sync is a separate step for durability)
    const results: UserSyncResult[] = [];

    for (const user of connectedUsers) {
      // Each user sync is a separate step for durability
      // Wrapped in try/catch to ensure partial failures don't abort the entire batch
      try {
        const userResult = await step.run(
          `sync-user-${user.id}`,
          async (): Promise<UserSyncResult> => {
            return await syncUserProfileViewersWithDb(user.id, user.unipileAccountId);
          }
        );
        results.push(userResult);
      } catch (error) {
        // Log error but continue processing other users
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error(
          `[sync-profile-viewers] Step failed for user ${user.id}: ${errorMessage}`
        );
        results.push({
          userId: user.id,
          viewersFetched: 0,
          leadsCreated: 0,
          leadsSkipped: 0,
          upsertErrors: 0,
          error: errorMessage,
        });
      }
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
 * Syncs profile viewers for a single user with full database operations.
 * This function handles fetching viewers, upserting leads, and updating user sync status.
 * All database operations are performed within this function for proper error tracking.
 */
async function syncUserProfileViewersWithDb(
  userId: string,
  unipileAccountId: string
): Promise<UserSyncResult> {
  let viewersFetched = 0;
  let leadsCreated = 0;
  let leadsSkipped = 0;
  let upsertErrors = 0;
  let fetchError: string | undefined;

  try {
    // Fetch profile viewers from Unipile (first page only for hourly sync)
    const { viewers } = await getProfileViewers(unipileAccountId, { limit: 50 });
    viewersFetched = viewers.length;

    console.info(
      `[sync-profile-viewers] Fetched ${viewers.length} profile viewers for user ${userId}`
    );

    // Process each viewer with atomic upsert
    for (const viewer of viewers) {
      try {
        const wasCreated = await upsertLeadAtomic(userId, viewer);
        if (wasCreated) {
          leadsCreated++;
        } else {
          leadsSkipped++;
        }
      } catch (error) {
        // Log but continue processing other viewers
        console.error(
          `[sync-profile-viewers] Error upserting lead for viewer ${viewer.linkedInId}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        upsertErrors++;
      }
    }
  } catch (error) {
    fetchError = error instanceof Error ? error.message : "Unknown error";
    console.error(
      `[sync-profile-viewers] Error fetching viewers for user ${userId}: ${fetchError}`
    );
  }

  // Update user's sync status based on results
  // Only mark as successful if we had no fetch errors and no upsert errors
  const hasErrors = fetchError || upsertErrors > 0;

  if (hasErrors) {
    // Set error state - include count of upsert errors if any
    const errorMessage = fetchError
      ? fetchError
      : `${upsertErrors} upsert error(s) occurred`;

    await db
      .update(users)
      .set({
        lastSyncAt: new Date(),
        lastSyncError: errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return {
      userId,
      viewersFetched,
      leadsCreated,
      leadsSkipped,
      upsertErrors,
      error: errorMessage,
    };
  }

  // Success - clear any previous error
  await db
    .update(users)
    .set({
      lastSyncAt: new Date(),
      lastSyncError: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return {
    userId,
    viewersFetched,
    leadsCreated,
    leadsSkipped,
    upsertErrors: 0,
  };
}

/**
 * Atomically upserts a profile viewer as a lead using onConflictDoNothing.
 * Returns true if a new lead was created, false if it already existed (conflict).
 * Uses the unique index on (userId, linkedInId) for deduplication.
 */
async function upsertLeadAtomic(
  userId: string,
  viewer: ProfileViewer
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
 * Manually trigger sync for a specific user.
 * Can be called from an API endpoint for manual sync.
 */
export async function manualSyncProfileViewers(
  userId: string,
  unipileAccountId: string
): Promise<UserSyncResult> {
  return await syncUserProfileViewersWithDb(userId, unipileAccountId);
}
