/**
 * Message Generation API - POST endpoint
 *
 * Generates personalized LinkedIn connection request messages
 * using AI based on lead data and campaign settings.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db, leads, campaigns, users } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { generateMessageWithRetry } from '@/lib/ai/message-generator';

interface GenerateMessageRequest {
  leadId: string;
  campaignId: string;
}

/**
 * POST /api/messages/generate
 *
 * Generates a personalized message for a lead based on campaign settings.
 *
 * Body:
 * - leadId: string - The lead to generate a message for
 * - campaignId: string - The campaign with tone/CTA settings
 *
 * Returns:
 * - 200 OK with generated message and quality metadata
 * - 400 Bad Request if missing required fields
 * - 401 Unauthorized if not authenticated
 * - 404 Not Found if lead or campaign doesn't exist
 * - 500 Internal Server Error on failure
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: GenerateMessageRequest = await request.json();
    const { leadId, campaignId } = body;

    if (!leadId || !campaignId) {
      return NextResponse.json(
        { error: 'Missing required fields: leadId, campaignId' },
        { status: 400 }
      );
    }

    // Fetch lead data
    const [lead] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.userId, userId)));

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Fetch campaign data
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)));

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Fetch user for name
    const [user] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, userId));

    const userName = user?.name || user?.email?.split('@')[0] || 'there';

    // Generate message
    const result = await generateMessageWithRetry(
      {
        firstName: lead.firstName || lead.fullName.split(' ')[0],
        lastName: lead.lastName || undefined,
        headline: lead.headline || undefined,
        company: lead.company || undefined,
        recentPost: lead.recentPost || undefined,
        mutualConnections: lead.mutualConnections || undefined,
      },
      {
        tone: campaign.tone,
        cta: campaign.cta,
        calendarLink: campaign.calendarLink || undefined,
        userName,
      }
    );

    return NextResponse.json({
      message: result.message,
      qualityScore: result.qualityScore,
      issues: result.issues,
      usedSignals: result.usedSignals,
      leadId,
      campaignId,
    });
  } catch (error) {
    console.error('Error generating message:', error);
    return NextResponse.json(
      { error: 'Failed to generate message' },
      { status: 500 }
    );
  }
}
