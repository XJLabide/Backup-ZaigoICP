export const dynamic = 'force-dynamic';

/**
 * Messages Page
 *
 * Server component that displays pending and approved messages for review.
 * Features:
 * - List actions with status in (pending, approved)
 * - Join with leads and campaigns for display data
 * - Filter by campaign dropdown
 * - Filter by status dropdown (pending/approved)
 */

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db, actions, leads, campaigns } from '@/lib/db';
import { eq, and, inArray, desc } from 'drizzle-orm';

import { Header } from '@/components/header';
import { Card, CardContent } from '@/components/ui/card';
import { MessageReview } from '@/components/message-review';
import { MessagesFilters } from './messages-filters';

interface MessagesPageProps {
  searchParams: Promise<{
    campaign?: string;
    status?: string;
  }>;
}

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const params = await searchParams;
  const campaignFilter = params.campaign;
  const statusFilter = params.status;

  // Fetch user's campaigns for the filter dropdown
  const userCampaigns = await db
    .select({
      id: campaigns.id,
      name: campaigns.name,
    })
    .from(campaigns)
    .where(eq(campaigns.userId, userId))
    .orderBy(campaigns.name);

  // Build conditions for actions query
  const statusConditions = statusFilter
    ? statusFilter === 'pending'
      ? eq(actions.status, 'pending')
      : statusFilter === 'approved'
        ? eq(actions.status, 'approved')
        : inArray(actions.status, ['pending', 'approved'])
    : inArray(actions.status, ['pending', 'approved']);

  // Fetch actions with related leads and campaigns
  const messagesData = await db
    .select({
      action: {
        id: actions.id,
        message: actions.message,
        qualityScore: actions.qualityScore,
        usedSignals: actions.usedSignals,
        status: actions.status,
        createdAt: actions.createdAt,
        leadId: actions.leadId,
        campaignId: actions.campaignId,
      },
      lead: {
        id: leads.id,
        fullName: leads.fullName,
        firstName: leads.firstName,
        headline: leads.headline,
        company: leads.company,
        profileImageUrl: leads.profileImageUrl,
      },
      campaign: {
        id: campaigns.id,
        name: campaigns.name,
      },
    })
    .from(actions)
    .innerJoin(leads, eq(actions.leadId, leads.id))
    .innerJoin(campaigns, eq(actions.campaignId, campaigns.id))
    .where(
      campaignFilter
        ? and(
            eq(actions.userId, userId),
            statusConditions,
            eq(actions.campaignId, campaignFilter)
          )
        : and(eq(actions.userId, userId), statusConditions)
    )
    .orderBy(desc(actions.createdAt));

  // Parse qualityIssues from usedSignals (stored as JSON string)
  // Note: qualityIssues might be stored in usedSignals field as part of the JSON
  // For now, we'll check if there's a quality issues pattern in the data
  const messages = messagesData.map((row) => {
    let qualityIssues: string[] | null = null;

    // Try to parse usedSignals which might contain issues data
    if (row.action.usedSignals) {
      try {
        const parsed = JSON.parse(row.action.usedSignals);
        if (Array.isArray(parsed.issues)) {
          qualityIssues = parsed.issues;
        }
      } catch {
        // Not valid JSON or doesn't have issues
      }
    }

    return {
      action: {
        ...row.action,
        qualityIssues,
      },
      lead: row.lead,
      campaign: row.campaign,
    };
  });

  const pendingCount = messagesData.filter((m) => m.action.status === 'pending').length;
  const approvedCount = messagesData.filter((m) => m.action.status === 'approved').length;

  return (
    <div>
      <Header title="Messages" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-gray-600">
              Review and approve AI-generated messages before sending
            </p>
            <div className="flex gap-4 mt-2 text-sm">
              <span className="text-gray-500">
                <span className="font-medium text-gray-900">{pendingCount}</span> pending
              </span>
              <span className="text-gray-500">
                <span className="font-medium text-gray-900">{approvedCount}</span> approved
              </span>
            </div>
          </div>
          <MessagesFilters
            campaigns={userCampaigns}
            currentCampaign={campaignFilter}
            currentStatus={statusFilter}
          />
        </div>

        {messages.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-6xl mb-4">
                {statusFilter === 'approved' ? '✅' : '📬'}
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {statusFilter === 'approved'
                  ? 'No approved messages'
                  : 'No messages to review'}
              </h3>
              <p className="text-gray-600 text-center max-w-md">
                {statusFilter === 'approved'
                  ? 'Messages will appear here after you approve them.'
                  : 'Messages will appear here when leads are assigned to campaigns with AI message generation.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {messages.map((item) => (
              <MessageReview
                key={item.action.id}
                action={{
                  id: item.action.id,
                  message: item.action.message,
                  qualityScore: item.action.qualityScore,
                  qualityIssues: item.action.qualityIssues,
                  status: item.action.status,
                }}
                lead={{
                  id: item.lead.id,
                  fullName: item.lead.fullName,
                  firstName: item.lead.firstName,
                  headline: item.lead.headline,
                  company: item.lead.company,
                  profileImageUrl: item.lead.profileImageUrl,
                }}
                campaign={{
                  id: item.campaign.id,
                  name: item.campaign.name,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
