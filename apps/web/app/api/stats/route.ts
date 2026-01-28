/**
 * Stats API - GET endpoint
 *
 * GET: Returns dashboard statistics for the authenticated user
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getStatsForUser } from '@/lib/db/queries/stats';

/**
 * GET /api/stats
 *
 * Returns dashboard statistics for the authenticated user:
 * - leadsToday: Number of leads created today
 * - sentToday: Number of messages sent today
 * - pendingActions: Number of pending actions awaiting approval
 * - acceptanceRate: Percentage of sent messages that resulted in accepted connections
 * - totalLeads: Total number of leads
 * - totalSent: Total number of sent messages
 *
 * Returns:
 * - 200: Stats object
 * - 401: Unauthorized (not authenticated)
 * - 500: Internal server error
 */
export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const stats = await getStatsForUser(userId);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
