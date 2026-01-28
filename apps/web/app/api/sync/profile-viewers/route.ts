/**
 * Sync Profile Viewers API - POST endpoint
 *
 * POST: Manually triggers a profile viewers sync for the authenticated user.
 * Rate limited to prevent syncs within 5 minutes of each other.
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { inngest } from '@/lib/inngest/client';

/**
 * Rate limit window in milliseconds (5 minutes)
 */
const SYNC_RATE_LIMIT_MS = 5 * 60 * 1000;

/**
 * POST /api/sync/profile-viewers
 *
 * Manually triggers a profile viewers sync for the authenticated user.
 *
 * Returns:
 * - 202 Accepted with eventId when sync is triggered
 * - 401 Unauthorized when not authenticated
 * - 429 Too Many Requests if synced within last 5 minutes
 * - 400 Bad Request if user has no LinkedIn connection
 * - 500 Internal Server Error on failure
 */
export async function POST() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get user with sync status
    const [user] = await db
      .select({
        id: users.id,
        unipileAccountId: users.unipileAccountId,
        lastSyncAt: users.lastSyncAt,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has LinkedIn connected
    if (!user.unipileAccountId) {
      return NextResponse.json(
        { error: 'LinkedIn account not connected' },
        { status: 400 }
      );
    }

    // Check rate limit - prevent syncs within 5 minutes
    if (user.lastSyncAt) {
      const timeSinceLastSync = Date.now() - user.lastSyncAt.getTime();
      if (timeSinceLastSync < SYNC_RATE_LIMIT_MS) {
        const retryAfterSeconds = Math.ceil(
          (SYNC_RATE_LIMIT_MS - timeSinceLastSync) / 1000
        );
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            retryAfter: retryAfterSeconds,
            message: `Please wait ${retryAfterSeconds} seconds before syncing again`,
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(retryAfterSeconds),
            },
          }
        );
      }
    }

    // Trigger Inngest function via event
    const { ids } = await inngest.send({
      name: 'sync/profile-viewers.trigger',
      data: {
        userId: user.id,
        unipileAccountId: user.unipileAccountId,
      },
    });

    // Return 202 Accepted with event ID
    return NextResponse.json(
      {
        message: 'Sync triggered',
        eventId: ids[0],
      },
      { status: 202 }
    );
  } catch (error) {
    console.error('Error triggering profile viewers sync:', error);
    return NextResponse.json(
      { error: 'Failed to trigger sync' },
      { status: 500 }
    );
  }
}
