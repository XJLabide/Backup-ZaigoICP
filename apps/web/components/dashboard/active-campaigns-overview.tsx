import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getActiveCampaigns } from '@/lib/db/queries/dashboard';

interface Campaign {
  id: string;
  name: string;
  totalLeads: number | null;
  totalSent: number | null;
  totalAccepted: number | null;
}

function CampaignItem({ campaign }: { campaign: Campaign }) {
  return (
    <Link
      href={`/dashboard/campaigns/${campaign.id}`}
      className="block p-3 bg-[#1a1d29] border border-white/10 rounded-lg hover:border-[#d4a84b]/50 transition-colors"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-sm text-white">{campaign.name}</span>
        <span className="bg-[#d4a84b] text-[#1a1d29] text-xs px-2 py-0.5 rounded font-medium">
          Active
        </span>
      </div>
      <p className="text-xs text-gray-400">
        {campaign.totalLeads ?? 0} prospects · {campaign.totalSent ?? 0} sent ·{' '}
        {campaign.totalAccepted ?? 0} accepted
      </p>
    </Link>
  );
}

export async function ActiveCampaignsOverview({
  userId,
}: {
  userId: string;
}) {
  const campaigns = await getActiveCampaigns(userId);

  return (
    <div className="bg-[#242836] border border-white/10 rounded-lg p-6">
      {/* Header with View All link */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Active Campaigns</h3>
        <Link
          href="/dashboard/campaigns"
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-[#d4a84b] transition-colors"
        >
          View All <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Campaigns list or empty state */}
      {campaigns.length === 0 ? (
        <div className="text-center py-6 text-gray-400">
          <p>No active campaigns</p>
          <Link
            href="/dashboard/campaigns/new"
            className="text-sm text-[#d4a84b] hover:underline mt-2 inline-block"
          >
            Create your first campaign
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <CampaignItem key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}
    </div>
  );
}
