/**
 * Unipile API wrapper for sending LinkedIn connection invitations.
 *
 * This module provides functions to send connection requests to LinkedIn profiles
 * using the Unipile API.
 *
 * @module server-only - Contains API calls
 */

import 'server-only';
import { getUnipileClient } from './client';

/**
 * Parameters for sending a LinkedIn connection invitation.
 */
export interface SendInvitationParams {
  /** Unipile account ID for the LinkedIn connection */
  accountId: string;
  /** LinkedIn member ID (provider_id) of the recipient */
  linkedInId: string;
  /** Optional personalized message (max 300 characters) */
  message?: string;
}

/**
 * Result from sending a LinkedIn connection invitation.
 */
export interface SendInvitationResult {
  /** Whether the invitation was sent successfully */
  success: boolean;
  /** Request ID from Unipile (if successful) */
  requestId?: string;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Response from the Unipile invitations endpoint.
 */
interface InvitationResponse {
  /** Unique identifier for the connection request */
  id: string;
  /** Status of the invitation */
  status?: string;
}

/**
 * Maximum allowed message length for LinkedIn invitations.
 */
const MAX_MESSAGE_LENGTH = 300;

/**
 * Sends a LinkedIn connection invitation via Unipile API.
 *
 * Uses the Unipile SDK's request sender to call the invitations endpoint
 * which is not exposed in the SDK's typed methods.
 *
 * @param params - Invitation parameters including accountId, linkedInId, and optional message
 * @returns Result object with success status, requestId (if successful), or error message
 *
 * @example
 * ```typescript
 * // Send invitation without message
 * const result = await sendConnectionRequest({
 *   accountId: 'account-123',
 *   linkedInId: 'john-doe-456'
 * });
 *
 * // Send invitation with personalized message
 * const result = await sendConnectionRequest({
 *   accountId: 'account-123',
 *   linkedInId: 'jane-smith-789',
 *   message: 'Hi Jane, I saw your work on the React project and would love to connect!'
 * });
 *
 * if (result.success) {
 *   console.log('Invitation sent:', result.requestId);
 * } else {
 *   console.error('Failed to send:', result.error);
 * }
 * ```
 */
export async function sendConnectionRequest(
  params: SendInvitationParams
): Promise<SendInvitationResult> {
  const { accountId, linkedInId, message } = params;

  // Validate required parameters
  if (!accountId) {
    return {
      success: false,
      error: 'accountId is required',
    };
  }

  if (!linkedInId) {
    return {
      success: false,
      error: 'linkedInId is required',
    };
  }

  // Validate message length if provided
  if (message && message.length > MAX_MESSAGE_LENGTH) {
    return {
      success: false,
      error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`,
    };
  }

  try {
    const client = getUnipileClient();

    // Build request body
    const body: {
      account_id: string;
      recipient_id: string;
      message?: string;
    } = {
      account_id: accountId,
      recipient_id: linkedInId,
    };

    if (message) {
      body.message = message;
    }

    // Use the SDK's request sender for endpoints not in the typed SDK
    // Path: /api/v1/linkedin/invitations
    const response = await client.request.send<InvitationResponse>({
      method: 'POST',
      path: ['linkedin', 'invitations'],
      body,
    });

    return {
      success: true,
      requestId: response.id,
    };
  } catch (error: unknown) {
    // Handle Unipile SDK errors
    if (error instanceof Error) {
      // Check if it's an UnsuccessfulRequestError from the SDK
      const errorBody = (error as { body?: { status?: number; type?: string; message?: string } }).body;
      if (errorBody) {
        return {
          success: false,
          error: errorBody.message || error.message,
        };
      }
      return {
        success: false,
        error: error.message,
      };
    }
    return {
      success: false,
      error: 'Unknown error occurred while sending invitation',
    };
  }
}
