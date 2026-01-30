/**
 * API endpoint for generating Unipile LinkedIn OAuth authorization links.
 *
 * POST /api/auth/unipile/connect
 *
 * Returns a hosted auth URL that the client can redirect to for LinkedIn OAuth.
 * Requires Clerk authentication. The Clerk userId is embedded in the auth link
 * for webhook correlation.
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { generateAuthLink } from '@/lib/unipile/auth';
import { db, users } from '@/lib/db';

/**
 * Generates a Unipile hosted auth link for the authenticated user.
 *
 * @returns JSON with { url: string } on success
 * @returns 401 for unauthenticated requests
 * @returns 500 with error message if Unipile client fails
 */
export async function POST() {
  // Validate Clerk session
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Ensure user exists in database before generating auth link
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return Response.json({ error: 'User not found in Clerk' }, { status: 404 });
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress ?? '';
    const name = clerkUser.firstName
      ? `${clerkUser.firstName} ${clerkUser.lastName ?? ''}`.trim()
      : null;

    // Upsert user record atomically
    await db
      .insert(users)
      .values({
        id: userId,
        email,
        name,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email,
          name,
          updatedAt: new Date(),
        },
      });

    const result = await generateAuthLink(userId);

    // Structured log for observability
    console.log(
      JSON.stringify({
        event: 'auth_link_generated',
        userId,
        timestamp: new Date().toISOString(),
        expiresOn: result.expiresOn,
      })
    );

    return Response.json({ url: result.url });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Log error for debugging
    console.error(
      JSON.stringify({
        event: 'auth_link_generation_failed',
        userId,
        timestamp: new Date().toISOString(),
        error: errorMessage,
      })
    );

    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
