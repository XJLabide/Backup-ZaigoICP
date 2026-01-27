/**
 * Campaign API - GET and POST endpoints
 *
 * GET: Lists campaigns for the authenticated user with pagination
 * POST: Creates a new campaign for the authenticated user
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { db, campaigns } from '@/lib/db';
import { eq, desc, sql } from 'drizzle-orm';

/**
 * Pagination constants
 */
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

/**
 * GET /api/campaigns
 *
 * Lists campaigns for the authenticated user with pagination.
 *
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10, max: 50)
 *
 * Returns:
 * - campaigns: Array of campaign objects
 * - pagination: { page, limit, total, totalPages }
 */
export async function GET(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Parse query params
    const url = new URL(request.url);
    const pageParam = url.searchParams.get('page');
    const limitParam = url.searchParams.get('limit');

    // Parse and validate page number
    let page = DEFAULT_PAGE;
    if (pageParam) {
      const parsedPage = parseInt(pageParam, 10);
      if (!isNaN(parsedPage) && parsedPage > 0) {
        page = parsedPage;
      }
    }

    // Parse and validate limit
    let limit = DEFAULT_LIMIT;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        limit = Math.min(parsedLimit, MAX_LIMIT);
      }
    }

    // Calculate offset
    const offset = (page - 1) * limit;

    // Get total count for pagination
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(campaigns)
      .where(eq(campaigns.userId, userId));

    const total = countResult?.count ?? 0;
    const totalPages = Math.ceil(total / limit);

    // Get campaigns with pagination, ordered by createdAt desc
    const userCampaigns = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.userId, userId))
      .orderBy(desc(campaigns.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      campaigns: userCampaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error listing campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to list campaigns' },
      { status: 500 }
    );
  }
}

/**
 * Zod schema for campaign creation request body
 */
const createCampaignSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  tone: z.enum(['professional', 'friendly', 'direct']).optional(),
  cta: z.enum(['book_call', 'reply', 'visit_site']).optional(),
  calendarLink: z.string().url('Invalid calendar link URL').optional().nullable(),
  qualificationRules: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val) return true;
        try {
          JSON.parse(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: 'qualificationRules must be valid JSON' }
    ),
  autoApprove: z.boolean().optional(),
});

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createCampaignSchema.safeParse(body);

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

    const { name, tone, cta, calendarLink, qualificationRules, autoApprove } =
      parsed.data;

    const [campaign] = await db
      .insert(campaigns)
      .values({
        userId,
        name,
        tone: tone ?? 'professional',
        cta: cta ?? 'reply',
        calendarLink: calendarLink ?? null,
        qualificationRules: qualificationRules ?? null,
        autoApprove: autoApprove ?? false,
      })
      .returning();

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
