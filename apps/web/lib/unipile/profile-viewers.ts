/**
 * Unipile API wrapper for fetching LinkedIn profile viewers.
 *
 * This module provides functions to retrieve who has viewed the user's
 * LinkedIn profile using the Unipile API.
 *
 * @module server-only - Contains API calls
 */

import 'server-only';
import { getUnipileClient } from './client';

/**
 * A LinkedIn profile viewer as returned by the Unipile API.
 */
export interface UnipileProfileViewer {
  /** Unique identifier in Unipile's system */
  id: string;
  /** LinkedIn member ID (provider_id) */
  provider_id: string;
  /** Full name of the viewer */
  name: string;
  /** First name of the viewer */
  first_name?: string;
  /** Last name of the viewer */
  last_name?: string;
  /** Professional headline */
  headline?: string;
  /** Current company name */
  company?: string;
  /** Location string */
  location?: string;
  /** URL to profile picture */
  profile_picture_url?: string;
  /** LinkedIn profile URL */
  public_profile_url?: string;
  /** When the profile was viewed (ISO timestamp) */
  viewed_at?: string;
}

/**
 * Response from the Unipile profile viewers endpoint.
 */
export interface ProfileViewersResponse {
  /** Array of profile viewer objects */
  items: UnipileProfileViewer[];
  /** Cursor for pagination (null if no more results) */
  cursor?: string | null;
}

/**
 * Normalized profile viewer type for internal use.
 * Maps Unipile response to our lead schema fields.
 */
export interface ProfileViewer {
  /** LinkedIn member ID (maps to leads.linkedInId) */
  linkedInId: string;
  /** LinkedIn profile URL (maps to leads.profileUrl) */
  profileUrl: string;
  /** Full name (maps to leads.fullName) */
  fullName: string;
  /** First name (maps to leads.firstName) */
  firstName: string | null;
  /** Last name (maps to leads.lastName) */
  lastName: string | null;
  /** Professional headline (maps to leads.headline) */
  headline: string | null;
  /** Company name (maps to leads.company) */
  company: string | null;
  /** Location (maps to leads.location) */
  location: string | null;
  /** Profile image URL (maps to leads.profileImageUrl) */
  profileImageUrl: string | null;
  /** When profile was viewed (maps to leads.viewedAt) */
  viewedAt: Date | null;
}

/**
 * Options for fetching profile viewers.
 */
export interface GetProfileViewersOptions {
  /** Pagination cursor from previous response */
  cursor?: string;
  /** Maximum number of results to return (default: 50) */
  limit?: number;
}

/**
 * Result from getProfileViewers function.
 */
export interface GetProfileViewersResult {
  /** Array of normalized profile viewers */
  viewers: ProfileViewer[];
  /** Cursor for next page (null if no more results) */
  nextCursor: string | null;
}

/**
 * Error thrown when Unipile API request fails.
 */
export class UnipileApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly errorType?: string
  ) {
    super(message);
    this.name = 'UnipileApiError';
  }
}

/**
 * Raw profile viewer card from LinkedIn's Voyager API (wvmpCards endpoint).
 */
interface RawProfileViewerCard {
  insightCard?: {
    insight?: {
      profileViewer?: {
        actorUrn?: string;
        publicIdentifier?: string;
        firstName?: string;
        lastName?: string;
        headline?: string;
        profilePicture?: string;
      };
    };
    createdAt?: number;
  };
}

/**
 * Extracts LinkedIn ID from a URN string.
 * Example: "urn:li:fs_miniProfile:abc123" -> "abc123"
 */
function extractLinkedInId(urn: string): string {
  return urn.split(':').pop() || '';
}

/**
 * Normalizes a Unipile profile viewer to our internal ProfileViewer type.
 * @deprecated Use the raw LinkedIn response parsing instead
 */
function normalizeProfileViewer(viewer: UnipileProfileViewer): ProfileViewer {
  // Build profile URL from provider_id if not provided
  const profileUrl =
    viewer.public_profile_url ||
    `https://www.linkedin.com/in/${viewer.provider_id}`;

  return {
    linkedInId: viewer.provider_id,
    profileUrl,
    fullName: viewer.name || 'Unknown',
    firstName: viewer.first_name || null,
    lastName: viewer.last_name || null,
    headline: viewer.headline || null,
    company: viewer.company || null,
    location: viewer.location || null,
    profileImageUrl: viewer.profile_picture_url || null,
    viewedAt: viewer.viewed_at ? new Date(viewer.viewed_at) : null,
  };
}

