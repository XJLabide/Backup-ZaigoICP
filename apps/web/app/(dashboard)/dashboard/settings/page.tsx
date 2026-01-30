export const dynamic = 'force-dynamic';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { SettingsClient } from './settings-client';

export default async function SettingsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // Query user data from database
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  // Determine connection status and settings
  const isLinkedInConnected = !!user?.unipileAccountId;
  const calendarLink = user?.calendarLink || null;
  const dailyLimit = user?.dailyLimit || 25;

  return (
    <div className="p-6 space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">Manage your account preferences and default settings</p>
      </div>

      <SettingsClient
        isLinkedInConnected={isLinkedInConnected}
        calendarLink={calendarLink}
        dailyLimit={dailyLimit}
        timezone={user?.timezone ?? 'America/Los_Angeles'}
        notificationsNewLeads={user?.notificationsNewLeads ?? true}
        notificationsReplies={user?.notificationsReplies ?? true}
        notificationsDailyDigest={user?.notificationsDailyDigest ?? true}
        workingHoursStart={user?.workingHoursStart ?? '09:00'}
        workingHoursEnd={user?.workingHoursEnd ?? '17:00'}
        displayName={user?.displayName ?? null}
        companyName={user?.companyName ?? null}
      />
    </div>
  );
}
