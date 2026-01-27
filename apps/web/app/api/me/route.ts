import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Get user info from Clerk
    const clerkUser = await currentUser();

    if (!clerkUser) {
      return NextResponse.json(
        { error: 'User not found in Clerk' },
        { status: 404 }
      );
    }

    // Upsert user in database
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? '';
    const name = clerkUser.firstName
      ? `${clerkUser.firstName} ${clerkUser.lastName ?? ''}`.trim()
      : null;

    // Try to find existing user
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    let user;

    if (existingUser) {
      // Update existing user
      const [updated] = await db
        .update(users)
        .set({
          email,
          name,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();
      user = updated;
    } else {
      // Create new user
      const [created] = await db
        .insert(users)
        .values({
          id: userId,
          email,
          name,
        })
        .returning();
      user = created;
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error syncing user:', error);
    return NextResponse.json(
      { error: 'Failed to sync user' },
      { status: 500 }
    );
  }
}
