export const dynamic = 'force-dynamic';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { getStatsForUser } from '@/lib/db/queries/stats';
import { StatCard } from '@/components/dashboard/stat-card';
import { QuickActionCard } from '@/components/dashboard/quick-action-card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowRight, Megaphone, Users as UsersIcon } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { RecentLeadsPreview } from '@/components/dashboard/recent-leads-preview';
import { ActiveCampaignsOverview } from '@/components/dashboard/active-campaigns-overview';

function WidgetSkeleton() {
  return (
    <div className="bg-[#242836] rounded-lg p-6 animate-pulse">
      <div className="h-6 w-32 bg-[#1a1d29] rounded mb-4" />
      <div className="space-y-3">
        <div className="h-12 bg-[#1a1d29] rounded" />
        <div className="h-12 bg-[#1a1d29] rounded" />
        <div className="h-12 bg-[#1a1d29] rounded" />
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // Get user and stats in parallel
  const [user, stats] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)).then(r => r[0]),
    getStatsForUser(userId)
  ]);

  const isLinkedInConnected = !!user?.unipileAccountId;

  return (
    <div className="p-6 space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Welcome back. Let's grow your book.</h1>
      </div>

      {/* Setup Prompt (conditional) */}
      {!isLinkedInConnected && (
        <div className="bg-[#242836] border border-[#d4a84b] rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#d4a84b]/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-[#d4a84b]" />
              </div>
              <div>
                <p className="font-semibold text-white">Complete Your Setup</p>
                <p className="text-sm text-[#9ca3af]">Connect your LinkedIn account to start reaching prospects automatically.</p>
              </div>
            </div>
            <Link href="/onboarding">
              <Button className="gap-2">
                Connect
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Prospects"
          value={stats.leadsToday}
          subtitle="New this week"
        />
        <StatCard
          title="Messages Sent"
          value={stats.sentToday}
          subtitle="Pending approval"
        />
        <StatCard
          title="Acceptance Rate"
          value={stats.acceptanceRate > 0 ? `${stats.acceptanceRate}%` : '—'}
          subtitle="Awaiting first campaign"
        />
        <StatCard
          title="Active Campaigns"
          value={stats.pendingActions}
          subtitle="Create your first one"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <QuickActionCard
            title="Create Campaign"
            description="Set up your first outreach campaign"
            href="/dashboard/campaigns/new"
            icon={Megaphone}
          />
          <QuickActionCard
            title="View Prospects"
            description="See your profile viewers"
            href="/dashboard/leads"
            icon={UsersIcon}
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Recent Activity</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Suspense fallback={<WidgetSkeleton />}>
            <RecentLeadsPreview userId={userId} />
          </Suspense>
          <Suspense fallback={<WidgetSkeleton />}>
            <ActiveCampaignsOverview userId={userId} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
