'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConnectLinkedInCard } from '@/components/settings/connect-linkedin-card';
import { CalendarLinkCard } from '@/components/settings/calendar-link-card';
import { RateLimitingCard } from '@/components/settings/rate-limiting-card';
import { NotificationPreferencesCard } from '@/components/settings/notification-preferences-card';
import { WorkingHoursCard } from '@/components/settings/working-hours-card';
import { TimezoneCard } from '@/components/settings/timezone-card';
import { ProfileInfoCard } from '@/components/settings/profile-info-card';
import { DisconnectLinkedInCard } from '@/components/settings/disconnect-linkedin-card';

interface SettingsClientProps {
  isLinkedInConnected: boolean;
  calendarLink: string | null;
  dailyLimit: number;
  timezone: string;
  notificationsNewLeads: boolean;
  notificationsReplies: boolean;
  notificationsDailyDigest: boolean;
  workingHoursStart: string;
  workingHoursEnd: string;
  displayName: string | null;
  companyName: string | null;
}

export function SettingsClient({
  isLinkedInConnected,
  calendarLink,
  dailyLimit,
  timezone,
  notificationsNewLeads,
  notificationsReplies,
  notificationsDailyDigest,
  workingHoursStart,
  workingHoursEnd,
  displayName,
  companyName,
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
      toast.error('Unable to connect to LinkedIn. Please try again.');
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
      toast.error('Unable to save calendar link. Please try again.');
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
      toast.error('Unable to save daily limit. Please try again.');
    }
  };

  const handleSaveNotifications = async (prefs: { newLeads: boolean; replies: boolean; dailyDigest: boolean }) => {
    try {
      const response = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationsNewLeads: prefs.newLeads,
          notificationsReplies: prefs.replies,
          notificationsDailyDigest: prefs.dailyDigest,
        }),
      });
      if (!response.ok) throw new Error('Failed to update notifications');
      toast.success('Notification preferences saved');
      router.refresh();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Unable to save notification preferences. Please try again.');
    }
  };

  const handleSaveWorkingHours = async (start: string, end: string) => {
    try {
      const response = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workingHoursStart: start, workingHoursEnd: end }),
      });
      if (!response.ok) throw new Error('Failed to update working hours');
      toast.success('Working hours saved');
      router.refresh();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Unable to save working hours. Please try again.');
    }
  };

  const handleSaveTimezone = async (tz: string) => {
    try {
      const response = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone: tz }),
      });
      if (!response.ok) throw new Error('Failed to update timezone');
      toast.success('Timezone saved');
      router.refresh();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Unable to save timezone. Please try again.');
    }
  };

  const handleSaveProfileInfo = async (displayName: string | null, companyName: string | null) => {
    try {
      const response = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, companyName }),
      });
      if (!response.ok) throw new Error('Failed to update profile info');
      toast.success('Profile info saved');
      router.refresh();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Unable to save profile info. Please try again.');
    }
  };

  const handleDisconnect = async () => {
    try {
      const response = await fetch('/api/auth/unipile/disconnect', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to disconnect');
      toast.success('LinkedIn disconnected');
      router.refresh();
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error('Unable to disconnect LinkedIn. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* LinkedIn Connection Card (when not connected) */}
      {!isLinkedInConnected && (
        <ConnectLinkedInCard onConnect={handleConnect} isLoading={isConnecting} />
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

      {/* Profile Info Card */}
      <ProfileInfoCard
        defaultDisplayName={displayName}
        defaultCompanyName={companyName}
        onSave={handleSaveProfileInfo}
      />

      {/* Notification Preferences Card */}
      <NotificationPreferencesCard
        defaultNewLeads={notificationsNewLeads}
        defaultReplies={notificationsReplies}
        defaultDailyDigest={notificationsDailyDigest}
        onSave={handleSaveNotifications}
      />

      {/* Working Hours Card */}
      <WorkingHoursCard
        defaultStart={workingHoursStart}
        defaultEnd={workingHoursEnd}
        onSave={handleSaveWorkingHours}
      />

      {/* Timezone Card */}
      <TimezoneCard
        defaultValue={timezone}
        onSave={handleSaveTimezone}
      />

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

      {/* Disconnect LinkedIn Card (danger zone, when connected) */}
      {isLinkedInConnected && (
        <DisconnectLinkedInCard
          isConnected={isLinkedInConnected}
          onDisconnect={handleDisconnect}
        />
      )}
    </div>
  );
}
