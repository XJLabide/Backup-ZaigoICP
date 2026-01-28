/**
 * Action Reject API - POST endpoint for /api/actions/[id]/reject
 *
 * POST: Reject a pending action
 * - Sets status='rejected', rejectedAt=now()
 * - Stores rejection reason in 'error' field
 *
 * Requires authentication and ownership verification.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db, actions, campaigns } from "@/lib/db";
import { eq, and } from "drizzle-orm";

/**
 * Maximum length for rejection reason
 */
const MAX_REASON_LENGTH = 500;

/**
 * Zod schema for reject request body
 */
const rejectSchema = z.object({
  reason: z
    .string()
    .max(MAX_REASON_LENGTH, `Reason cannot exceed ${MAX_REASON_LENGTH} characters`)
    .optional(),
});

/**
 * POST /api/actions/[id]/reject
 *
 * Rejects a pending action with an optional reason.
 *
 * Path params:
 * - id: Action UUID
 *
 * Body:
 * - reason?: string - Optional rejection reason (stored in error field)
 *
 * Returns:
 * - action: Updated action object
 * - 400: Action is not in 'pending' status, validation error, or invalid JSON
 * - 401: Not authenticated
 * - 404: Action not found or not owned by user
 * - 409: Action status changed concurrently (race condition)
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

    // Parse and validate request body
    let body: unknown = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      // Invalid JSON - return 400 error
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const parsed = rejectSchema.safeParse(body);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      return NextResponse.json(
        {
          error: "Validation failed",
          details: fieldErrors,
        },
        { status: 400 }
      );
    }

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
          error: "Action cannot be rejected",
          details: `Action is in '${existingAction.status}' status, only 'pending' actions can be rejected`,
        },
        { status: 400 }
      );
    }

    // Atomic update: include status='pending' in WHERE clause to prevent race conditions
    // If another request already changed the status, this will return empty array
    const updateResult = await db
      .update(actions)
      .set({
        status: "rejected",
        rejectedAt: new Date(),
        error: parsed.data.reason || null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(actions.id, id),
          eq(actions.userId, userId),
          eq(actions.status, "pending")
        )
      )
      .returning();

    // Check if update was successful (action was still pending)
    if (updateResult.length === 0) {
      return NextResponse.json(
        {
          error: "Action cannot be rejected",
          details: "Action status changed concurrently, please refresh and try again",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ action: updateResult[0] });
  } catch (error) {
    console.error("Error rejecting action:", error);
    return NextResponse.json(
      { error: "Failed to reject action" },
      { status: 500 }
    );
  }
}
