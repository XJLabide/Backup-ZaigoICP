/**
 * Unit tests for lib/unipile/invitations.ts
 *
 * Tests the Unipile invitations API wrapper:
 * - sendConnectionRequest() sends LinkedIn connection invitations
 * - Validates required parameters (accountId, linkedInId)
 * - Validates message length (max 300 characters)
 * - Handles API errors with descriptive messages
 * - Returns requestId on success
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the client module
vi.mock('@/lib/unipile/client', () => ({
  getUnipileClient: vi.fn(),
}));

// Mock server-only since it's not available in test environment
vi.mock('server-only', () => ({}));

// Mock the profile-viewers module for UnipileApiError
vi.mock('@/lib/unipile/profile-viewers', () => ({
  UnipileApiError: class UnipileApiError extends Error {
    constructor(message: string, public statusCode?: number, public errorType?: string) {
      super(message);
      this.name = 'UnipileApiError';
    }
  },
}));

import { getUnipileClient } from '@/lib/unipile/client';
import {
  sendConnectionRequest,
  type SendInvitationParams,
} from '@/lib/unipile/invitations';

describe('lib/unipile/invitations', () => {
  let mockSend: ReturnType<typeof vi.fn>;
  let mockClient: { request: { send: ReturnType<typeof vi.fn> } };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSend = vi.fn();
    mockClient = {
      request: {
        send: mockSend,
      },
    };
    vi.mocked(getUnipileClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getUnipileClient>);
  });

  describe('sendConnectionRequest', () => {
    describe('Success Cases', () => {
      it('sends invitation without message', async () => {
        const mockResponse = {
          id: 'request-123',
          status: 'pending',
        };
        mockSend.mockResolvedValue(mockResponse);

        const params: SendInvitationParams = {
          accountId: 'account-123',
          linkedInId: 'john-doe-456',
        };

        const result = await sendConnectionRequest(params);

        expect(result).toEqual({
          success: true,
          requestId: 'request-123',
        });
      });

      it('sends invitation with message', async () => {
        const mockResponse = {
          id: 'request-456',
          status: 'pending',
        };
        mockSend.mockResolvedValue(mockResponse);

        const params: SendInvitationParams = {
          accountId: 'account-123',
          linkedInId: 'jane-smith-789',
          message: 'Hi Jane, would love to connect!',
        };

        const result = await sendConnectionRequest(params);

        expect(result).toEqual({
          success: true,
          requestId: 'request-456',
        });
      });

      it('returns requestId on success', async () => {
        const mockResponse = {
          id: 'unique-request-id-789',
        };
        mockSend.mockResolvedValue(mockResponse);

        const params: SendInvitationParams = {
          accountId: 'account-999',
          linkedInId: 'bob-johnson-111',
        };

        const result = await sendConnectionRequest(params);

        expect(result.success).toBe(true);
        expect(result.requestId).toBe('unique-request-id-789');
        expect(result.error).toBeUndefined();
      });
    });

    describe('Validation Cases', () => {
      it('returns error when accountId missing', async () => {
        const params: SendInvitationParams = {
          accountId: '',
          linkedInId: 'john-doe-456',
        };

        const result = await sendConnectionRequest(params);

        expect(result).toEqual({
          success: false,
          error: 'accountId is required',
        });
        expect(mockSend).not.toHaveBeenCalled();
      });

      it('returns error when linkedInId missing', async () => {
        const params: SendInvitationParams = {
          accountId: 'account-123',
          linkedInId: '',
        };

        const result = await sendConnectionRequest(params);

        expect(result).toEqual({
          success: false,
          error: 'linkedInId is required',
        });
        expect(mockSend).not.toHaveBeenCalled();
      });

      it('returns error when message exceeds 300 chars', async () => {
        const longMessage = 'a'.repeat(301);
        const params: SendInvitationParams = {
          accountId: 'account-123',
          linkedInId: 'john-doe-456',
          message: longMessage,
        };

        const result = await sendConnectionRequest(params);

        expect(result).toEqual({
          success: false,
          error: 'Message exceeds maximum length of 300 characters',
        });
        expect(mockSend).not.toHaveBeenCalled();
      });

      it('allows message exactly 300 chars', async () => {
        const exactMessage = 'a'.repeat(300);
        const mockResponse = {
          id: 'request-300',
        };
        mockSend.mockResolvedValue(mockResponse);

        const params: SendInvitationParams = {
          accountId: 'account-123',
          linkedInId: 'john-doe-456',
          message: exactMessage,
        };

        const result = await sendConnectionRequest(params);

        expect(result.success).toBe(true);
        expect(result.requestId).toBe('request-300');
        expect(mockSend).toHaveBeenCalled();
      });
    });

    describe('API Error Cases', () => {
      it('returns error when API returns error body', async () => {
        const apiError = new Error('Request failed');
        (apiError as unknown as { body: unknown }).body = {
          status: 429,
          type: 'errors/rate_limit',
          message: 'Rate limit exceeded',
        };
        mockSend.mockRejectedValue(apiError);

        const params: SendInvitationParams = {
          accountId: 'account-123',
          linkedInId: 'john-doe-456',
        };

        const result = await sendConnectionRequest(params);

        expect(result).toEqual({
          success: false,
          error: 'Rate limit exceeded',
        });
      });

      it('returns error when API throws generic error', async () => {
        mockSend.mockRejectedValue(new Error('Network error'));

        const params: SendInvitationParams = {
          accountId: 'account-123',
          linkedInId: 'john-doe-456',
        };

        const result = await sendConnectionRequest(params);

        expect(result).toEqual({
          success: false,
          error: 'Network error',
        });
      });

      it('returns error when API throws non-Error', async () => {
        mockSend.mockRejectedValue('string error');

        const params: SendInvitationParams = {
          accountId: 'account-123',
          linkedInId: 'john-doe-456',
        };

        const result = await sendConnectionRequest(params);

        expect(result).toEqual({
          success: false,
          error: 'Unknown error occurred while sending invitation',
        });
      });

      it('handles API error with status 403', async () => {
        const apiError = new Error('Forbidden');
        (apiError as unknown as { body: unknown }).body = {
          status: 403,
          type: 'errors/insufficient_privileges',
          message: 'Insufficient privileges to send invitation',
        };
        mockSend.mockRejectedValue(apiError);

        const params: SendInvitationParams = {
          accountId: 'account-123',
          linkedInId: 'john-doe-456',
        };

        const result = await sendConnectionRequest(params);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Insufficient privileges to send invitation');
      });

      it('handles API error without message', async () => {
        const apiError = new Error('Generic API error');
        (apiError as unknown as { body: unknown }).body = {
          status: 500,
          type: 'errors/internal_server_error',
        };
        mockSend.mockRejectedValue(apiError);

        const params: SendInvitationParams = {
          accountId: 'account-123',
          linkedInId: 'john-doe-456',
        };

        const result = await sendConnectionRequest(params);

        expect(result).toEqual({
          success: false,
          error: 'Generic API error',
        });
      });
    });

    describe('API Call Verification', () => {
      it('calls correct endpoint (POST /linkedin/invitations)', async () => {
        const mockResponse = { id: 'request-123' };
        mockSend.mockResolvedValue(mockResponse);

        const params: SendInvitationParams = {
          accountId: 'account-123',
          linkedInId: 'john-doe-456',
        };

        await sendConnectionRequest(params);

        expect(mockSend).toHaveBeenCalledWith({
          method: 'POST',
          path: ['linkedin', 'invitations'],
          body: {
            account_id: 'account-123',
            recipient_id: 'john-doe-456',
          },
        });
      });

      it('sends correct body with account_id and recipient_id', async () => {
        const mockResponse = { id: 'request-789' };
        mockSend.mockResolvedValue(mockResponse);

        const params: SendInvitationParams = {
          accountId: 'acc-999',
          linkedInId: 'linkedin-user-888',
        };

        await sendConnectionRequest(params);

        const callArgs = mockSend.mock.calls[0][0];
        expect(callArgs.body).toHaveProperty('account_id', 'acc-999');
        expect(callArgs.body).toHaveProperty('recipient_id', 'linkedin-user-888');
      });

      it('includes message in body when provided', async () => {
        const mockResponse = { id: 'request-with-msg' };
        mockSend.mockResolvedValue(mockResponse);

        const params: SendInvitationParams = {
          accountId: 'account-123',
          linkedInId: 'john-doe-456',
          message: 'Looking forward to connecting!',
        };

        await sendConnectionRequest(params);

        const callArgs = mockSend.mock.calls[0][0];
        expect(callArgs.body).toHaveProperty('message', 'Looking forward to connecting!');
      });

      it('omits message from body when not provided', async () => {
        const mockResponse = { id: 'request-no-msg' };
        mockSend.mockResolvedValue(mockResponse);

        const params: SendInvitationParams = {
          accountId: 'account-123',
          linkedInId: 'john-doe-456',
        };

        await sendConnectionRequest(params);

        const callArgs = mockSend.mock.calls[0][0];
        expect(callArgs.body).not.toHaveProperty('message');
        expect(Object.keys(callArgs.body)).toEqual(['account_id', 'recipient_id']);
      });

      it('sends POST request method', async () => {
        const mockResponse = { id: 'request-method-check' };
        mockSend.mockResolvedValue(mockResponse);

        const params: SendInvitationParams = {
          accountId: 'account-123',
          linkedInId: 'john-doe-456',
        };

        await sendConnectionRequest(params);

        expect(mockSend).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'POST',
          })
        );
      });

      it('calls linkedin/invitations path', async () => {
        const mockResponse = { id: 'request-path-check' };
        mockSend.mockResolvedValue(mockResponse);

        const params: SendInvitationParams = {
          accountId: 'account-123',
          linkedInId: 'john-doe-456',
        };

        await sendConnectionRequest(params);

        expect(mockSend).toHaveBeenCalledWith(
          expect.objectContaining({
            path: ['linkedin', 'invitations'],
          })
        );
      });
    });

    describe('Edge Cases', () => {
      it('handles empty string message', async () => {
        const mockResponse = { id: 'request-empty-msg' };
        mockSend.mockResolvedValue(mockResponse);

        const params: SendInvitationParams = {
          accountId: 'account-123',
          linkedInId: 'john-doe-456',
          message: '',
        };

        const result = await sendConnectionRequest(params);

        expect(result.success).toBe(true);
        // Empty message is treated as falsy and omitted from body
        const callArgs = mockSend.mock.calls[0][0];
        expect(callArgs.body).not.toHaveProperty('message');
      });

      it('handles message with special characters', async () => {
        const mockResponse = { id: 'request-special-chars' };
        mockSend.mockResolvedValue(mockResponse);

        const specialMessage = 'Hi! 👋 Let\'s connect? @company #networking';
        const params: SendInvitationParams = {
          accountId: 'account-123',
          linkedInId: 'john-doe-456',
          message: specialMessage,
        };

        const result = await sendConnectionRequest(params);

        expect(result.success).toBe(true);
        const callArgs = mockSend.mock.calls[0][0];
        expect(callArgs.body.message).toBe(specialMessage);
      });

      it('handles accountId with spaces (though invalid)', async () => {
        const params: SendInvitationParams = {
          accountId: '   ',
          linkedInId: 'john-doe-456',
        };

        await sendConnectionRequest(params);

        // Spaces should be truthy but this is edge case behavior
        // The actual API would reject it, but our validation passes it
        expect(mockSend).toHaveBeenCalled();
      });

      it('handles response without status field', async () => {
        const mockResponse = {
          id: 'minimal-response',
          // No status field
        };
        mockSend.mockResolvedValue(mockResponse);

        const params: SendInvitationParams = {
          accountId: 'account-123',
          linkedInId: 'john-doe-456',
        };

        const result = await sendConnectionRequest(params);

        expect(result).toEqual({
          success: true,
          requestId: 'minimal-response',
        });
      });
    });
  });
});
