/**
 * Action API - PATCH endpoint for /api/actions/[id]
 *
 * PATCH: Update an action's message, status (approve/reject)
 * - Edit: updates message, clears generatedAt (marks as edited)
 * - Approve: sets status='approved', approvedAt=now()
 * - Reject: sets status='rejected', rejectedAt=now()
 *
 * Requires authentication and ownership verification via lead -> campaign.
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { db, actions, campaigns } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

/**
 * Maximum character length for LinkedIn connection request messages
 */
const MAX_MESSAGE_LENGTH = 300;

/**
 * Zod schema for action update
 */
const updateActionSchema = z
  .object({
    message: z
      .string()
      .min(1, 'Message cannot be empty')
      .max(MAX_MESSAGE_LENGTH, `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`)
      .optional(),
    status: z.enum(['approved', 'rejected']).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

/**
 * PATCH /api/actions/[id]
 *
 * Updates an action's message or status.
 *
 * Path params:
 * - id: Action UUID
 *
 * Body:
 * - message?: string - New message text (clears generatedAt)
 * - status?: 'approved' | 'rejected' - Approve or reject action
 *
 * Returns:
 * - action: Updated action object
 * - 400: Validation error
 * - 401: Not authenticated
 * - 404: Action not found or not owned by user
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Validate request body
    const body = await request.json();
    const parsed = updateActionSchema.safeParse(body);

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

    // Verify action exists and user owns it (via lead -> campaign ownership)
    // First fetch the action with lead and campaign info
    const [existingAction] = await db
      .select({
        id: actions.id,
        userId: actions.userId,
        leadId: actions.leadId,
        campaignId: actions.campaignId,
        status: actions.status,
      })
      .from(actions)
      .where(eq(actions.id, id));

    if (!existingAction) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 });
    }

    // Verify ownership: action must belong to user
    if (existingAction.userId !== userId) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 });
    }

    // Double-check ownership via campaign
    const [campaign] = await db
      .select({ id: campaigns.id })
      .from(campaigns)
      .where(and(eq(campaigns.id, existingAction.campaignId), eq(campaigns.userId, userId)));

    if (!campaign) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 });
    }

    // Build update object based on what was provided
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Handle message edit: update message and clear generatedAt
    if (parsed.data.message !== undefined) {
      updateData.message = parsed.data.message;
      updateData.generatedAt = null; // Clear to mark as edited
    }

    // Handle status change
    if (parsed.data.status === 'approved') {
      updateData.status = 'approved';
      updateData.approvedAt = new Date();
    } else if (parsed.data.status === 'rejected') {
      updateData.status = 'rejected';
      updateData.rejectedAt = new Date();
    }

    // Update action
    const [updated] = await db
      .update(actions)
      .set(updateData)
      .where(and(eq(actions.id, id), eq(actions.userId, userId)))
      .returning();

    return NextResponse.json({ action: updated });
  } catch (error) {
    console.error('Error updating action:', error);
    return NextResponse.json(
      { error: 'Failed to update action' },
      { status: 500 }
    );
  }
}
