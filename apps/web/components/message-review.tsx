'use client';

/**
 * Message Review Component
 *
 * Client component for reviewing and editing AI-generated messages.
 * Features:
 * - Display lead info, message text, quality score
 * - Show issues list when score < 80
 * - Inline edit mode with textarea and character counter
 * - Save, Approve, Reject buttons
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QualityScoreBadge } from '@/components/quality-score-badge';

const MAX_MESSAGE_LENGTH = 300;

interface MessageReviewProps {
  action: {
    id: string;
    message: string;
    qualityScore: number | null;
    qualityIssues: string[] | null;
    status: string;
  };
  lead: {
    id: string;
    fullName: string;
    firstName: string | null;
    headline: string | null;
    company: string | null;
    profileImageUrl: string | null;
  };
  campaign: {
    id: string;
    name: string;
  };
}

export function MessageReview({ action, lead, campaign }: MessageReviewProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editedMessage, setEditedMessage] = useState(action.message);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const characterCount = editedMessage.length;
  const isOverLimit = characterCount > MAX_MESSAGE_LENGTH;
  const qualityScore = action.qualityScore ?? 0;
  const showIssues = qualityScore < 80 && action.qualityIssues && action.qualityIssues.length > 0;

  /**
   * Handles save of edited message via PATCH API.
   */
  async function handleSave() {
    if (isOverLimit) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/actions/${action.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: editedMessage }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save message');
      }

      setIsEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save message');
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Handles approval of the message.
   */
  async function handleApprove() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/actions/${action.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve message');
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve message');
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Handles rejection of the message.
   */
  async function handleReject() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/actions/${action.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reject message');
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject message');
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Cancels editing and reverts to original message.
   */
  function handleCancel() {
    setEditedMessage(action.message);
    setIsEditing(false);
    setError(null);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          {/* Lead info */}
          <div className="flex items-center gap-3">
            {lead.profileImageUrl ? (
              <img
                src={lead.profileImageUrl}
                alt={lead.fullName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-medium">
                {lead.firstName?.[0] || lead.fullName[0]}
              </div>
            )}
            <div>
              <div className="font-medium">{lead.fullName}</div>
              {lead.headline && (
                <div className="text-sm text-gray-500 line-clamp-1">{lead.headline}</div>
              )}
              {lead.company && (
                <div className="text-xs text-gray-400">{lead.company}</div>
              )}
            </div>
          </div>

          {/* Quality score and campaign */}
          <div className="flex items-center gap-2">
            {action.qualityScore !== null && (
              <QualityScoreBadge score={action.qualityScore} showLabel />
            )}
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
              {campaign.name}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Quality issues */}
        {showIssues && (
          <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="text-sm font-medium text-yellow-800 mb-1">Quality Issues</div>
            <ul className="text-sm text-yellow-700 list-disc list-inside space-y-0.5">
              {action.qualityIssues!.map((issue, idx) => (
                <li key={idx}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Message content */}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editedMessage}
              onChange={(e) => setEditedMessage(e.target.value)}
              className="w-full min-h-[120px] p-3 border rounded-md text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your message..."
              disabled={isLoading}
            />
            <div className="flex items-center justify-between text-sm">
              <span
                className={
                  isOverLimit
                    ? 'text-red-600 font-medium'
                    : characterCount > MAX_MESSAGE_LENGTH * 0.9
                      ? 'text-yellow-600'
                      : 'text-gray-500'
                }
              >
                {characterCount}/{MAX_MESSAGE_LENGTH} characters
              </span>
              {isOverLimit && (
                <span className="text-red-600 text-xs">
                  Message exceeds maximum length
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="p-3 bg-gray-50 rounded-md text-sm whitespace-pre-wrap">
            {action.message}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-4 flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                onClick={handleSave}
                disabled={isLoading || isOverLimit}
                size="sm"
              >
                {isLoading ? 'Saving...' : 'Save'}
              </Button>
              <Button
                onClick={handleCancel}
                variant="outline"
                size="sm"
                disabled={isLoading}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                size="sm"
                disabled={isLoading || action.status === 'approved' || action.status === 'rejected'}
              >
                Edit
              </Button>
              {action.status === 'pending' && (
                <>
                  <Button
                    onClick={handleApprove}
                    size="sm"
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isLoading ? 'Approving...' : 'Approve'}
                  </Button>
                  <Button
                    onClick={handleReject}
                    variant="destructive"
                    size="sm"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Rejecting...' : 'Reject'}
                  </Button>
                </>
              )}
              {action.status === 'approved' && (
                <span className="text-sm text-green-600 font-medium">Approved</span>
              )}
              {action.status === 'rejected' && (
                <span className="text-sm text-red-600 font-medium">Rejected</span>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
