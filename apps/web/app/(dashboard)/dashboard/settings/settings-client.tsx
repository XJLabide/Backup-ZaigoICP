'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { ConnectLinkedInCard } from '@/components/settings/connect-linkedin-card';
import { CalendarLinkCard } from '@/components/settings/calendar-link-card';
import { RateLimitingCard } from '@/components/settings/rate-limiting-card';

interface SettingsClientProps {
  isLinkedInConnected: boolean;
  calendarLink: string | null;
  dailyLimit: number;
}

export function SettingsClient({
  isLinkedInConnected,
  calendarLink,
  dailyLimit,
}: SettingsClientProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const router = useRouter();

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch('/api/auth/unipile/connect', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to generate auth link');
      }

      const data = await response.json();

      if (data.url) {
        // Redirect to Unipile OAuth flow
        window.location.href = data.url;
      } else {
        throw new Error('No auth URL returned');
      }
    } catch (error) {
      console.error('Connection error:', error);
      alert('Unable to connect to LinkedIn. Please try again.');
      setIsConnecting(false);
    }
  };

  const handleSaveCalendarLink = async (url: string) => {
    try {
      const response = await fetch('/api/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          calendarLink: url || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update calendar link');
      }

      router.refresh();
    } catch (error) {
      console.error('Save error:', error);
      alert('Unable to save calendar link. Please try again.');
      throw error;
    }
  };

  const handleSaveDailyLimit = async (limit: number) => {
    try {
      const response = await fetch('/api/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dailyLimit: limit,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update daily limit');
      }

      router.refresh();
    } catch (error) {
      console.error('Save error:', error);
      alert('Unable to save daily limit. Please try again.');
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      {/* LinkedIn Connection Card (when not connected) */}
      {!isLinkedInConnected && (
        <ConnectLinkedInCard
          onConnect={handleConnect}
          isLoading={isConnecting}
        />
      )}

      {/* LinkedIn Connected Status (when connected) */}
      {isLinkedInConnected && (
        <div className="bg-neutral-100 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-black">LinkedIn Connected</h3>
              <p className="text-sm text-neutral-600">Your account is linked and ready for outreach</p>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Link Card */}
      <CalendarLinkCard
        defaultValue={calendarLink || ''}
        onSave={handleSaveCalendarLink}
      />

      {/* Rate Limiting Card */}
      <RateLimitingCard
        defaultValue={dailyLimit}
        onSave={handleSaveDailyLimit}
      />
    </div>
  );
}
