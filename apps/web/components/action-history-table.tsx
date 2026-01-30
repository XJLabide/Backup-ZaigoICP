'use client';

/**
 * Action History Table Component
 *
 * Displays action history in a table format with status badges and retry functionality.
 * Supports pagination via cursor-based "Load More" button.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export interface ActionHistoryItem {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'sent' | 'failed';
  message: string | null;
  sentAt: Date | null;
  lead: { id: string; fullName: string; company: string | null };
  campaign: { id: string; name: string };
}

interface ActionHistoryTableProps {
  actions: ActionHistoryItem[];
  nextCursor: string | null;
}

/**
 * Get status badge color
 */
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    approved: 'bg-blue-500/20 text-blue-400',
    rejected: 'bg-gray-500/20 text-gray-400',
    sent: 'bg-green-500/20 text-green-400',
    failed: 'bg-red-500/20 text-red-400',
  };
  return colors[status] || 'bg-gray-500/20 text-gray-400';
}

/**
 * Format a date for display
 */
function formatDate(date: Date | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Truncate message for preview
 */
function truncateMessage(message: string | null, maxLength = 50): string {
  if (!message) return '-';
  if (message.length <= maxLength) return message;
  return message.slice(0, maxLength) + '...';
}

export function ActionHistoryTable({ actions, nextCursor }: ActionHistoryTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // Reset loading state when URL params change (navigation completed)
  useEffect(() => {
    setIsLoadingMore(false);
  }, [searchParams]);

  /**
   * Handle retry action for failed messages
   */
  async function handleRetry(actionId: string) {
    setRetryingId(actionId);
    try {
      const response = await fetch(`/api/actions/${actionId}/approve`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to retry');
      }
      router.refresh();
    } catch (err) {
      console.error('Retry failed:', err);
    } finally {
      setRetryingId(null);
    }
  }

  /**
   * Load more actions using cursor pagination
   * Loading state is reset by useEffect when searchParams change
   */
  function handleLoadMore() {
    if (!nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set('cursor', nextCursor);
    router.push(`/dashboard/history?${params.toString()}`);
    // Loading state will be reset by useEffect when navigation completes
  }

  return (
    <div className="rounded-md border border-white/10 bg-[#242836]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Lead</TableHead>
            <TableHead>Campaign</TableHead>
            <TableHead className="w-[300px]">Message</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Sent At</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {actions.map((action) => (
            <TableRow key={action.id}>
              <TableCell>
                <Link
                  href={`/dashboard/leads/${action.lead.id}`}
                  className="hover:underline"
                >
                  <div className="font-medium text-white">{action.lead.fullName}</div>
                  {action.lead.company && (
                    <div className="text-sm text-gray-400">
                      {action.lead.company}
                    </div>
                  )}
                </Link>
              </TableCell>
              <TableCell>
                <span className="text-white">{action.campaign.name}</span>
              </TableCell>
              <TableCell>
                <span className="text-sm text-gray-400">
                  {truncateMessage(action.message)}
                </span>
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${getStatusColor(action.status)}`}
                >
                  {action.status}
                </span>
              </TableCell>
              <TableCell className="text-gray-400">
                {formatDate(action.sentAt)}
              </TableCell>
              <TableCell>
                {action.status === 'failed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRetry(action.id)}
                    disabled={retryingId === action.id}
                  >
                    {retryingId === action.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Retry
                      </>
                    )}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Load More Button */}
      {nextCursor && (
        <div className="flex justify-center border-t border-white/10 p-4">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}
    </div>
  );
}
