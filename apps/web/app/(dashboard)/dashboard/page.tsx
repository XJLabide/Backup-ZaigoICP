import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Header } from '@/components/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardActions } from '@/components/dashboard-actions';
import { getStatsForUser } from '@/lib/db/queries/stats';

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // Fetch stats directly from database query function
  const stats = await getStatsForUser(userId);

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">New Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.leadsToday}</div>
              <p className="text-xs text-gray-500">Profile viewers today</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Pending Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingActions}</div>
              <p className="text-xs text-gray-500">Awaiting approval</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Sent Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.sentToday}</div>
              <p className="text-xs text-gray-500">of 25 daily limit</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.acceptanceRate}%</div>
              <p className="text-xs text-gray-500">Last 30 days</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>LinkedIn Account</CardTitle>
            </CardHeader>
            <CardContent>
              <DashboardActions />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
