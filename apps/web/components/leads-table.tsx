'use client';

/**
 * Leads Table Component
 *
 * Displays leads in a sortable, clickable table format.
 * Supports client-side sorting by columns.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

interface Lead {
  id: string;
  fullName: string;
  firstName: string | null;
  headline: string | null;
  company: string | null;
  location: string | null;
  profileImageUrl: string | null;
  status: string;
  source: string;
  viewedAt: Date | null;
  createdAt: Date;
}

interface LeadsTableProps {
  leads: Lead[];
  nextCursor: string | null;
}

type SortField = 'fullName' | 'company' | 'status' | 'viewedAt' | 'createdAt';
type SortDirection = 'asc' | 'desc';

/**
 * Format a date for display
 */
function formatDate(date: Date | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Get status badge color
 */
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    new: 'bg-blue-100 text-blue-800',
    qualified: 'bg-green-100 text-green-800',
    messaged: 'bg-purple-100 text-purple-800',
    connected: 'bg-emerald-100 text-emerald-800',
    replied: 'bg-yellow-100 text-yellow-800',
    skipped: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Get initials from a name
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function LeadsTable({ leads, nextCursor }: LeadsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  /**
   * Handle column header click for sorting
   */
  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }

  /**
   * Get sort icon for column header
   */
  function getSortIcon(field: SortField) {
    if (sortField !== field) {
      return <ChevronsUpDown className="ml-2 h-4 w-4" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="ml-2 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-2 h-4 w-4" />
    );
  }

  /**
   * Sort leads client-side
   */
  const sortedLeads = [...leads].sort((a, b) => {
    let aValue: string | number | Date = '';
    let bValue: string | number | Date = '';

    switch (sortField) {
      case 'fullName':
        aValue = a.fullName.toLowerCase();
        bValue = b.fullName.toLowerCase();
        break;
      case 'company':
        aValue = (a.company || '').toLowerCase();
        bValue = (b.company || '').toLowerCase();
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'viewedAt':
        aValue = a.viewedAt ? new Date(a.viewedAt).getTime() : 0;
        bValue = b.viewedAt ? new Date(b.viewedAt).getTime() : 0;
        break;
      case 'createdAt':
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  /**
   * Load more leads using cursor pagination
   */
  async function handleLoadMore() {
    if (!nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set('cursor', nextCursor);
    router.push(`/dashboard/leads?${params.toString()}`);
    setIsLoadingMore(false);
  }

  return (
    <div className="rounded-md border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">
              <button
                className="flex items-center hover:text-gray-900"
                onClick={() => handleSort('fullName')}
              >
                Lead
                {getSortIcon('fullName')}
              </button>
            </TableHead>
            <TableHead>
              <button
                className="flex items-center hover:text-gray-900"
                onClick={() => handleSort('company')}
              >
                Company
                {getSortIcon('company')}
              </button>
            </TableHead>
            <TableHead>
              <button
                className="flex items-center hover:text-gray-900"
                onClick={() => handleSort('status')}
              >
                Status
                {getSortIcon('status')}
              </button>
            </TableHead>
            <TableHead>
              <button
                className="flex items-center hover:text-gray-900"
                onClick={() => handleSort('viewedAt')}
              >
                Viewed At
                {getSortIcon('viewedAt')}
              </button>
            </TableHead>
            <TableHead>
              <button
                className="flex items-center hover:text-gray-900"
                onClick={() => handleSort('createdAt')}
              >
                Added
                {getSortIcon('createdAt')}
              </button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedLeads.map((lead) => (
            <TableRow key={lead.id} className="cursor-pointer">
              <TableCell>
                <Link
                  href={`/dashboard/leads/${lead.id}`}
                  className="flex items-center gap-3"
                >
                  <Avatar className="h-10 w-10">
                    {lead.profileImageUrl && (
                      <AvatarImage src={lead.profileImageUrl} alt={lead.fullName} />
                    )}
                    <AvatarFallback>{getInitials(lead.fullName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{lead.fullName}</div>
                    {lead.headline && (
                      <div className="text-sm text-gray-500 line-clamp-1">
                        {lead.headline}
                      </div>
                    )}
                  </div>
                </Link>
              </TableCell>
              <TableCell>
                <span className="text-gray-700">{lead.company || '-'}</span>
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${getStatusColor(lead.status)}`}
                >
                  {lead.status}
                </span>
              </TableCell>
              <TableCell className="text-gray-600">
                {formatDate(lead.viewedAt)}
              </TableCell>
              <TableCell className="text-gray-600">
                {formatDate(lead.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Load More Button */}
      {nextCursor && (
        <div className="flex justify-center border-t p-4">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}
    </div>
  );
}
