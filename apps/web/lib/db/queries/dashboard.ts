/**
 * Dashboard query functions for recent leads and active campaigns
 */

import { db, leads, campaigns } from '@/lib/db';
import { eq, desc, and } from 'drizzle-orm';

// ============ TYPES ============

export interface RecentLead {
  id: string;
  fullName: string;
  headline: string | null;
  profileImageUrl: string | null;
  status: 'new' | 'qualified' | 'messaged' | 'connected' | 'replied' | 'skipped';
  createdAt: Date;
}

export interface ActiveCampaign {
  id: string;
  name: string;
  isActive: boolean | null;
  totalLeads: number | null;
  totalSent: number | null;
  totalAccepted: number | null;
  totalReplied: number | null;
}

// ============ QUERIES ============

/**
 * Get recent leads for a user
 *
 * @param userId - Clerk user ID
 * @param limit - Number of leads to return (default 5)
 * @returns Array of recent leads ordered by creation date
 */
export async function getRecentLeads(
  userId: string,
  limit = 5
): Promise<RecentLead[]> {
  try {
    const recentLeads = await db
      .select({
        id: leads.id,
        fullName: leads.fullName,
        headline: leads.headline,
        profileImageUrl: leads.profileImageUrl,
        status: leads.status,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .where(eq(leads.userId, userId))
      .orderBy(desc(leads.createdAt))
      .limit(limit);

    return recentLeads;
  } catch (error) {
    console.error('Error fetching recent leads:', error);
    return [];
  }
}

/**
 * Get active campaigns for a user
 *
 * @param userId - Clerk user ID
 * @returns Array of active campaigns with stats
 */
export async function getActiveCampaigns(
  userId: string
): Promise<ActiveCampaign[]> {
  try {
    const activeCampaigns = await db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        isActive: campaigns.isActive,
        totalLeads: campaigns.totalLeads,
        totalSent: campaigns.totalSent,
        totalAccepted: campaigns.totalAccepted,
        totalReplied: campaigns.totalReplied,
      })
      .from(campaigns)
      .where(and(eq(campaigns.userId, userId), eq(campaigns.isActive, true)))
      .orderBy(desc(campaigns.createdAt));

    return activeCampaigns;
  } catch (error) {
    console.error('Error fetching active campaigns:', error);
    return [];
  }
}
