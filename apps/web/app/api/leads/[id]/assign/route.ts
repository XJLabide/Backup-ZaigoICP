/**
 * Lead Assignment API - PATCH /api/leads/[id]/assign
 *
 * Assigns a single lead to a campaign:
 * - Verifies lead ownership
 * - Verifies campaign ownership
 * - Updates lead.campaignId and lead.status to 'qualified'
 * - Increments campaign.totalLeads
 * - Emits 'lead/qualified' Inngest event for message generation
 *
 * Note: Lead can only be in ONE campaign (FK constraint).
 * Reassigning removes from old campaign (no event for old).
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { db, leads, campaigns, actions } from '@/lib/db';
import { eq, and, sql } from 'drizzle-orm';
import { inngest } from '@/lib/inngest';

/**
 * Zod schema for assign request body
 */
const assignLeadSchema = z.object({
  campaignId: z.string().uuid('Invalid campaign ID'),
});

/**
 * PATCH /api/leads/[id]/assign
 *
 * Assigns a lead to a campaign.
 *
 * Path params:
 * - id: Lead UUID
 *
 * Body:
 * - campaignId: Campaign UUID to assign lead to
 *
 * Returns:
 * - lead: Updated lead object
 * - 400: Validation error
 * - 401: Not authenticated
 * - 404: Lead not found or not owned by user
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
    const parsed = assignLeadSchema.safeParse(body);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: fieldErrors,
        },
        { status: 400 }
      );
    }

    const { campaignId } = parsed.data;

    // Verify lead exists and is owned by user
    const [existingLead] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.id, id), eq(leads.userId, userId)));

    if (!existingLead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Verify campaign exists and is owned by user
    const [existingCampaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)));

    if (!existingCampaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const previousCampaignId = existingLead.campaignId;
    const isReassignment = previousCampaignId && previousCampaignId !== campaignId;
    const isAlreadyAssigned = previousCampaignId === campaignId;

    // If already assigned to the same campaign, check for pending action
    // to avoid duplicate event emission
    let hasPendingAction = false;
    if (isAlreadyAssigned) {
      const [pendingAction] = await db
        .select({ id: actions.id })
        .from(actions)
        .where(
          and(
            eq(actions.leadId, id),
            eq(actions.campaignId, campaignId),
            eq(actions.status, 'pending')
          )
        );
      hasPendingAction = !!pendingAction;
    }

    // Update lead: set campaignId and status to 'qualified'
    const [updatedLead] = await db
      .update(leads)
      .set({
        campaignId,
        status: 'qualified',
        updatedAt: new Date(),
      })
      .where(and(eq(leads.id, id), eq(leads.userId, userId)))
      .returning();

    // Decrement old campaign's totalLeads if reassigning
    if (isReassignment) {
      await db
        .update(campaigns)
        .set({
          totalLeads: sql`GREATEST(${campaigns.totalLeads} - 1, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, previousCampaignId));
    }

    // Increment new campaign's totalLeads (only if not already assigned to same campaign)
    if (!isAlreadyAssigned) {
      await db
        .update(campaigns)
        .set({
          totalLeads: sql`${campaigns.totalLeads} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, campaignId));
    }

    // Emit lead/qualified event for message generation
    // Skip if already assigned to same campaign with pending action
    if (!hasPendingAction) {
      await inngest.send({
        name: 'lead/qualified',
        data: {
          leadId: id,
          campaignId,
          userId,
        },
      });
    }

    return NextResponse.json({ lead: updatedLead });
  } catch (error) {
    console.error('Error assigning lead to campaign:', error);
    return NextResponse.json(
      { error: 'Failed to assign lead to campaign' },
      { status: 500 }
    );
  }
}
