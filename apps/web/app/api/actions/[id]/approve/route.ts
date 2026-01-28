/**
 * Action Approve API - POST endpoint for /api/actions/[id]/approve
 *
 * POST: Approve a pending action and trigger execution
 * - Sets status='approved', approvedAt=now()
 * - Triggers execute-action Inngest event
 *
 * Requires authentication and ownership verification.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db, actions, campaigns } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { inngest } from "@/lib/inngest";

/**
 * POST /api/actions/[id]/approve
 *
 * Approves a pending action and triggers execution.
 *
 * Path params:
 * - id: Action UUID
 *
 * Returns:
 * - action: Updated action object
 * - 400: Action is not in 'pending' status
 * - 401: Not authenticated
 * - 404: Action not found or not owned by user
 * - 500: Server error
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Verify action exists and user owns it
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
      return NextResponse.json({ error: "Action not found" }, { status: 404 });
    }

    // Verify ownership: action must belong to user
    if (existingAction.userId !== userId) {
      return NextResponse.json({ error: "Action not found" }, { status: 404 });
    }

    // Double-check ownership via campaign
    const [campaign] = await db
      .select({ id: campaigns.id })
      .from(campaigns)
      .where(
        and(eq(campaigns.id, existingAction.campaignId), eq(campaigns.userId, userId))
      );

    if (!campaign) {
      return NextResponse.json({ error: "Action not found" }, { status: 404 });
    }

    // Verify action is in 'pending' status
    if (existingAction.status !== "pending") {
      return NextResponse.json(
        {
          error: "Action cannot be approved",
          details: `Action is in '${existingAction.status}' status, only 'pending' actions can be approved`,
        },
        { status: 400 }
      );
    }

    // Update action status to approved
    const [updated] = await db
      .update(actions)
      .set({
        status: "approved",
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(actions.id, id), eq(actions.userId, userId)))
      .returning();

    // Trigger execute-action Inngest event
    await inngest.send({
      name: "action/approved",
      data: {
        actionId: updated.id,
        leadId: existingAction.leadId,
        campaignId: existingAction.campaignId,
        userId,
      },
    });

    return NextResponse.json({ action: updated });
  } catch (error) {
    console.error("Error approving action:", error);
    return NextResponse.json(
      { error: "Failed to approve action" },
      { status: 500 }
    );
  }
}
