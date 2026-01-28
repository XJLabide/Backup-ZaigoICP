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
    message: string;
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
 * Get action status badge color
 */
function getActionStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    rejected: 'bg-red-100 text-red-800',
    sent: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
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
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function LeadDetail({ lead, campaign, actions }: LeadDetailProps) {
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
                <CardTitle className="text-xl">{lead.fullName}</CardTitle>
                {lead.headline && (
                  <p className="text-gray-600 mt-1">{lead.headline}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium capitalize ${getLeadStatusColor(lead.status)}`}
              >
                {lead.status}
              </span>
              <a
                href={lead.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  LinkedIn
                </Button>
              </a>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Company */}
            {lead.company && (
              <div className="flex items-center gap-2 text-gray-600">
                <Briefcase className="h-4 w-4" />
                <span>{lead.company}</span>
              </div>
            )}

            {/* Location */}
            {lead.location && (
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="h-4 w-4" />
                <span>{lead.location}</span>
              </div>
            )}

            {/* Mutual Connections */}
            {lead.mutualConnections !== null && (
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="h-4 w-4" />
                <span>{lead.mutualConnections} mutual connections</span>
              </div>
            )}

            {/* Viewed At */}
            {lead.viewedAt && (
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Viewed {formatDate(lead.viewedAt)}</span>
              </div>
            )}
          </div>

          {/* About Section */}
          {lead.about && (
            <div className="mt-6 pt-4 border-t">
              <h4 className="text-sm font-medium text-gray-700 mb-2">About</h4>
              <p className="text-gray-600 text-sm whitespace-pre-wrap">
                {lead.about}
              </p>
            </div>
          )}

          {/* Recent Post */}
          {lead.recentPost && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Recent Post
              </h4>
              <p className="text-gray-600 text-sm whitespace-pre-wrap">
                {lead.recentPost}
              </p>
            </div>
          )}

          {/* LinkedIn ID (for reference) */}
          <div className="mt-4 pt-4 border-t text-xs text-gray-400">
            LinkedIn ID: {lead.linkedInId}
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
                <div className="font-medium">{campaign.name}</div>
                <div className="text-sm text-gray-500">
                  {campaign.isActive ? (
                    <span className="text-green-600">Active</span>
                  ) : (
                    <span className="text-gray-400">Paused</span>
                  )}
                </div>
              </div>
              <Link href={`/dashboard/campaigns/${campaign.id}`}>
                <Button variant="outline" size="sm">
                  View Campaign
                </Button>
              </Link>
            </div>
          ) : (
            <div className="text-gray-500">
              <p>This lead is not assigned to any campaign.</p>
              <Link href="/dashboard/campaigns">
                <Button variant="outline" size="sm" className="mt-3">
                  Assign to Campaign
                </Button>
              </Link>
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
            <p className="text-gray-500">
              No actions have been taken for this lead yet.
            </p>
          ) : (
            <div className="rounded-md border">
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
                        {action.type.replace('_', ' ')}
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
                                ? 'text-green-600'
                                : action.qualityScore >= 60
                                  ? 'text-yellow-600'
                                  : 'text-red-600'
                            }`}
                          >
                            {action.qualityScore}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm">
                        {formatDateTime(action.createdAt)}
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm">
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
              <span className="text-green-600">Connected</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Connection accepted on {formatDateTime(lead.connectionAcceptedAt)}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Timestamps */}
      <div className="text-sm text-gray-500 space-y-1">
        <p>Created: {formatDateTime(lead.createdAt)}</p>
        <p>Last updated: {formatDateTime(lead.updatedAt)}</p>
        {lead.enrichedAt && <p>Enriched: {formatDateTime(lead.enrichedAt)}</p>}
      </div>
    </div>
  );
}
