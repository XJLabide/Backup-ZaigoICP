'use client';

/**
 * Sync Status Component
 *
 * Displays the last sync time and provides a manual sync button.
 * Uses the POST /api/sync/profile-viewers endpoint to trigger sync.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

interface SyncStatusProps {
  lastSyncAt: Date | null;
}

type SyncState = 'idle' | 'syncing' | 'success' | 'error';

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
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-clear success/error message after 5 seconds
  useEffect(() => {
    if (syncState === 'success' || syncState === 'error') {
      const timer = setTimeout(() => {
        setSyncState('idle');
        setErrorMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [syncState]);

  async function handleSync() {
    setSyncState('syncing');
    setErrorMessage(null);

    try {
      const response = await fetch('/api/sync/profile-viewers', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || data.message || 'Failed to trigger sync');
      }

      // Success - sync triggered
      setSyncState('success');

      // Refresh the page after a short delay to show updated data
      setTimeout(() => router.refresh(), 2000);
    } catch (err) {
      setSyncState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to sync');
    }
  }

  const isSyncing = syncState === 'syncing';

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

      {/* Success feedback */}
      {syncState === 'success' && (
        <span className="flex items-center gap-1 text-sm text-green-600">
          <CheckCircle2 className="h-4 w-4" />
          Sync triggered successfully
        </span>
      )}

      {/* Error feedback */}
      {syncState === 'error' && (
        <span className="flex items-center gap-1 text-sm text-red-500">
          <AlertCircle className="h-4 w-4" />
          {errorMessage || 'Failed to trigger sync'}
        </span>
      )}
    </div>
  );
}
