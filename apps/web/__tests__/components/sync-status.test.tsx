/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SyncStatus } from '@/components/sync-status';

// Mock next/navigation
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('SyncStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Set a fixed "now" time
    vi.setSystemTime(new Date('2026-01-28T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Display', () => {
    it('shows "Never synced" when lastSyncAt is null', () => {
      render(<SyncStatus lastSyncAt={null} />);

      expect(screen.getByText('Never synced')).toBeInTheDocument();
    });

    it('shows "just now" for very recent sync', () => {
      const recentDate = new Date('2026-01-28T11:59:30.000Z'); // 30 seconds ago
      render(<SyncStatus lastSyncAt={recentDate} />);

      expect(screen.getByText('Last synced just now')).toBeInTheDocument();
    });

    it('shows minutes ago for recent sync', () => {
      const fiveMinutesAgo = new Date('2026-01-28T11:55:00.000Z');
      render(<SyncStatus lastSyncAt={fiveMinutesAgo} />);

      expect(screen.getByText('Last synced 5 minutes ago')).toBeInTheDocument();
    });

    it('shows singular minute', () => {
      const oneMinuteAgo = new Date('2026-01-28T11:59:00.000Z');
      render(<SyncStatus lastSyncAt={oneMinuteAgo} />);

      expect(screen.getByText('Last synced 1 minute ago')).toBeInTheDocument();
    });

    it('shows hours ago', () => {
      const twoHoursAgo = new Date('2026-01-28T10:00:00.000Z');
      render(<SyncStatus lastSyncAt={twoHoursAgo} />);

      expect(screen.getByText('Last synced 2 hours ago')).toBeInTheDocument();
    });

    it('shows singular hour', () => {
      const oneHourAgo = new Date('2026-01-28T11:00:00.000Z');
      render(<SyncStatus lastSyncAt={oneHourAgo} />);

      expect(screen.getByText('Last synced 1 hour ago')).toBeInTheDocument();
    });

    it('shows days ago', () => {
      const threeDaysAgo = new Date('2026-01-25T12:00:00.000Z');
      render(<SyncStatus lastSyncAt={threeDaysAgo} />);

      expect(screen.getByText('Last synced 3 days ago')).toBeInTheDocument();
    });

    it('shows singular day', () => {
      const oneDayAgo = new Date('2026-01-27T12:00:00.000Z');
      render(<SyncStatus lastSyncAt={oneDayAgo} />);

      expect(screen.getByText('Last synced 1 day ago')).toBeInTheDocument();
    });

    it('renders Sync Now button', () => {
      render(<SyncStatus lastSyncAt={null} />);

      expect(screen.getByRole('button', { name: /sync now/i })).toBeInTheDocument();
    });
  });

  describe('Sync Action', () => {
    it('calls API when Sync Now is clicked', async () => {
      vi.useRealTimers(); // Use real timers for async operations
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<SyncStatus lastSyncAt={null} />);

      const syncButton = screen.getByRole('button', { name: /sync now/i });
      await user.click(syncButton);

      expect(mockFetch).toHaveBeenCalledWith('/api/sync/profile-viewers', {
        method: 'POST',
      });
    });

    it('refreshes page after successful sync', async () => {
      vi.useRealTimers();
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<SyncStatus lastSyncAt={null} />);

      const syncButton = screen.getByRole('button', { name: /sync now/i });
      await user.click(syncButton);

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('shows loading state during sync', async () => {
      vi.useRealTimers();
      const user = userEvent.setup();

      // Create a promise we can control
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(promise);

      render(<SyncStatus lastSyncAt={null} />);

      const syncButton = screen.getByRole('button', { name: /sync now/i });
      await user.click(syncButton);

      // Should show loading state
      expect(screen.getByRole('button', { name: /syncing/i })).toBeDisabled();

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: async () => ({ success: true }),
      });
    });

    it('shows error message when sync fails', async () => {
      vi.useRealTimers();
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Rate limit exceeded' }),
      });

      render(<SyncStatus lastSyncAt={null} />);

      const syncButton = screen.getByRole('button', { name: /sync now/i });
      await user.click(syncButton);

      await waitFor(() => {
        expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument();
      });
    });

    it('shows generic error for network failures', async () => {
      vi.useRealTimers();
      const user = userEvent.setup();

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<SyncStatus lastSyncAt={null} />);

      const syncButton = screen.getByRole('button', { name: /sync now/i });
      await user.click(syncButton);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });
});
