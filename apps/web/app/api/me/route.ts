import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { z } from 'zod';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';

/**
 * Zod schema for user preferences update (partial)
 * Excludes id which cannot be updated
 */
const updateUserPreferencesSchema = z
  .object({
    calendarLink: z.string().url('Invalid calendar link URL').optional().nullable(),
    dailyLimit: z
      .number()
      .int('Daily limit must be a whole number')
      .min(10, 'Daily limit must be at least 10')
      .max(50, 'Daily limit cannot exceed 50')
      .optional(),
    timezone: z.string().min(1, 'Timezone is required').optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

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

/**
 * PATCH /api/me
 *
 * Partially updates user preferences.
 *
 * Body: Partial user preferences (all optional except at least one required)
 * - calendarLink: URL string or null (optional)
 * - dailyLimit: number between 10-50 (optional)
 * - timezone: string (optional)
 *
 * Returns:
 * - user: Updated user object
 * - 400: Validation error
 * - 401: Not authenticated
 * - 500: Server error
 */
export async function PATCH(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Validate request body
    const body = await request.json();
    const parsed = updateUserPreferencesSchema.safeParse(body);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const formErrors = parsed.error.flatten().formErrors;
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: Object.keys(fieldErrors).length > 0 ? fieldErrors : formErrors,
        },
        { status: 400 }
      );
    }

    // Find and update user
    const [updated] = await db
      .update(users)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update user preferences' },
      { status: 500 }
    );
  }
}
