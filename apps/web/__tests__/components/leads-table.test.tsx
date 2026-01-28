/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeadsTable } from '@/components/leads-table';

// Mock next/navigation
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('LeadsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockLeads = [
    {
      id: 'lead-1',
      fullName: 'John Doe',
      firstName: 'John',
      headline: 'Software Engineer at Tech Co',
      company: 'Tech Co',
      location: 'San Francisco, CA',
      profileImageUrl: 'https://example.com/avatar.jpg',
      status: 'new',
      source: 'profile_viewer',
      viewedAt: new Date('2026-01-15'),
      createdAt: new Date('2026-01-15'),
    },
    {
      id: 'lead-2',
      fullName: 'Jane Smith',
      firstName: 'Jane',
      headline: 'Product Manager',
      company: 'Startup Inc',
      location: 'New York, NY',
      profileImageUrl: null,
      status: 'qualified',
      source: 'profile_viewer',
      viewedAt: new Date('2026-01-14'),
      createdAt: new Date('2026-01-14'),
    },
    {
      id: 'lead-3',
      fullName: 'Bob Wilson',
      firstName: 'Bob',
      headline: null,
      company: null,
      location: null,
      profileImageUrl: null,
      status: 'messaged',
      source: 'profile_viewer',
      viewedAt: null,
      createdAt: new Date('2026-01-13'),
    },
  ];

  describe('Rendering', () => {
    it('renders table with leads data', () => {
      render(<LeadsTable leads={mockLeads} nextCursor={null} />);

      // Check that lead names are displayed
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    });

    it('renders headlines when available', () => {
      render(<LeadsTable leads={mockLeads} nextCursor={null} />);

      expect(screen.getByText('Software Engineer at Tech Co')).toBeInTheDocument();
      expect(screen.getByText('Product Manager')).toBeInTheDocument();
    });

    it('renders companies when available', () => {
      render(<LeadsTable leads={mockLeads} nextCursor={null} />);

      expect(screen.getByText('Tech Co')).toBeInTheDocument();
      expect(screen.getByText('Startup Inc')).toBeInTheDocument();
    });

    it('renders dash for missing company', () => {
      render(<LeadsTable leads={mockLeads} nextCursor={null} />);

      // Bob Wilson has no company, should show dash
      const cells = screen.getAllByRole('cell');
      const dashes = cells.filter((cell) => cell.textContent === '-');
      expect(dashes.length).toBeGreaterThan(0);
    });

    it('renders status badges with correct styling', () => {
      render(<LeadsTable leads={mockLeads} nextCursor={null} />);

      expect(screen.getByText('new')).toHaveClass('bg-blue-100');
      expect(screen.getByText('qualified')).toHaveClass('bg-green-100');
      expect(screen.getByText('messaged')).toHaveClass('bg-purple-100');
    });

    it('renders initials in avatar fallback', () => {
      render(<LeadsTable leads={mockLeads} nextCursor={null} />);

      // Jane Smith has no profile image, should show initials
      expect(screen.getByText('JS')).toBeInTheDocument();
      // Bob Wilson
      expect(screen.getByText('BW')).toBeInTheDocument();
    });

    it('renders links to lead detail pages', () => {
      render(<LeadsTable leads={mockLeads} nextCursor={null} />);

      const links = screen.getAllByRole('link');
      expect(links[0]).toHaveAttribute('href', '/dashboard/leads/lead-1');
      expect(links[1]).toHaveAttribute('href', '/dashboard/leads/lead-2');
      expect(links[2]).toHaveAttribute('href', '/dashboard/leads/lead-3');
    });
  });

  describe('Sorting', () => {
    it('renders sortable column headers', () => {
      render(<LeadsTable leads={mockLeads} nextCursor={null} />);

      expect(screen.getByRole('button', { name: /lead/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /company/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /status/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /viewed at/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /added/i })).toBeInTheDocument();
    });

    it('sorts by name when column header is clicked', async () => {
      const user = userEvent.setup();
      render(<LeadsTable leads={mockLeads} nextCursor={null} />);

      const nameHeader = screen.getByRole('button', { name: /lead/i });
      await user.click(nameHeader);

      // After click, should sort ascending by name
      const rows = screen.getAllByRole('row');
      // First row is header, skip it
      expect(rows[1]).toHaveTextContent('Bob Wilson');
    });

    it('toggles sort direction on repeated clicks', async () => {
      const user = userEvent.setup();
      render(<LeadsTable leads={mockLeads} nextCursor={null} />);

      const nameHeader = screen.getByRole('button', { name: /lead/i });

      // First click: sort ascending
      await user.click(nameHeader);
      let rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveTextContent('Bob Wilson'); // B comes first

      // Second click: sort descending
      await user.click(nameHeader);
      rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveTextContent('John Doe'); // J comes first in desc
    });
  });

  describe('Pagination', () => {
    it('shows Load More button when nextCursor is provided', () => {
      render(<LeadsTable leads={mockLeads} nextCursor="abc123" />);

      expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument();
    });

    it('does not show Load More button when nextCursor is null', () => {
      render(<LeadsTable leads={mockLeads} nextCursor={null} />);

      expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
    });

    it('navigates to cursor URL when Load More is clicked', async () => {
      const user = userEvent.setup();
      render(<LeadsTable leads={mockLeads} nextCursor="abc123" />);

      const loadMoreButton = screen.getByRole('button', { name: /load more/i });
      await user.click(loadMoreButton);

      expect(mockPush).toHaveBeenCalledWith('/dashboard/leads?cursor=abc123');
    });
  });

  describe('Empty states', () => {
    it('renders empty table body when no leads', () => {
      render(<LeadsTable leads={[]} nextCursor={null} />);

      // There are two rowgroups: thead and tbody
      // Get all rowgroups and check the tbody (second one)
      const rowgroups = screen.getAllByRole('rowgroup');
      const tbody = rowgroups[1]; // tbody is the second rowgroup
      expect(tbody.children.length).toBe(0);
    });
  });
});
