'use client';

/**
 * Sync Status Component
 *
 * Displays the last sync time and provides a manual sync button.
 * Uses the POST /api/sync/profile-viewers endpoint to trigger sync.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface SyncStatusProps {
  lastSyncAt: Date | null;
}

/**
 * Format a date as a relative time string (e.g., "5 minutes ago")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }
}

export function SyncStatus({ lastSyncAt }: SyncStatusProps) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setIsSyncing(true);
    setError(null);

    try {
      const response = await fetch('/api/sync/profile-viewers', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to trigger sync');
      }

      // Refresh the page to show updated data
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync');
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="text-sm text-neutral-600">
        {lastSyncAt ? (
          <>Last synced {formatRelativeTime(new Date(lastSyncAt))}</>
        ) : (
          <>Never synced</>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={isSyncing}
      >
        <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
        {isSyncing ? 'Syncing...' : 'Sync Now'}
      </Button>
      {error && <span className="text-sm text-red-500">{error}</span>}
    </div>
  );
}
