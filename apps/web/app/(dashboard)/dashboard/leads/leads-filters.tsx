'use client';

/**
 * Leads Filters Component
 *
 * Client component for filtering leads by status and source.
 * Uses URL search params for persistence and sharing.
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface LeadsFiltersProps {
  currentStatus?: string;
  currentSource?: string;
  currentSearch?: string;
}

export function LeadsFilters({
  currentStatus,
  currentSource,
  currentSearch,
}: LeadsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Search input state for debouncing
  const [searchValue, setSearchValue] = useState(currentSearch || '');

  // Debounced search - updates URL after 300ms of no typing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== (currentSearch || '')) {
        updateFilters('search', searchValue || undefined);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue]);

  // Sync local state when URL changes externally
  useEffect(() => {
    setSearchValue(currentSearch || '');
  }, [currentSearch]);

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
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
        <Input
          type="search"
          placeholder="Search prospects..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-9 w-[220px]"
        />
      </div>

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
