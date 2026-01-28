'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { LinkedInConnectionStatus, ConnectionStatus } from '@/components/linkedin-connection-status';

interface DashboardActionsProps {
  className?: string;
}

export function DashboardActions({ className }: DashboardActionsProps) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ state: 'idle' });
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error' | 'rate-limited'>('idle');
  const [syncMessage, setSyncMessage] = useState<string>('');

  // Fetch user status on mount
  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('/api/user/status');
        if (!res.ok) throw new Error('Failed to fetch status');
        const data = await res.json();

        if (data.linkedInConnected) {
          setConnectionStatus({ state: 'connected', connectedAt: data.connectedAt });
        } else {
          setConnectionStatus({ state: 'disconnected' });
        }
      } catch {
        setConnectionStatus({ state: 'error', message: 'Failed to check status' });
      }
    }
    fetchStatus();
  }, []);

  const handleConnect = useCallback(() => {
    window.location.href = '/onboarding';
  }, []);

  const handleSync = useCallback(async () => {
    setSyncStatus('syncing');
    setSyncMessage('');

    try {
      const res = await fetch('/api/sync/profile-viewers', { method: 'POST' });
      const data = await res.json();

      if (res.status === 202) {
        setSyncStatus('success');
        setSyncMessage('Sync started! New leads will appear shortly.');
        setTimeout(() => setSyncStatus('idle'), 5000);
      } else if (res.status === 429) {
        setSyncStatus('rate-limited');
        setSyncMessage(data.message || 'Please wait before syncing again');
        setTimeout(() => setSyncStatus('idle'), 5000);
      } else if (res.status === 400) {
        setSyncStatus('error');
        setSyncMessage('Connect LinkedIn first');
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (err) {
      setSyncStatus('error');
      setSyncMessage(err instanceof Error ? err.message : 'Sync failed');
      setTimeout(() => setSyncStatus('idle'), 5000);
    }
  }, []);

  const isConnected = connectionStatus.state === 'connected';

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-4">
        <LinkedInConnectionStatus
          status={connectionStatus}
          onConnect={handleConnect}
        />

        {isConnected && (
          <Button
            onClick={handleSync}
            disabled={syncStatus === 'syncing'}
            variant={syncStatus === 'success' ? 'outline' : 'default'}
            size="sm"
          >
            {syncStatus === 'syncing' ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Syncing...
              </>
            ) : syncStatus === 'success' ? (
              '✓ Synced'
            ) : (
              'Sync Profile Viewers'
            )}
          </Button>
        )}
      </div>

      {syncMessage && (
        <p className={`mt-2 text-sm ${
          syncStatus === 'error' ? 'text-red-600' :
          syncStatus === 'rate-limited' ? 'text-yellow-600' :
          'text-green-600'
        }`}>
          {syncMessage}
        </p>
      )}
    </div>
  );
}
