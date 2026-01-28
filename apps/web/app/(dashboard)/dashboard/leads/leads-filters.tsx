'use client';

/**
 * Leads Filters Component
 *
 * Client component for filtering leads by status and source.
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

interface LeadsFiltersProps {
  currentStatus?: string;
  currentSource?: string;
}

export function LeadsFilters({
  currentStatus,
  currentSource,
}: LeadsFiltersProps) {
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

    // Reset cursor when filters change
    params.delete('cursor');

    router.push(`/dashboard/leads?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-3">
      {/* Status filter */}
      <Select
        value={currentStatus || 'all'}
        onValueChange={(value) => updateFilters('status', value)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="new">New</SelectItem>
          <SelectItem value="qualified">Qualified</SelectItem>
          <SelectItem value="messaged">Messaged</SelectItem>
          <SelectItem value="connected">Connected</SelectItem>
          <SelectItem value="replied">Replied</SelectItem>
          <SelectItem value="skipped">Skipped</SelectItem>
        </SelectContent>
      </Select>

      {/* Source filter */}
      <Select
        value={currentSource || 'all'}
        onValueChange={(value) => updateFilters('source', value)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All Sources" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sources</SelectItem>
          <SelectItem value="profile_viewer">Profile Viewer</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
