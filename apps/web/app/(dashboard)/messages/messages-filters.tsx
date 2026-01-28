'use client';

/**
 * Messages Filters Component
 *
 * Client component for filtering messages by campaign and status.
 * Uses URL search params for persistence and sharing.
 */

import { useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MessagesFiltersProps {
  campaigns: { id: string; name: string }[];
  currentCampaign?: string;
  currentStatus?: string;
}

export function MessagesFilters({
  campaigns,
  currentCampaign,
  currentStatus,
}: MessagesFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  /**
   * Updates URL search params with new filter values.
   */
  function updateFilters(key: string, value: string | undefined) {
    const params = new URLSearchParams(searchParams.toString());

    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    router.push(`/messages?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-3">
      {/* Campaign filter */}
      <Select
        value={currentCampaign || 'all'}
        onValueChange={(value) => updateFilters('campaign', value)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Campaigns" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Campaigns</SelectItem>
          {campaigns.map((campaign) => (
            <SelectItem key={campaign.id} value={campaign.id}>
              {campaign.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status filter */}
      <Select
        value={currentStatus || 'all'}
        onValueChange={(value) => updateFilters('status', value)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
