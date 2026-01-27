/**
 * Campaign API - PATCH and DELETE endpoints for /api/campaigns/[id]
 *
 * PATCH: Partial update of a campaign with Zod validation
 * DELETE: Delete a campaign (cascades to actions via schema)
 *
 * Both require authentication and ownership verification.
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { db, campaigns } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

/**
 * Zod schema for campaign update (partial)
 * Excludes id and userId which cannot be updated
 */
const updateCampaignSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional(),
    tone: z.enum(['professional', 'friendly', 'direct']).optional(),
    cta: z.enum(['book_call', 'reply', 'visit_site']).optional(),
    calendarLink: z.string().url('Invalid calendar link URL').optional().nullable(),
    qualificationRules: z
      .string()
      .optional()
      .nullable()
      .refine(
        (val) => {
          if (!val) return true;
          try {
            JSON.parse(val);
            return true;
          } catch {
            return false;
          }
        },
        { message: 'qualificationRules must be valid JSON' }
      ),
    autoApprove: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

/**
 * PATCH /api/campaigns/[id]
 *
 * Partially updates a campaign.
 *
 * Path params:
 * - id: Campaign UUID
 *
 * Body: Partial campaign fields (all optional except at least one required)
 *
 * Returns:
 * - campaign: Updated campaign object
 * - 400: Validation error
 * - 401: Not authenticated
 * - 404: Campaign not found or not owned by user
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
    const parsed = updateCampaignSchema.safeParse(body);

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

    // Find campaign and verify ownership
    const [existing] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)));

    if (!existing) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Update campaign with new values and updatedAt timestamp
    const [updated] = await db
      .update(campaigns)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)))
      .returning();

    return NextResponse.json({ campaign: updated });
  } catch (error) {
    console.error('Error updating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to update campaign' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/campaigns/[id]
 *
 * Deletes a campaign. Actions are deleted via cascade in schema.
 *
 * Path params:
 * - id: Campaign UUID
 *
 * Returns:
 * - 204: Successfully deleted (no content)
 * - 401: Not authenticated
 * - 404: Campaign not found or not owned by user
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Find campaign and verify ownership
    const [existing] = await db
      .select({ id: campaigns.id })
      .from(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)));

    if (!existing) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Delete campaign (actions cascade via schema)
    await db
      .delete(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)));

    // Return 204 No Content on successful deletion
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json(
      { error: 'Failed to delete campaign' },
      { status: 500 }
    );
  }
}
