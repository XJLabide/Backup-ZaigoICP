export const dynamic = 'force-dynamic';

/**
 * Onboarding page for LinkedIn connection.
 *
 * Displays the current LinkedIn connection status and provides a button
 * to initiate the Unipile OAuth flow. Protected by Clerk authentication.
 */

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { OnboardingClient } from './client';

/**
 * Fetches the current user's LinkedIn connection status from the database.
 */
async function getConnectionStatus(userId: string) {
  const result = await db
    .select({
      unipileAccountId: users.unipileAccountId,
      linkedInConnectedAt: users.linkedInConnectedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (result.length === 0) {
    return { connected: false, connectedAt: null };
  }

  const user = result[0];
  return {
    connected: user.unipileAccountId !== null,
    connectedAt: user.linkedInConnectedAt?.toISOString() ?? null,
  };
}

export default async function OnboardingPage() {
  // Verify authentication
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }

  // Get initial connection status
  const { connected, connectedAt } = await getConnectionStatus(userId);

  return <OnboardingClient initialConnected={connected} initialConnectedAt={connectedAt} />;
}
