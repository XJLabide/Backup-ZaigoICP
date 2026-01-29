import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getRecentLeads, type RecentLead } from '@/lib/db/queries/dashboard';

function getStatusBadgeColors(status: string) {
  const colors: Record<string, string> = {
    new: 'bg-blue-100 text-blue-800',
    qualified: 'bg-green-100 text-green-800',
    messaged: 'bg-purple-100 text-purple-800',
    connected: 'bg-emerald-100 text-emerald-800',
    replied: 'bg-amber-100 text-amber-800',
    skipped: 'bg-neutral-100 text-neutral-800',
  };
  return colors[status] || 'bg-neutral-100 text-neutral-800';
}

function getInitials(name: string | null) {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function LeadItem({ lead }: { lead: RecentLead }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar className="h-8 w-8">
          <AvatarImage src={lead.profileImageUrl || undefined} alt={lead.fullName || ''} />
          <AvatarFallback className="bg-black text-white text-xs">
            {getInitials(lead.fullName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-black">{lead.fullName || 'Unknown'}</p>
          <p className="text-xs text-neutral-500 truncate max-w-[180px]">
            {lead.headline || 'No headline'}
          </p>
        </div>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded capitalize ${getStatusBadgeColors(lead.status)}`}>
        {lead.status}
      </span>
    </div>
  );
}

export async function RecentLeadsPreview({ userId }: { userId: string }) {
  const leads = await getRecentLeads(userId);

  return (
    <div className="bg-neutral-100 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-black">Recent Leads</h3>
        <Link
          href="/dashboard/leads"
          className="flex items-center gap-1 text-sm text-neutral-600 hover:text-black transition-colors"
        >
          View All <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {leads.length === 0 ? (
        <div className="text-center py-6 text-neutral-500">
          <p>No leads yet</p>
          <Link
            href="/dashboard/campaigns"
            className="text-sm text-black hover:underline mt-2 inline-block"
          >
            Create a campaign to get started
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <LeadItem key={lead.id} lead={lead} />
          ))}
        </div>
      )}
    </div>
  );
}
