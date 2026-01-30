/**
 * Lead Detail Component
 *
 * Displays full lead profile information and action history.
 * Features:
 * - Profile card with avatar, name, headline, company, location
 * - LinkedIn profile link
 * - Status badge with color coding
 * - Campaign assignment info
 * - Action history table with status badges
 * - Timestamps for key events
 */

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ExternalLink, Briefcase, MapPin, Users, Calendar } from 'lucide-react';

interface LeadDetailProps {
  lead: {
    id: string;
    linkedInId: string;
    profileUrl: string;
    firstName: string | null;
    lastName: string | null;
    fullName: string;
    headline: string | null;
    company: string | null;
    location: string | null;
    profileImageUrl: string | null;
    about: string | null;
    recentPost: string | null;
    mutualConnections: number | null;
    source: string;
    status: string;
    viewedAt: Date | null;
    enrichedAt: Date | null;
    connectionAcceptedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    campaignId: string | null;
  };
  campaign: {
    id: string;
    name: string;
    isActive: boolean | null;
  } | null;
  actions: Array<{
    id: string;
    type: string;
    qualityScore: number | null;
    status: string;
    approvedAt: Date | null;
    rejectedAt: Date | null;
    sentAt: Date | null;
    error: string | null;
    createdAt: Date;
    campaignName: string;
  }>;
}

/**
 * Get status badge color based on lead status
 */
function getLeadStatusColor(status: string): string {
  const colors: Record<string, string> = {
    new: 'bg-blue-500/20 text-blue-400',
    qualified: 'bg-green-500/20 text-green-400',
    messaged: 'bg-purple-500/20 text-purple-400',
    connected: 'bg-emerald-500/20 text-emerald-400',
    replied: 'bg-yellow-500/20 text-yellow-400',
    skipped: 'bg-gray-500/20 text-gray-400',
  };
  return colors[status] || 'bg-gray-500/20 text-gray-400';
}

/**
 * Get action status badge color
 */
function getActionStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    approved: 'bg-blue-500/20 text-blue-400',
    rejected: 'bg-red-500/20 text-red-400',
    sent: 'bg-green-500/20 text-green-400',
    failed: 'bg-red-500/20 text-red-400',
  };
  return colors[status] || 'bg-gray-500/20 text-gray-400';
}

/**
 * Format date for display
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
 * Format date with time
 */
