export const dynamic = 'force-dynamic';

/**
 * Lead Detail Page
 *
 * Server component that displays full lead profile and action history.
 * Features:
 * - Lead profile info (name, headline, company, LinkedIn URL)
 * - Campaign assignment status
 * - Action history for this lead
 * - Back link to leads list
 * - 404 handling for invalid lead IDs
 */

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { db, leads, actions, campaigns } from '@/lib/db';
import { eq, and, desc, inArray } from 'drizzle-orm';

import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { LeadDetail } from '@/components/lead-detail';

interface LeadDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const { id } = await params;

  // Fetch lead with campaign info
  const [lead] = await db
    .select({
      id: leads.id,
      linkedInId: leads.linkedInId,
      profileUrl: leads.profileUrl,
      firstName: leads.firstName,
      lastName: leads.lastName,
      fullName: leads.fullName,
      headline: leads.headline,
      company: leads.company,
      location: leads.location,
      profileImageUrl: leads.profileImageUrl,
      about: leads.about,
      recentPost: leads.recentPost,
      mutualConnections: leads.mutualConnections,
      source: leads.source,
      status: leads.status,
      viewedAt: leads.viewedAt,
      enrichedAt: leads.enrichedAt,
      connectionAcceptedAt: leads.connectionAcceptedAt,
      createdAt: leads.createdAt,
      updatedAt: leads.updatedAt,
      campaignId: leads.campaignId,
    })
    .from(leads)
    .where(and(eq(leads.id, id), eq(leads.userId, userId)));

  if (!lead) {
    notFound();
  }

  // Fetch campaign info if assigned (scoped to user for security)
  let campaign = null;
  if (lead.campaignId) {
    const [campaignData] = await db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        isActive: campaigns.isActive,
      })
      .from(campaigns)
      .where(and(eq(campaigns.id, lead.campaignId), eq(campaigns.userId, userId)));
    campaign = campaignData || null;
  }

  // Fetch action history for this lead (scoped to user for security, limited for performance)
  const ACTION_HISTORY_LIMIT = 50;
  const leadActions = await db
    .select({
      id: actions.id,
      type: actions.type,
      qualityScore: actions.qualityScore,
      status: actions.status,
      approvedAt: actions.approvedAt,
      rejectedAt: actions.rejectedAt,
      sentAt: actions.sentAt,
      error: actions.error,
      createdAt: actions.createdAt,
      campaignId: actions.campaignId,
    })
    .from(actions)
    .where(and(eq(actions.leadId, lead.id), eq(actions.userId, userId)))
    .orderBy(desc(actions.createdAt))
    .limit(ACTION_HISTORY_LIMIT);

  // Get campaign names for actions (scoped to user for security)
  const actionCampaignIds = [...new Set(leadActions.map((a) => a.campaignId))];
  const actionCampaigns =
    actionCampaignIds.length > 0
      ? await db
          .select({
            id: campaigns.id,
            name: campaigns.name,
          })
          .from(campaigns)
          .where(and(inArray(campaigns.id, actionCampaignIds), eq(campaigns.userId, userId)))
      : [];

  const campaignMap = new Map(actionCampaigns.map((c) => [c.id, c.name]));

  const actionsWithCampaigns = leadActions.map((action) => ({
    ...action,
    campaignName: campaignMap.get(action.campaignId) || 'Unknown Campaign',
  }));

  return (
    <div>
      <Header title={lead.fullName} />
      <div className="p-6">
        {/* Back button */}
        <div className="mb-6">
          <Link href="/dashboard/leads">
            <Button variant="ghost">&larr; Back to Leads</Button>
          </Link>
        </div>

        <LeadDetail
          lead={lead}
          campaign={campaign}
          actions={actionsWithCampaigns}
        />
      </div>
    </div>
  );
}
