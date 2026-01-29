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
    <div className="bg-neutral-100 rounded-lg p-6 animate-pulse">
      <div className="h-6 w-32 bg-neutral-200 rounded mb-4" />
      <div className="space-y-3">
        <div className="h-12 bg-neutral-200 rounded" />
        <div className="h-12 bg-neutral-200 rounded" />
        <div className="h-12 bg-neutral-200 rounded" />
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
        <h1 className="text-3xl font-bold text-black">Welcome back!</h1>
        <p className="text-neutral-600 mt-1">Here's what's happening with your campaigns.</p>
      </div>

      {/* Setup Prompt (conditional) */}
      {!isLinkedInConnected && (
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-black">Complete Your Setup</p>
                <p className="text-sm text-neutral-600">Connect your LinkedIn account to get started with warm outreach.</p>
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
          title="Total Leads"
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
        <h2 className="text-lg font-bold text-black mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <QuickActionCard
            title="Create Campaign"
            description="Set up your first outreach campaign"
            href="/dashboard/campaigns/new"
            icon={Megaphone}
          />
          <QuickActionCard
            title="View Leads"
            description="See your profile viewers"
            href="/dashboard/leads"
            icon={UsersIcon}
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-bold text-black mb-4">Recent Activity</h2>
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
