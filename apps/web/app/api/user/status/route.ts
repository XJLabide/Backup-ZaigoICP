/**
 * API endpoint for retrieving user LinkedIn connection status.
 *
 * GET /api/user/status
 *
 * Returns the current connection status for the authenticated user.
 * Polled by the onboarding success page to detect when webhook has been processed.
 *
 * Requires Clerk authentication.
 */

import { auth } from '@clerk/nextjs/server';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';

/**
 * Response type for the user status endpoint.
 */
interface UserStatusResponse {
  linkedInConnected: boolean;
  connectedAt: string | null;
}

/**
 * Retrieves LinkedIn connection status for the authenticated user.
 *
 * @returns JSON with { linkedInConnected: boolean, connectedAt: string | null }
 * @returns 401 for unauthenticated requests
 * @returns 500 for database errors
 */
export async function GET() {
  // Validate Clerk session
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, {
      status: 401,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  }

  try {
    // Query user record from database
    const result = await db
      .select({
        unipileAccountId: users.unipileAccountId,
        linkedInConnectedAt: users.linkedInConnectedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (result.length === 0) {
      // User record doesn't exist yet - this can happen if webhook hasn't processed
      // Return disconnected status instead of 404 for smoother UX
      const response: UserStatusResponse = {
        linkedInConnected: false,
        connectedAt: null,
      };
      return Response.json(response, {
        headers: {
          'Cache-Control': 'no-store',
        },
      });
    }

    const user = result[0];
    const linkedInConnected = user.unipileAccountId !== null;
    const connectedAt = user.linkedInConnectedAt?.toISOString() ?? null;

    const response: UserStatusResponse = {
      linkedInConnected,
      connectedAt,
    };

    return Response.json(response, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Log error for debugging
    console.error(
      JSON.stringify({
        event: 'user_status_fetch_error',
        userId,
        timestamp: new Date().toISOString(),
        error: errorMessage,
      })
    );

    return Response.json({ error: 'Internal server error' }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  }
}
