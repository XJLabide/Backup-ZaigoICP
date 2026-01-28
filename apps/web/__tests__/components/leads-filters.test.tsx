/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LeadsFilters } from '@/app/(dashboard)/dashboard/leads/leads-filters';

// Mock next/navigation
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => mockSearchParams,
}));

describe('LeadsFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.delete('status');
    mockSearchParams.delete('source');
    mockSearchParams.delete('cursor');
  });

  describe('Rendering', () => {
    it('renders status filter dropdown', () => {
      render(<LeadsFilters />);

      // Use getByRole combobox - there should be at least one
      const comboboxes = screen.getAllByRole('combobox');
      expect(comboboxes.length).toBe(2);
    });

    it('renders both filter dropdowns', () => {
      render(<LeadsFilters />);

      const comboboxes = screen.getAllByRole('combobox');
      expect(comboboxes).toHaveLength(2);
    });

    it('shows placeholder text in dropdowns', () => {
      render(<LeadsFilters />);

      // Check placeholder text is visible
      expect(screen.getByText('All Status')).toBeInTheDocument();
      expect(screen.getByText('All Sources')).toBeInTheDocument();
    });

    it('shows current status filter value when provided', () => {
      render(<LeadsFilters currentStatus="new" />);

      // Should show "New" somewhere in the component
      expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('shows current source filter value when provided', () => {
      render(<LeadsFilters currentSource="profile_viewer" />);

      // Should show "Profile Viewer" somewhere in the component
      expect(screen.getByText('Profile Viewer')).toBeInTheDocument();
    });

    it('renders with both filters set', () => {
      render(<LeadsFilters currentStatus="qualified" currentSource="profile_viewer" />);

      expect(screen.getByText('Qualified')).toBeInTheDocument();
      expect(screen.getByText('Profile Viewer')).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('renders filter container with gap styling', () => {
      const { container } = render(<LeadsFilters />);

      // Check for flex container with gap
      const flexContainer = container.querySelector('.flex.items-center.gap-3');
      expect(flexContainer).toBeInTheDocument();
    });

    it('status trigger has correct width class', () => {
      render(<LeadsFilters />);

      // Check for width class on triggers
      const triggers = screen.getAllByRole('combobox');
      expect(triggers[0]).toHaveClass('w-[150px]');
      expect(triggers[1]).toHaveClass('w-[160px]');
    });
  });
});
