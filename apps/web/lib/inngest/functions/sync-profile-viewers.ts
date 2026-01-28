/**
 * Inngest function: sync-profile-viewers
 *
 * Cron job that runs hourly to sync LinkedIn profile viewers as leads.
 * Uses step.run() for durability and handles partial failures gracefully.
 */

import { inngest } from "../client";
import { db, users, leads } from "@/lib/db";
import { eq, and, isNotNull } from "drizzle-orm";
import {
  getProfileViewers,
  type ProfileViewer,
} from "@/lib/unipile/profile-viewers";

/**
 * Result of syncing profile viewers for a single user.
 */
interface UserSyncResult {
  userId: string;
  viewersFetched: number;
  leadsCreated: number;
  leadsSkipped: number;
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
 * 3. Upsert leads with source='profile_viewer'
 * 4. Update user's lastSyncAt timestamp
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

    // Step 2: Process each user (in parallel using step.run for each)
    const results: UserSyncResult[] = [];

    for (const user of connectedUsers) {
      // Each user sync is a separate step for durability
      const userResult = await step.run(
        `sync-user-${user.id}`,
        async (): Promise<UserSyncResult> => {
          try {
            return await syncUserProfileViewers(user.id, user.unipileAccountId);
          } catch (error) {
            // Log error but don't fail the entire batch
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            console.error(
              `[sync-profile-viewers] Error syncing user ${user.id}: ${errorMessage}`
            );
            return {
              userId: user.id,
              viewersFetched: 0,
              leadsCreated: 0,
              leadsSkipped: 0,
              error: errorMessage,
            };
          }
        }
      );

      results.push(userResult);
    }

    // Step 3: Log summary
    const summary = {
      success: true,
      usersProcessed: results.length,
      totalViewersFetched: results.reduce((sum, r) => sum + r.viewersFetched, 0),
      totalLeadsCreated: results.reduce((sum, r) => sum + r.leadsCreated, 0),
      totalLeadsSkipped: results.reduce((sum, r) => sum + r.leadsSkipped, 0),
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
 * Syncs profile viewers for a single user.
 * Fetches viewers from Unipile and upserts them as leads.
 */
async function syncUserProfileViewers(
  userId: string,
  unipileAccountId: string
): Promise<UserSyncResult> {
  // Fetch profile viewers from Unipile (first page only for hourly sync)
  const { viewers } = await getProfileViewers(unipileAccountId, { limit: 50 });

  console.info(
    `[sync-profile-viewers] Fetched ${viewers.length} profile viewers for user ${userId}`
  );

  let leadsCreated = 0;
  let leadsSkipped = 0;

  // Process each viewer
  for (const viewer of viewers) {
    try {
      const wasCreated = await upsertLead(userId, viewer);
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
      leadsSkipped++;
    }
  }

  // Update user's lastSyncAt timestamp
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
    viewersFetched: viewers.length,
    leadsCreated,
    leadsSkipped,
  };
}

/**
 * Upserts a profile viewer as a lead.
 * Returns true if a new lead was created, false if it already existed.
 */
async function upsertLead(
  userId: string,
  viewer: ProfileViewer
): Promise<boolean> {
  // Check if lead already exists (deduplication by userId + linkedInId)
  const existing = await db
    .select({ id: leads.id })
    .from(leads)
    .where(and(eq(leads.userId, userId), eq(leads.linkedInId, viewer.linkedInId)))
    .limit(1);

  if (existing.length > 0) {
    // Lead already exists, skip (could optionally update profile data here)
    return false;
  }

  // Insert new lead
  await db.insert(leads).values({
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
  });

  return true;
}

/**
 * Manually trigger sync for a specific user.
 * Can be called from an API endpoint for manual sync.
 */
export async function manualSyncProfileViewers(
  userId: string,
  unipileAccountId: string
): Promise<UserSyncResult> {
  try {
    return await syncUserProfileViewers(userId, unipileAccountId);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Update user's lastSyncError
    await db
      .update(users)
      .set({
        lastSyncError: errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return {
      userId,
      viewersFetched: 0,
      leadsCreated: 0,
      leadsSkipped: 0,
      error: errorMessage,
    };
  }
}
