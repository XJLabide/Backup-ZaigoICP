/**
 * @vitest-environment happy-dom
 */

/**
 * Component tests for LinkedInConnectionStatus
 *
 * Tests the connection status component:
 * - Renders correct status indicators for each state
 * - Shows connect button when disconnected/error with onConnect
 * - Hides connect button when onConnect is not provided
 * - Calls onConnect when button is clicked
 * - Formats connection timestamps correctly
 * - Has proper accessibility attributes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  LinkedInConnectionStatus,
  ConnectionStatus,
} from '@/components/linkedin-connection-status';

describe('LinkedInConnectionStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Status states', () => {
    it('renders idle state correctly', () => {
      const status: ConnectionStatus = { state: 'idle' };
      render(<LinkedInConnectionStatus status={status} />);

      expect(screen.getByText('Checking...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders connecting state correctly', () => {
      const status: ConnectionStatus = { state: 'connecting' };
      render(<LinkedInConnectionStatus status={status} />);

      expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });

    it('renders connected state correctly', () => {
      const status: ConnectionStatus = {
        state: 'connected',
        connectedAt: new Date('2024-01-15T11:30:00Z').toISOString(),
      };
      render(<LinkedInConnectionStatus status={status} />);

      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    it('renders disconnected state correctly', () => {
      const status: ConnectionStatus = { state: 'disconnected' };
      render(<LinkedInConnectionStatus status={status} />);

      expect(screen.getByText('Not connected')).toBeInTheDocument();
    });

    it('renders error state with message', () => {
      const status: ConnectionStatus = { state: 'error', message: 'Connection failed' };
      render(<LinkedInConnectionStatus status={status} />);

      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText(/Connection failed/)).toBeInTheDocument();
    });
  });

  describe('Connect button', () => {
    it('shows connect button when disconnected and onConnect is provided', () => {
      const onConnect = vi.fn();
      const status: ConnectionStatus = { state: 'disconnected' };
      render(<LinkedInConnectionStatus status={status} onConnect={onConnect} />);

      const button = screen.getByRole('button', { name: /connect linkedin/i });
      expect(button).toBeInTheDocument();
    });

    it('shows connect button when error and onConnect is provided', () => {
      const onConnect = vi.fn();
      const status: ConnectionStatus = { state: 'error', message: 'Failed' };
      render(<LinkedInConnectionStatus status={status} onConnect={onConnect} />);

      const button = screen.getByRole('button', { name: /connect linkedin/i });
      expect(button).toBeInTheDocument();
    });

    it('hides connect button when onConnect is not provided', () => {
      const status: ConnectionStatus = { state: 'disconnected' };
      render(<LinkedInConnectionStatus status={status} />);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('hides connect button when connected', () => {
      const onConnect = vi.fn();
      const status: ConnectionStatus = {
        state: 'connected',
        connectedAt: new Date().toISOString(),
      };
      render(<LinkedInConnectionStatus status={status} onConnect={onConnect} />);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('hides connect button when connecting', () => {
      const onConnect = vi.fn();
      const status: ConnectionStatus = { state: 'connecting' };
      render(<LinkedInConnectionStatus status={status} onConnect={onConnect} />);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('calls onConnect when button is clicked', () => {
      const onConnect = vi.fn();
      const status: ConnectionStatus = { state: 'disconnected' };
      render(<LinkedInConnectionStatus status={status} onConnect={onConnect} />);

      const button = screen.getByRole('button', { name: /connect linkedin/i });
      fireEvent.click(button);

      expect(onConnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Timestamp formatting', () => {
    it('shows relative time for recent connections (minutes)', async () => {
      // Connected 30 minutes ago
      const status: ConnectionStatus = {
        state: 'connected',
        connectedAt: new Date('2024-01-15T11:30:00Z').toISOString(),
      };

      const { rerender } = render(<LinkedInConnectionStatus status={status} />);

      // Trigger the useEffect for isMounted
      vi.runAllTimers();
      rerender(<LinkedInConnectionStatus status={status} />);

      // Check for the "30m ago" text
      expect(screen.getByText(/30m ago/)).toBeInTheDocument();
    });

    it('shows relative time for connections hours ago', async () => {
      // Connected 3 hours ago
      const status: ConnectionStatus = {
        state: 'connected',
        connectedAt: new Date('2024-01-15T09:00:00Z').toISOString(),
      };

      const { rerender } = render(<LinkedInConnectionStatus status={status} />);

      vi.runAllTimers();
      rerender(<LinkedInConnectionStatus status={status} />);

      expect(screen.getByText(/3h ago/)).toBeInTheDocument();
    });

    it('shows relative time for connections days ago', async () => {
      // Connected 2 days ago
      const status: ConnectionStatus = {
        state: 'connected',
        connectedAt: new Date('2024-01-13T12:00:00Z').toISOString(),
      };

      const { rerender } = render(<LinkedInConnectionStatus status={status} />);

      vi.runAllTimers();
      rerender(<LinkedInConnectionStatus status={status} />);

      expect(screen.getByText(/2d ago/)).toBeInTheDocument();
    });

    it('handles invalid date gracefully', () => {
      const status: ConnectionStatus = {
        state: 'connected',
        connectedAt: 'invalid-date',
      };

      // Should not throw
      expect(() => render(<LinkedInConnectionStatus status={status} />)).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('has role="status" for screen readers', () => {
      const status: ConnectionStatus = { state: 'connected', connectedAt: new Date().toISOString() };
      render(<LinkedInConnectionStatus status={status} />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('has aria-live="polite" for status updates', () => {
      const status: ConnectionStatus = { state: 'connecting' };
      render(<LinkedInConnectionStatus status={status} />);

      const statusElement = screen.getByRole('status');
      expect(statusElement).toHaveAttribute('aria-live', 'polite');
    });

    it('connect button has aria-label', () => {
      const onConnect = vi.fn();
      const status: ConnectionStatus = { state: 'disconnected' };
      render(<LinkedInConnectionStatus status={status} onConnect={onConnect} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Connect LinkedIn account');
    });
  });

  describe('Custom className', () => {
    it('applies custom className to container', () => {
      const status: ConnectionStatus = { state: 'idle' };
      render(<LinkedInConnectionStatus status={status} className="custom-class" />);

      const container = screen.getByRole('status');
      expect(container).toHaveClass('custom-class');
    });
  });
});
