/**
 * Leads API - GET endpoint with cursor pagination
 *
 * GET: Lists leads for the authenticated user with cursor-based pagination
 *
 * Query params:
 * - cursor: Base64-encoded createdAt timestamp for pagination
 * - limit: Items per page (default: 20, max: 100)
 * - status: Filter by lead status (new, qualified, messaged, connected, replied, skipped)
 * - campaignId: Filter by campaign ID
 * - source: Filter by lead source (profile_viewer)
 *
 * Returns:
 * - leads: Array of lead objects
 * - nextCursor: Base64-encoded cursor for next page, or null if no more results
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db, leads, leadStatusEnum, leadSourceEnum } from '@/lib/db';
import { eq, and, gt, asc, SQL } from 'drizzle-orm';

/**
 * Pagination constants
 */
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Encode a timestamp to base64 cursor
 */
function encodeCursor(date: Date): string {
  return Buffer.from(date.toISOString()).toString('base64');
}

/**
 * Decode a base64 cursor to timestamp
 * Returns null if invalid
 */
function decodeCursor(cursor: string): Date | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const date = new Date(decoded);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  } catch {
    return null;
  }
}

/**
 * Validate status filter value
 */
function isValidStatus(status: string): boolean {
  const validStatuses = leadStatusEnum.enumValues;
  return validStatuses.includes(status as (typeof validStatuses)[number]);
}

/**
 * Validate source filter value
 */
function isValidSource(source: string): boolean {
  const validSources = leadSourceEnum.enumValues;
  return validSources.includes(source as (typeof validSources)[number]);
}

/**
 * GET /api/leads
 *
 * Lists leads for the authenticated user with cursor-based pagination.
 *
 * Returns:
 * - leads: Array of lead objects
 * - nextCursor: Base64-encoded cursor for next page, or null if no more results
 */
export async function GET(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Parse query params
    const url = new URL(request.url);
    const cursorParam = url.searchParams.get('cursor');
    const limitParam = url.searchParams.get('limit');
    const statusParam = url.searchParams.get('status');
    const campaignIdParam = url.searchParams.get('campaignId');
    const sourceParam = url.searchParams.get('source');

    // Parse and validate limit
    let limit = DEFAULT_LIMIT;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        limit = Math.min(parsedLimit, MAX_LIMIT);
      }
    }

    // Decode cursor if provided
    let cursorDate: Date | null = null;
    if (cursorParam) {
      cursorDate = decodeCursor(cursorParam);
      if (!cursorDate) {
        return NextResponse.json(
          { error: 'Invalid cursor format' },
          { status: 400 }
        );
      }
    }

    // Build where conditions
    const conditions: SQL<unknown>[] = [eq(leads.userId, userId)];

    // Add cursor condition
    if (cursorDate) {
      conditions.push(gt(leads.createdAt, cursorDate));
    }

    // Add status filter
    if (statusParam) {
      if (!isValidStatus(statusParam)) {
        return NextResponse.json(
          { error: 'Invalid status filter value' },
          { status: 400 }
        );
      }
      conditions.push(
        eq(leads.status, statusParam as (typeof leadStatusEnum.enumValues)[number])
      );
    }

    // Add campaignId filter
    if (campaignIdParam) {
      conditions.push(eq(leads.campaignId, campaignIdParam));
    }

    // Add source filter
    if (sourceParam) {
      if (!isValidSource(sourceParam)) {
        return NextResponse.json(
          { error: 'Invalid source filter value' },
          { status: 400 }
        );
      }
      conditions.push(
        eq(leads.source, sourceParam as (typeof leadSourceEnum.enumValues)[number])
      );
    }

    // Query leads with limit + 1 to check for more results
    const results = await db
      .select()
      .from(leads)
      .where(and(...conditions))
      .orderBy(asc(leads.createdAt))
      .limit(limit + 1);

    // Check if there are more results
    const hasMore = results.length > limit;

    // Remove the extra item if present
    const leadsToReturn = hasMore ? results.slice(0, limit) : results;

    // Generate next cursor from last item's createdAt
    let nextCursor: string | null = null;
    if (hasMore && leadsToReturn.length > 0) {
      const lastLead = leadsToReturn[leadsToReturn.length - 1];
      if (lastLead.createdAt) {
        nextCursor = encodeCursor(lastLead.createdAt);
      }
    }

    return NextResponse.json({
      leads: leadsToReturn,
      nextCursor,
    });
  } catch (error) {
    console.error('Error listing leads:', error);
    return NextResponse.json(
      { error: 'Failed to list leads' },
      { status: 500 }
    );
  }
}