/**
 * Fetches LinkedIn profile viewers from Unipile API.
 *
 * Uses the Unipile SDK's request sender to call the profile viewers endpoint
 * which is not exposed in the SDK's typed methods.
 *
 * @param accountId - Unipile account ID for the LinkedIn connection
 * @param options - Pagination options
 * @returns Array of normalized ProfileViewer objects with pagination cursor
 * @throws UnipileApiError on API failure
 *
 * @example
 * ```typescript
 * // Fetch first page
 * const { viewers, nextCursor } = await getProfileViewers('account-123');
 *
 * // Fetch next page
 * const page2 = await getProfileViewers('account-123', { cursor: nextCursor });
 * ```
 */
export async function getProfileViewers(
  accountId: string,
  options: GetProfileViewersOptions = {}
): Promise<GetProfileViewersResult> {
  const { cursor, limit = 50 } = options;

  if (!accountId) {
    throw new UnipileApiError('accountId is required');
  }

  const client = getUnipileClient();

  // Build query parameters
  const parameters: Record<string, string> = {
    account_id: accountId,
    limit: String(limit),
  };

  if (cursor) {
    parameters.cursor = cursor;
  }

  try {
    // Use the "Magic Route" (raw data endpoint) to access LinkedIn's internal API
    // This endpoint is not exposed in the typed SDK
    // See: docs/unipile-integration.md for details
    const response = await client.request.send<{ data?: { elements?: RawProfileViewerCard[] } }>({
      method: 'POST',
      path: ['linkedin'],
      parameters: { account_id: accountId },
      body: {
        method: 'GET',
        request_url: 'https://www.linkedin.com/voyager/api/identity/wvmpCards',
        encoding: false,
      },
    });

    // Parse the raw LinkedIn response into our format
    const viewers: ProfileViewer[] = [];

    for (const card of response.data?.elements || []) {
      if (card.insightCard?.insight?.profileViewer) {
        const viewer = card.insightCard.insight.profileViewer;
        viewers.push({
          linkedInId: extractLinkedInId(viewer.actorUrn || ''),
          profileUrl: viewer.publicIdentifier
            ? `https://www.linkedin.com/in/${viewer.publicIdentifier}`
            : '',
          fullName: [viewer.firstName, viewer.lastName].filter(Boolean).join(' ') || 'Unknown',
          firstName: viewer.firstName || null,
          lastName: viewer.lastName || null,
          headline: viewer.headline || null,
          company: null, // Not available in this endpoint
          location: null, // Not available in this endpoint
          profileImageUrl: viewer.profilePicture || null,
          viewedAt: card.insightCard.createdAt ? new Date(card.insightCard.createdAt) : null,
        });
      }
    }

    return {
      viewers,
      nextCursor: null, // Pagination not supported in raw endpoint
    };
  } catch (error: unknown) {
    // Handle Unipile SDK errors
    if (error instanceof Error) {
      // Check if it's an UnsuccessfulRequestError from the SDK
      const errorBody = (error as { body?: { status?: number; type?: string; message?: string } }).body;
      if (errorBody) {
        throw new UnipileApiError(
          errorBody.message || error.message,
          errorBody.status,
          errorBody.type
        );
      }
      throw new UnipileApiError(error.message);
    }
    throw new UnipileApiError('Unknown error occurred while fetching profile viewers');
  }
}

/**
 * Fetches all profile viewers by paginating through all results.
 *
 * Use with caution as this may make multiple API requests.
 * Consider using getProfileViewers with pagination for large datasets.
 *
 * @param accountId - Unipile account ID for the LinkedIn connection
 * @param maxPages - Maximum number of pages to fetch (default: 10, prevents runaway)
 * @returns Array of all normalized ProfileViewer objects
 * @throws UnipileApiError on API failure
 */
export async function getAllProfileViewers(
  accountId: string,
  maxPages: number = 10
): Promise<ProfileViewer[]> {
  const allViewers: ProfileViewer[] = [];
  let cursor: string | undefined;
  let pageCount = 0;

  do {
    const { viewers, nextCursor } = await getProfileViewers(accountId, {
      cursor,
      limit: 50,
    });

    allViewers.push(...viewers);
    cursor = nextCursor || undefined;
    pageCount++;
  } while (cursor && pageCount < maxPages);

  return allViewers;
}
