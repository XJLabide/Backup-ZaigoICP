/**
 * Leads Page
 *
 * Server component that displays leads in a filterable, sortable table.
 * Features:
 * - Table with leads data (name, company, status, dates)
 * - Filter dropdowns for status and source
 * - Cursor-based pagination (load more)
 * - Sync status indicator with manual sync button
 * - Loading states and empty state
 */

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db, leads, users } from '@/lib/db';
import { eq, and, lt, or, desc, SQL, sql, ilike } from 'drizzle-orm';
import { StatCard } from '@/components/dashboard/stat-card';
import { Users, Search } from 'lucide-react';

import { Header } from '@/components/header';
import { Card, CardContent } from '@/components/ui/card';
import { LeadsTable } from '@/components/leads-table';
import { SyncStatus } from '@/components/sync-status';
import { LeadsFilters } from './leads-filters';

/**
 * Pagination constants
 */
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Cursor structure for composite cursor pagination
 * Uses createdAt + id to handle same-timestamp leads correctly
 */
interface CursorData {
  createdAt: string;
  id: string;
}

/**
 * Encode a composite cursor (createdAt + id) to base64
 * This prevents skipping leads with identical timestamps
 */
function encodeCursor(createdAt: Date, id: string): string {
  const data: CursorData = { createdAt: createdAt.toISOString(), id };
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

/**
 * Decode a base64 composite cursor
 * Returns null if invalid
 */
function decodeCursor(cursor: string): CursorData | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const data = JSON.parse(decoded) as CursorData;
    if (!data.createdAt || !data.id) {
      return null;
    }
    const date = new Date(data.createdAt);
    if (isNaN(date.getTime())) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Valid lead statuses
 */
const validStatuses = ['new', 'qualified', 'messaged', 'connected', 'replied', 'skipped'] as const;
type LeadStatus = (typeof validStatuses)[number];

function isValidStatus(status: string): status is LeadStatus {
  return validStatuses.includes(status as LeadStatus);
}

/**
 * Valid lead sources
 */
const validSources = ['profile_viewer'] as const;
type LeadSource = (typeof validSources)[number];

function isValidSource(source: string): source is LeadSource {
  return validSources.includes(source as LeadSource);
}

interface LeadsPageProps {
  searchParams: Promise<{
    status?: string;
    source?: string;
    cursor?: string;
    limit?: string;
    search?: string;
  }>;
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const params = await searchParams;
  const statusFilter = params.status;
  const sourceFilter = params.source;
  const cursorParam = params.cursor;
  const limitParam = params.limit;
  const searchQuery = params.search;

  // Parse and validate limit
  let limit = DEFAULT_LIMIT;
  if (limitParam) {
    const parsedLimit = parseInt(limitParam, 10);
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      limit = Math.min(parsedLimit, MAX_LIMIT);
    }
  }

  // Decode cursor if provided
  let cursorData: CursorData | null = null;
  if (cursorParam) {
    cursorData = decodeCursor(cursorParam);
  }

  // Fetch user's lastSyncAt
  const [user] = await db
    .select({ lastSyncAt: users.lastSyncAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const lastSyncAt = user?.lastSyncAt ?? null;

  // Query status counts (all leads, no filters applied)
  const statusCountsResult = await db
    .select({
      status: leads.status,
      count: sql<number>`count(*)::int`,
    })
    .from(leads)
    .where(eq(leads.userId, userId))
    .groupBy(leads.status);

  // Convert to object for easy access
  const counts = {
    total: 0,
    new: 0,
    qualified: 0,
    connected: 0,
  };
  statusCountsResult.forEach(row => {
    counts.total += row.count;
    if (row.status === 'new') counts.new = row.count;
    if (row.status === 'qualified') counts.qualified = row.count;
    if (row.status === 'connected') counts.connected = row.count;
  });

  // Build where conditions
  const conditions: SQL<unknown>[] = [eq(leads.userId, userId)];

  // Add cursor condition for descending pagination
  // Uses composite cursor (createdAt + id) to handle same-timestamp leads
  if (cursorData) {
    const cursorDate = new Date(cursorData.createdAt);
    // For descending order: get items where createdAt < cursor OR (createdAt = cursor AND id < cursorId)
    conditions.push(
      or(
        lt(leads.createdAt, cursorDate),
        and(eq(leads.createdAt, cursorDate), lt(leads.id, cursorData.id))
      )!
    );
  }

  // Add status filter
  if (statusFilter && isValidStatus(statusFilter)) {
    conditions.push(eq(leads.status, statusFilter));
  }

  // Add source filter
  if (sourceFilter && isValidSource(sourceFilter)) {
    conditions.push(eq(leads.source, sourceFilter));
  }

  // Add search filter
  if (searchQuery) {
    conditions.push(
      or(
        ilike(leads.fullName, `%${searchQuery}%`),
        ilike(leads.company, `%${searchQuery}%`),
        ilike(leads.headline, `%${searchQuery}%`)
      )!
    );
  }

  // Query leads with limit + 1 to check for more results
  // Order by createdAt DESC, id DESC to show newest leads first
  const results = await db
    .select({
      id: leads.id,
      fullName: leads.fullName,
      firstName: leads.firstName,
      headline: leads.headline,
      company: leads.company,
      location: leads.location,
      profileImageUrl: leads.profileImageUrl,
      status: leads.status,
      source: leads.source,
      viewedAt: leads.viewedAt,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .where(and(...conditions))
    .orderBy(desc(leads.createdAt), desc(leads.id))
    .limit(limit + 1);

  // Check if there are more results
  const hasMore = results.length > limit;

  // Remove the extra item if present
  const leadsToDisplay = hasMore ? results.slice(0, limit) : results;

  // Generate next cursor from last item's createdAt + id (composite cursor)
  let nextCursor: string | null = null;
  if (hasMore && leadsToDisplay.length > 0) {
    const lastLead = leadsToDisplay[leadsToDisplay.length - 1];
    if (lastLead.createdAt) {
      nextCursor = encodeCursor(lastLead.createdAt, lastLead.id);
    }
  }

  // Count totals for display
  const totalCount = leadsToDisplay.length;
  const newCount = leadsToDisplay.filter((l) => l.status === 'new').length;

  return (
    <div>
      <Header title="Leads" />
      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <StatCard title="Total Leads" value={counts.total} subtitle="" />
          <StatCard title="New" value={counts.new} subtitle="" />
          <StatCard title="Qualified" value={counts.qualified} subtitle="" />
          <StatCard title="Connected" value={counts.connected} subtitle="" />
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-neutral-600">
              Manage your LinkedIn leads from profile viewers
            </p>
          </div>
          <div className="flex items-center gap-4">
            <LeadsFilters
              currentStatus={statusFilter}
              currentSource={sourceFilter}
              currentSearch={searchQuery}
            />
            <SyncStatus lastSyncAt={lastSyncAt} />
          </div>
        </div>

        {leadsToDisplay.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              {statusFilter || sourceFilter ? (
                <Search className="h-16 w-16 text-neutral-400 mb-4" />
              ) : (
                <Users className="h-16 w-16 text-neutral-400 mb-4" />
              )}
              <h3 className="text-lg font-semibold mb-2">
                {statusFilter || sourceFilter
                  ? 'No leads match your filters'
                  : 'No leads yet'}
              </h3>
              <p className="text-neutral-600 text-center max-w-md">
                {statusFilter || sourceFilter
                  ? 'Try adjusting your filters or sync new profile viewers.'
                  : 'Leads will appear here when you sync your LinkedIn profile viewers. Click "Sync Now" to get started.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <LeadsTable leads={leadsToDisplay} nextCursor={nextCursor} />
        )}
      </div>
    </div>
  );
}
