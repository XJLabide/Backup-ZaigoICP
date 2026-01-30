export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db, campaigns } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import { Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CampaignCard } from '@/components/campaign-card';

export default async function CampaignsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const userCampaigns = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.userId, userId))
    .orderBy(desc(campaigns.createdAt));

  return (
    <div className="p-6 space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Campaigns</h1>
          <p className="text-gray-400 mt-1">Manage your outreach campaigns and message templates</p>
        </div>
        <Link href="/dashboard/campaigns/new">
          <Button>New Campaign</Button>
        </Link>
      </div>

      {userCampaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-16 w-16 text-gray-500 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No campaigns yet</h3>
            <p className="text-gray-400 text-center max-w-md mb-4">
              No campaigns running yet. Let's get you in front of more prospects.
            </p>
            <Link href="/dashboard/campaigns/new">
              <Button>Create Your First Campaign</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {userCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={{
                id: campaign.id,
                name: campaign.name,
                tone: campaign.tone,
                cta: campaign.cta,
                isActive: campaign.isActive ?? true,
                totalLeads: campaign.totalLeads ?? 0,
                totalSent: campaign.totalSent ?? 0,
                totalAccepted: campaign.totalAccepted ?? 0,
                totalReplied: campaign.totalReplied ?? 0,
                autoApprove: campaign.autoApprove ?? false,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
