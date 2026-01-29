import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CampaignCardProps {
  campaign: {
    id: string;
    name: string;
    tone: string;
    cta: string;
    isActive: boolean;
    totalLeads: number;
    totalSent: number;
    totalAccepted: number;
    totalReplied: number;
    autoApprove: boolean;
  };
}

export function CampaignCard({ campaign }: CampaignCardProps) {
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
    <Link href={`/dashboard/campaigns/${campaign.id}`}>
      <Card className="transition-all hover:bg-black hover:text-white cursor-pointer group">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{campaign.name}</CardTitle>
            <span
              className={`text-xs px-2 py-1 rounded-md ${
                campaign.isActive
                  ? 'bg-black text-white group-hover:bg-white group-hover:text-black'
                  : 'bg-white text-black border border-black'
              }`}
            >
              {campaign.isActive ? 'Active' : 'Paused'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-600 group-hover:text-white/70 mt-1">
            <span>{toneLabels[campaign.tone] || campaign.tone}</span>
            <span>|</span>
            <span>{ctaLabels[campaign.cta] || campaign.cta}</span>
            {campaign.autoApprove && (
              <>
                <span>|</span>
                <span className="underline">Auto-approve</span>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{campaign.totalLeads}</div>
              <div className="text-xs text-neutral-600 group-hover:text-white/70">Leads</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{campaign.totalSent}</div>
              <div className="text-xs text-neutral-600 group-hover:text-white/70">Sent</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{campaign.totalAccepted}</div>
              <div className="text-xs text-neutral-600 group-hover:text-white/70">Accepted</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{campaign.totalReplied}</div>
              <div className="text-xs text-neutral-600 group-hover:text-white/70">Replied</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
