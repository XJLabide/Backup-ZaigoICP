export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { db, campaigns } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DeleteCampaignDialog } from '@/components/delete-campaign-dialog';

interface CampaignDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignDetailPage({
  params,
}: CampaignDetailPageProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const { id } = await params;

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)));

  if (!campaign) {
    notFound();
  }

  const toneLabels: Record<string, string> = {
    professional: 'Professional',
    friendly: 'Friendly',
    direct: 'Direct',
  };

  const ctaLabels: Record<string, string> = {
    book_call: 'Book a Call',
    reply: 'Reply',
    visit_site: 'Visit Site',
  };

  return (
    <div>
      <Header title={campaign.name} />
      <div className="p-6">
        {/* Action buttons */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/dashboard/campaigns">
            <Button variant="ghost">&larr; Back to Campaigns</Button>
          </Link>
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/messages?campaignId=${campaign.id}`}>
              <Button variant="outline">View Messages</Button>
            </Link>
            <Link href={`/dashboard/campaigns/${campaign.id}/edit`}>
              <Button variant="outline">Edit</Button>
            </Link>
            <DeleteCampaignDialog
              campaignId={campaign.id}
              campaignName={campaign.name}
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Campaign Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Campaign Settings</span>
                <span
                  className={`text-sm px-2 py-1 rounded-full ${
                    campaign.isActive
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}
                >
                  {campaign.isActive ? 'Active' : 'Paused'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-gray-400">Name</div>
                <div className="font-medium text-white">{campaign.name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Message Tone</div>
                <div className="font-medium text-white">
                  {toneLabels[campaign.tone] || campaign.tone}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Call to Action</div>
                <div className="font-medium text-white">
                  {ctaLabels[campaign.cta] || campaign.cta}
                </div>
              </div>
              {campaign.calendarLink && (
                <div>
                  <div className="text-sm text-gray-400">Calendar Link</div>
                  <a
                    href={campaign.calendarLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#d4a84b] hover:underline font-medium"
                  >
                    {campaign.calendarLink}
                  </a>
                </div>
              )}
              <div>
                <div className="text-sm text-gray-400">Auto-approve</div>
                <div className="font-medium">
                  {campaign.autoApprove ? (
                    <span className="text-[#d4a84b]">Enabled</span>
                  ) : (
                    <span className="text-gray-400">Disabled</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle>Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center p-4 bg-[#1a1d29] border border-white/10 rounded-lg">
                  <div className="text-3xl font-bold text-white">
                    {campaign.totalLeads ?? 0}
                  </div>
                  <div className="text-sm text-gray-400">Total Prospects</div>
                </div>
                <div className="text-center p-4 bg-[#1a1d29] border border-white/10 rounded-lg">
                  <div className="text-3xl font-bold text-white">
                    {campaign.totalSent ?? 0}
                  </div>
                  <div className="text-sm text-gray-400">Messages Sent</div>
                </div>
                <div className="text-center p-4 bg-[#1a1d29] border border-white/10 rounded-lg">
                  <div className="text-3xl font-bold text-white">
                    {campaign.totalAccepted ?? 0}
                  </div>
                  <div className="text-sm text-gray-400">Accepted</div>
                </div>
                <div className="text-center p-4 bg-[#1a1d29] border border-white/10 rounded-lg">
                  <div className="text-3xl font-bold text-white">
                    {campaign.totalReplied ?? 0}
                  </div>
                  <div className="text-sm text-gray-400">Replied</div>
                </div>
              </div>

              {/* Conversion rates */}
              {(campaign.totalSent ?? 0) > 0 && (
                <div className="mt-6 pt-4 border-t border-white/10">
                  <h4 className="text-sm font-medium text-white mb-3">
                    Conversion Rates
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Acceptance Rate</span>
                      <span className="font-medium text-white">
                        {(
                          ((campaign.totalAccepted ?? 0) /
                            (campaign.totalSent ?? 1)) *
                          100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Reply Rate</span>
                      <span className="font-medium text-white">
                        {(
                          ((campaign.totalReplied ?? 0) /
                            (campaign.totalSent ?? 1)) *
                          100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Leads Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Assigned Leads</span>
              <Link href={`/dashboard/leads?campaignId=${campaign.id}`}>
                <Button variant="outline" size="sm">
                  View All Leads
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400">
              {(campaign.totalLeads ?? 0) > 0 ? (
                <>
                  This campaign has{' '}
                  <span className="font-semibold text-white">
                    {campaign.totalLeads} prospects
                  </span>{' '}
                  assigned.
                </>
              ) : (
                <>
                  No prospects assigned yet. Go to the{' '}
                  <Link
                    href="/dashboard/leads"
                    className="text-[#d4a84b] hover:underline"
                  >
                    Prospects page
                  </Link>{' '}
                  to assign prospects to this campaign.
                </>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Timestamps */}
        <div className="mt-6 text-sm text-gray-400">
          <p>
            Created: {campaign.createdAt.toLocaleDateString()} at{' '}
            {campaign.createdAt.toLocaleTimeString()}
          </p>
          <p>
            Last updated: {campaign.updatedAt.toLocaleDateString()} at{' '}
            {campaign.updatedAt.toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
}