function formatDateTime(date: Date | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Get initials from a name
 */
function getInitials(name: string): string {
  if (!name) return '??';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Validate and sanitize a URL to only allow safe protocols (https/http)
 * Returns null if the URL is invalid or uses an unsafe protocol
 */
function getSafeLinkedInUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    // Only allow http/https protocols
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }
    // Optionally restrict to linkedin.com domain
    if (!parsed.hostname.endsWith('linkedin.com')) {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Format action type for display (replace all underscores with spaces)
 */
function formatActionType(type: string): string {
  return type.replaceAll('_', ' ');
}

export function LeadDetail({ lead, campaign, actions }: LeadDetailProps) {
  const safeProfileUrl = getSafeLinkedInUrl(lead.profileUrl);

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                {lead.profileImageUrl && (
                  <AvatarImage src={lead.profileImageUrl} alt={lead.fullName} />
                )}
                <AvatarFallback className="text-lg">
                  {getInitials(lead.fullName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-xl text-white">{lead.fullName}</CardTitle>
                {lead.headline && (
                  <p className="text-gray-400 mt-1">{lead.headline}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium capitalize ${getLeadStatusColor(lead.status)}`}
              >
                {lead.status}
              </span>
              {safeProfileUrl ? (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={safeProfileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    LinkedIn
                  </a>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Invalid URL
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Company */}
            {lead.company && (
              <div className="flex items-center gap-2 text-gray-400">
                <Briefcase className="h-4 w-4" />
                <span>{lead.company}</span>
              </div>
            )}

            {/* Location */}
            {lead.location && (
              <div className="flex items-center gap-2 text-gray-400">
                <MapPin className="h-4 w-4" />
                <span>{lead.location}</span>
              </div>
            )}

            {/* Mutual Connections */}
            {lead.mutualConnections !== null && (
              <div className="flex items-center gap-2 text-gray-400">
                <Users className="h-4 w-4" />
                <span>{lead.mutualConnections} mutual connections</span>
              </div>
            )}

            {/* Viewed At */}
            {lead.viewedAt && (
              <div className="flex items-center gap-2 text-gray-400">
                <Calendar className="h-4 w-4" />
                <span>Viewed {formatDate(lead.viewedAt)}</span>
              </div>
            )}
          </div>

          {/* About Section */}
          {lead.about && (
            <div className="mt-6 pt-4 border-t border-white/10">
              <h4 className="text-sm font-medium text-white mb-2">About</h4>
              <p className="text-gray-400 text-sm whitespace-pre-wrap">
                {lead.about}
              </p>
            </div>
          )}

          {/* Recent Post */}
          {lead.recentPost && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <h4 className="text-sm font-medium text-white mb-2">
                Recent Post
              </h4>
              <p className="text-gray-400 text-sm whitespace-pre-wrap">
                {lead.recentPost}
              </p>
            </div>
          )}

          {/* LinkedIn Info (for reference) */}
          <div className="mt-4 pt-4 border-t border-white/10 text-xs text-gray-500 space-y-1">
            <p>LinkedIn ID: {lead.linkedInId}</p>
            <p>
              Profile URL:{' '}
              {safeProfileUrl ? (
                <a
                  href={safeProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#d4a84b] hover:underline"
                >
                  {lead.profileUrl}
                </a>
              ) : (
                <span className="text-red-400">{lead.profileUrl} (invalid)</span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Assignment Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Campaign Assignment</CardTitle>
        </CardHeader>
        <CardContent>
          {campaign ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-white">{campaign.name}</div>
                <div className="text-sm">
                  {campaign.isActive ? (
                    <span className="text-green-400">Active</span>
                  ) : (
                    <span className="text-gray-400">Paused</span>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/campaigns/${campaign.id}`}>
                  View Campaign
                </Link>
              </Button>
            </div>
          ) : (
            <div className="text-gray-400">
              <p>This prospect is not assigned to any campaign.</p>
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <Link href="/dashboard/campaigns">
                  Assign to Campaign
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action History Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Action History</CardTitle>
        </CardHeader>
        <CardContent>
          {actions.length === 0 ? (
            <p className="text-gray-400">
              No actions have been taken for this prospect yet.
            </p>
          ) : (
            <div className="rounded-md border border-white/10">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Sent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actions.map((action) => (
                    <TableRow key={action.id}>
                      <TableCell className="font-medium capitalize">
                        {formatActionType(action.type)}
                      </TableCell>
                      <TableCell>{action.campaignName}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getActionStatusColor(action.status)}`}
                        >
                          {action.status}
                        </span>
                        {action.error && (
                          <div className="text-xs text-red-600 mt-1">
                            {action.error}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {action.qualityScore !== null ? (
                          <span
                            className={`text-sm font-medium ${
                              action.qualityScore >= 80
                                ? 'text-green-400'
                                : action.qualityScore >= 60
                                  ? 'text-yellow-400'
                                  : 'text-red-400'
                            }`}
                          >
                            {action.qualityScore}
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-400 text-sm">
                        {formatDateTime(action.createdAt)}
                      </TableCell>
                      <TableCell className="text-gray-400 text-sm">
                        {formatDateTime(action.sentAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connection Status */}
      {lead.connectionAcceptedAt && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="text-green-400">Connected</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400">
              Connection accepted on {formatDateTime(lead.connectionAcceptedAt)}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Timestamps */}
      <div className="text-sm text-gray-400 space-y-1">
        <p>Created: {formatDateTime(lead.createdAt)}</p>
        <p>Last updated: {formatDateTime(lead.updatedAt)}</p>
        {lead.enrichedAt && <p>Enriched: {formatDateTime(lead.enrichedAt)}</p>}
      </div>
    </div>
  );
}
