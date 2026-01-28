/**
 * Stats query functions for dashboard metrics
 *
 * Uses TWO separate queries (leads aggregates + actions aggregates) to avoid join complexity.
 * Timezone handling: compute "today" boundaries using Postgres AT TIME ZONE with user's timezone.
 * Default timezone: America/Los_Angeles if user.timezone is missing.
 */

import { db, leads, actions, users } from '@/lib/db';
import { eq, sql } from 'drizzle-orm';

export interface DashboardStats {
  leadsToday: number;
  sentToday: number;
  pendingActions: number;
  acceptanceRate: number;
  totalLeads: number;
  totalSent: number;
}

/**
 * Get dashboard stats for a user
 *
 * @param userId - Clerk user ID
 * @returns Dashboard stats object with 0s for new users (not errors)
 */
export async function getStatsForUser(
  userId: string
): Promise<DashboardStats> {
  try {
    // Get user's timezone (default to America/Los_Angeles)
    const [user] = await db
      .select({ timezone: users.timezone })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const timezone = user?.timezone ?? 'America/Los_Angeles';

    // Calculate "today" start boundary in user's timezone
    // Convert NOW() to user's timezone, truncate to date, then convert back to UTC
    const todayStart = sql`(NOW() AT TIME ZONE ${timezone})::date AT TIME ZONE ${timezone}`;

    // Query 1: Leads aggregates
    const [leadsAggregates] = await db
      .select({
        leadsToday: sql<number>`COUNT(CASE WHEN ${leads.createdAt} >= ${todayStart} THEN 1 END)::int`,
        totalLeads: sql<number>`COUNT(*)::int`,
        totalAccepted: sql<number>`COUNT(CASE WHEN ${leads.connectionAcceptedAt} IS NOT NULL THEN 1 END)::int`,
      })
      .from(leads)
      .where(eq(leads.userId, userId));

    // Query 2: Actions aggregates
    const [actionsAggregates] = await db
      .select({
        sentToday: sql<number>`COUNT(CASE WHEN ${actions.sentAt} >= ${todayStart} THEN 1 END)::int`,
        pendingActions: sql<number>`COUNT(CASE WHEN ${actions.status} = 'pending' THEN 1 END)::int`,
        totalSent: sql<number>`COUNT(CASE WHEN ${actions.status} = 'sent' THEN 1 END)::int`,
      })
      .from(actions)
      .where(eq(actions.userId, userId));

    // Calculate acceptance rate
    // acceptance rate = (total accepted connections) / (total sent messages) * 100
    // Returns 0 if totalSent is 0 to avoid division by zero
    const totalSent = actionsAggregates?.totalSent ?? 0;
    const totalAccepted = leadsAggregates?.totalAccepted ?? 0;
    const acceptanceRate =
      totalSent > 0 ? (totalAccepted / totalSent) * 100 : 0;

    return {
      leadsToday: leadsAggregates?.leadsToday ?? 0,
      sentToday: actionsAggregates?.sentToday ?? 0,
      pendingActions: actionsAggregates?.pendingActions ?? 0,
      acceptanceRate: Math.round(acceptanceRate * 100) / 100, // Round to 2 decimal places
      totalLeads: leadsAggregates?.totalLeads ?? 0,
      totalSent,
    };
  } catch (error) {
    console.error('Error fetching stats for user:', error);
    // Return 0s for new users or on error (not errors)
    return {
      leadsToday: 0,
      sentToday: 0,
      pendingActions: 0,
      acceptanceRate: 0,
      totalLeads: 0,
      totalSent: 0,
    };
  }
}
