/**
 * API endpoint for disconnecting LinkedIn account from Warm.
 *
 * POST /api/auth/unipile/disconnect
 *
 * Clears Unipile account connection from user record, stopping all future
 * automated outreach. LinkedIn credentials remain safe with Unipile.
 * Requires Clerk authentication.
 */

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Disconnects LinkedIn account for the authenticated user.
 *
 * @returns JSON with { success: true } on success
 * @returns 401 for unauthenticated requests
 * @returns 404 if user not found in database
 * @returns 500 with error message on database failure
 */
export async function POST() {
  // Validate Clerk session
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Clear LinkedIn connection fields
    const result = await db
      .update(users)
      .set({
        unipileAccountId: null,
        linkedInConnectedAt: null,
        lastSyncError: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning({ id: users.id });

    // Check if user exists
    if (result.length === 0) {
      console.error(
        JSON.stringify({
          event: 'disconnect_failed_user_not_found',
          userId,
          timestamp: new Date().toISOString(),
        })
      );
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Structured log for observability
    console.log(
      JSON.stringify({
        event: 'linkedin_disconnected',
        userId,
        timestamp: new Date().toISOString(),
      })
    );

    return Response.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Log error for debugging
    console.error(
      JSON.stringify({
        event: 'disconnect_failed',
        userId,
        timestamp: new Date().toISOString(),
        error: errorMessage,
      })
    );

    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
