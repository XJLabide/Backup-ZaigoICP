/**
 * Action History Page
 *
 * Server component that displays the history of sent and failed actions.
 * Features:
 * - List actions with status in (sent, failed, pending, approved, rejected)
 * - Join with leads and campaigns for display data
 * - Filter by campaign dropdown
 * - Filter by status dropdown
 * - Summary counts (sent, failed, pending)
 * - Cursor-based pagination
 */

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db, actions, leads, campaigns } from '@/lib/db';
import { eq, and, desc, lt } from 'drizzle-orm';
import { History, AlertCircle } from 'lucide-react';

import { Header } from '@/components/header';
import { Card, CardContent } from '@/components/ui/card';
import {
  ActionHistoryTable,
  ActionHistoryItem,
} from '@/components/action-history-table';
import { HistoryFilters } from './history-filters';

interface HistoryPageProps {
  searchParams: Promise<{
    campaign?: string;
    status?: string;
    cursor?: string;
  }>;
}

const PAGE_SIZE = 20;

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const params = await searchParams;
  const campaignFilter = params.campaign;
  const statusFilter = params.status as ActionHistoryItem['status'] | undefined;
  const cursor = params.cursor;

  // Fetch user's campaigns for the filter dropdown
  const userCampaigns = await db
    .select({
      id: campaigns.id,
      name: campaigns.name,
    })
    .from(campaigns)
    .where(eq(campaigns.userId, userId))
    .orderBy(campaigns.name);

  // Build base conditions
  const baseConditions = [eq(actions.userId, userId)];

  // Add status filter if specified
  if (statusFilter) {
    baseConditions.push(eq(actions.status, statusFilter));
  }

  // Add campaign filter if specified
  if (campaignFilter) {
    baseConditions.push(eq(actions.campaignId, campaignFilter));
  }

  // Add cursor condition for pagination
  if (cursor) {
    baseConditions.push(lt(actions.createdAt, new Date(cursor)));
  }

  // Fetch actions with related leads and campaigns
  const historyData = await db
    .select({
      action: {
        id: actions.id,
        message: actions.message,
        status: actions.status,
        sentAt: actions.sentAt,
        createdAt: actions.createdAt,
        leadId: actions.leadId,
        campaignId: actions.campaignId,
      },
      lead: {
        id: leads.id,
        fullName: leads.fullName,
        company: leads.company,
      },
      campaign: {
        id: campaigns.id,
        name: campaigns.name,
      },
    })
    .from(actions)
    .innerJoin(leads, eq(actions.leadId, leads.id))
    .innerJoin(campaigns, eq(actions.campaignId, campaigns.id))
    .where(and(...baseConditions))
    .orderBy(desc(actions.createdAt))
    .limit(PAGE_SIZE + 1);

  // Check if there are more results
  const hasMore = historyData.length > PAGE_SIZE;
  const displayData = hasMore ? historyData.slice(0, PAGE_SIZE) : historyData;

  // Get next cursor from last item
  const nextCursor = hasMore
    ? displayData[displayData.length - 1].action.createdAt?.toISOString() || null
    : null;

  // Transform data to match ActionHistoryItem interface
  const historyItems: ActionHistoryItem[] = displayData.map((row) => ({
    id: row.action.id,
    status: row.action.status as ActionHistoryItem['status'],
    message: row.action.message,
    sentAt: row.action.sentAt,
    lead: {
      id: row.lead.id,
      fullName: row.lead.fullName,
      company: row.lead.company,
    },
    campaign: {
      id: row.campaign.id,
      name: row.campaign.name,
    },
  }));

  // Fetch summary counts (without pagination/cursor)
  const summaryConditions = [eq(actions.userId, userId)];
  if (campaignFilter) {
    summaryConditions.push(eq(actions.campaignId, campaignFilter));
  }

  const allActionsForSummary = await db
    .select({
      status: actions.status,
    })
    .from(actions)
    .where(and(...summaryConditions));

  const sentCount = allActionsForSummary.filter((a) => a.status === 'sent').length;
  const failedCount = allActionsForSummary.filter((a) => a.status === 'failed').length;
  const pendingCount = allActionsForSummary.filter((a) => a.status === 'pending').length;

  return (
    <div>
      <Header title="History" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-gray-600">
              View the history of all your sent and failed connection requests
            </p>
            <div className="flex gap-4 mt-2 text-sm">
              <span className="text-gray-500">
                <span className="font-medium text-green-600">{sentCount}</span> sent
              </span>
              <span className="text-gray-500">
                <span className="font-medium text-red-600">{failedCount}</span> failed
              </span>
              <span className="text-gray-500">
                <span className="font-medium text-yellow-600">{pendingCount}</span> pending
              </span>
            </div>
          </div>
          <HistoryFilters
            campaigns={userCampaigns}
            currentCampaign={campaignFilter}
            currentStatus={statusFilter}
          />
        </div>

        {historyItems.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              {statusFilter === 'failed' ? (
                <AlertCircle className="h-16 w-16 text-neutral-400 mb-4" />
              ) : (
                <History className="h-16 w-16 text-neutral-400 mb-4" />
              )}
              <h3 className="text-lg font-semibold mb-2">
                {statusFilter === 'failed'
                  ? 'No failed actions'
                  : statusFilter === 'sent'
                    ? 'No sent actions yet'
                    : 'No action history'}
              </h3>
              <p className="text-gray-600 text-center max-w-md">
                {statusFilter === 'failed'
                  ? 'Great news! You have no failed connection requests.'
                  : statusFilter === 'sent'
                    ? 'Actions will appear here after they are sent to LinkedIn.'
                    : 'Your action history will appear here as messages are approved and sent.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <ActionHistoryTable actions={historyItems} nextCursor={nextCursor} />
        )}
      </div>
    </div>
  );
}
