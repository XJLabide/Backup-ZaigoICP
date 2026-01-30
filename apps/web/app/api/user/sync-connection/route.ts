/**
 * Manual sync endpoint for LinkedIn connection.
 *
 * POST /api/user/sync-connection
 * Body: { accountId: string }
 *
 * Used when webhook fails to process - allows manual connection update.
 */

import { auth } from '@clerk/nextjs/server';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { accountId } = body;

    if (!accountId || typeof accountId !== 'string') {
      return Response.json({ error: 'accountId is required' }, { status: 400 });
    }

    // Update user with the account ID
    const result = await db
      .update(users)
      .set({
        unipileAccountId: accountId,
        linkedInConnectedAt: new Date(),
        lastSyncError: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning({ id: users.id });

    if (result.length === 0) {
      // User doesn't exist - create them
      await db.insert(users).values({
        id: userId,
        unipileAccountId: accountId,
        linkedInConnectedAt: new Date(),
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Sync connection error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
