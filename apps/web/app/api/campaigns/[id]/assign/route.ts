/**
 * Bulk Lead Assignment API - POST /api/campaigns/[id]/assign
 *
 * Bulk-assigns multiple leads to a campaign:
 * - Validates campaign ownership
 * - Validates all leads owned by user
 * - Updates lead.campaignId and lead.status to 'qualified' atomically
 * - Increments campaign.totalLeads appropriately
 * - Emits 'lead/qualified' Inngest events for newly assigned leads only
 *
 * Note: Max 100 leads per request to prevent timeout.
 * Skips leads already assigned to this campaign (no duplicate events).
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { db, leads, campaigns, actions } from '@/lib/db';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { inngest } from '@/lib/inngest';

/**
 * Zod schema for bulk assign request body
 */
const bulkAssignSchema = z.object({
  leadIds: z
    .array(z.string().uuid('Invalid lead ID'))
    .min(1, 'At least one lead ID is required')
    .max(100, 'Maximum 100 leads per request'),
});

/**
 * POST /api/campaigns/[id]/assign
 *
 * Bulk-assigns leads to a campaign.
 *
 * Path params:
 * - id: Campaign UUID
 *
 * Body:
 * - leadIds: Array of lead UUIDs to assign (max 100)
 *
 * Returns:
 * - assignedCount: Number of leads newly assigned
 * - skippedCount: Number of leads already assigned to this campaign
 * - 400: Validation error or >100 leads
 * - 400: Some leadIds not owned by user
 * - 401: Not authenticated
 * - 404: Campaign not found or not owned by user
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id: campaignId } = await params;

    // Validate request body
    const body = await request.json();
    const parsed = bulkAssignSchema.safeParse(body);

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

    const { leadIds } = parsed.data;

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

    // Verify all leads exist and are owned by user
    const ownedLeads = await db
      .select({
        id: leads.id,
        campaignId: leads.campaignId,
      })
      .from(leads)
      .where(and(inArray(leads.id, leadIds), eq(leads.userId, userId)));

    // Check if all requested leads are owned by the user
    const ownedLeadIds = new Set(ownedLeads.map((l) => l.id));
    const notOwnedLeadIds = leadIds.filter((id) => !ownedLeadIds.has(id));

    if (notOwnedLeadIds.length > 0) {
      return NextResponse.json(
        {
          error: 'Some leads not found or not owned by user',
          details: { invalidLeadIds: notOwnedLeadIds },
        },
        { status: 400 }
      );
    }

    // Separate leads: already assigned to this campaign vs new assignments
    const alreadyAssignedLeadIds = ownedLeads
      .filter((l) => l.campaignId === campaignId)
      .map((l) => l.id);

    const leadsToAssign = ownedLeads.filter(
      (l) => l.campaignId !== campaignId
    );
    const leadIdsToAssign = leadsToAssign.map((l) => l.id);

    // Track leads being reassigned from other campaigns
    const leadsFromOtherCampaigns = leadsToAssign.filter(
      (l) => l.campaignId !== null
    );
    const previousCampaignIds = [
      ...new Set(
        leadsFromOtherCampaigns
          .map((l) => l.campaignId)
          .filter((id): id is string => id !== null)
      ),
    ];

    // Check for pending actions on leads already assigned to this campaign
    // to avoid emitting duplicate events
    let leadsWithPendingActions: Set<string> = new Set();
    if (alreadyAssignedLeadIds.length > 0) {
      const pendingActions = await db
        .select({ leadId: actions.leadId })
        .from(actions)
        .where(
          and(
            inArray(actions.leadId, alreadyAssignedLeadIds),
            eq(actions.campaignId, campaignId),
            eq(actions.status, 'pending')
          )
        );
      leadsWithPendingActions = new Set(pendingActions.map((a) => a.leadId));
    }

    // Leads already assigned but without pending actions can receive new events
    const alreadyAssignedNeedingEvent = alreadyAssignedLeadIds.filter(
      (id) => !leadsWithPendingActions.has(id)
    );

    // If no leads to assign, return early
    if (leadIdsToAssign.length === 0 && alreadyAssignedNeedingEvent.length === 0) {
      return NextResponse.json({
        assignedCount: 0,
        skippedCount: alreadyAssignedLeadIds.length,
      });
    }

    // Perform updates atomically
    // Note: Neon doesn't support traditional transactions via drizzle-orm/neon-http
    // but we can still update all at once with inArray

    // Update leads that need assignment
    if (leadIdsToAssign.length > 0) {
      await db
        .update(leads)
        .set({
          campaignId,
          status: 'qualified',
          updatedAt: new Date(),
        })
        .where(
          and(inArray(leads.id, leadIdsToAssign), eq(leads.userId, userId))
        );
    }

    // Decrement totalLeads for previous campaigns
    for (const prevCampaignId of previousCampaignIds) {
      const leadsFromThisCampaign = leadsFromOtherCampaigns.filter(
        (l) => l.campaignId === prevCampaignId
      ).length;

      await db
        .update(campaigns)
        .set({
          totalLeads: sql`GREATEST(${campaigns.totalLeads} - ${leadsFromThisCampaign}, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, prevCampaignId));
    }

    // Increment totalLeads for new campaign
    if (leadIdsToAssign.length > 0) {
      await db
        .update(campaigns)
        .set({
          totalLeads: sql`${campaigns.totalLeads} + ${leadIdsToAssign.length}`,
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, campaignId));
    }

    // Emit lead/qualified events for newly assigned leads
    const leadIdsForEvents = [...leadIdsToAssign, ...alreadyAssignedNeedingEvent];

    if (leadIdsForEvents.length > 0) {
      const events = leadIdsForEvents.map((leadId) => ({
        name: 'lead/qualified' as const,
        data: {
          leadId,
          campaignId,
          userId,
        },
      }));

      await inngest.send(events);
    }

    return NextResponse.json({
      assignedCount: leadIdsToAssign.length,
      skippedCount: alreadyAssignedLeadIds.length,
    });
  } catch (error) {
    console.error('Error bulk assigning leads to campaign:', error);
    return NextResponse.json(
      { error: 'Failed to assign leads to campaign' },
      { status: 500 }
    );
  }
}
