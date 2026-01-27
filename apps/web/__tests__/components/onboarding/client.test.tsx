/**
 * @vitest-environment jsdom
 */

/**
 * Component tests for OnboardingClient
 *
 * Tests the onboarding page client component:
 * - Renders disconnected state by default
 * - Renders connected state when initialConnected is true
 * - Calls API and redirects on connect button click
 * - Shows error state when API fails
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingClient } from '@/app/(dashboard)/onboarding/client';

// Mock window.location
const mockLocation = {
  href: '',
};

beforeEach(() => {
  Object.defineProperty(window, 'location', {
    value: mockLocation,
    writable: true,
  });
});

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('OnboardingClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.href = '';
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial render', () => {
    it('renders disconnected state when not connected', () => {
      render(
        <OnboardingClient initialConnected={false} initialConnectedAt={null} />
      );

      expect(screen.getByText('Connect Your LinkedIn')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /connect linkedin/i })).toBeInTheDocument();
      expect(screen.getByText('Not connected')).toBeInTheDocument();
    });

    it('renders connected state when already connected', () => {
      render(
        <OnboardingClient
          initialConnected={true}
          initialConnectedAt={new Date().toISOString()}
        />
      );

      expect(screen.getByText('LinkedIn Connected')).toBeInTheDocument();
      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue to dashboard/i })).toBeInTheDocument();
    });

    it('handles null connectedAt for legacy users', () => {
      render(
        <OnboardingClient initialConnected={true} initialConnectedAt={null} />
      );

      expect(screen.getByText('LinkedIn Connected')).toBeInTheDocument();
    });
  });

  describe('Connect flow', () => {
    it('calls API and redirects on successful connect', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ url: 'https://auth.unipile.com/link/abc123' }),
      });

      render(
        <OnboardingClient initialConnected={false} initialConnectedAt={null} />
      );

      const connectButton = screen.getByRole('button', { name: /connect linkedin/i });
      fireEvent.click(connectButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/unipile/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      });

      await waitFor(() => {
        expect(mockLocation.href).toBe('https://auth.unipile.com/link/abc123');
      });
    });

    it('shows error state when API returns error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Rate limit exceeded' }),
      });

      render(
        <OnboardingClient initialConnected={false} initialConnectedAt={null} />
      );

      const connectButton = screen.getByRole('button', { name: /connect linkedin/i });
      fireEvent.click(connectButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      // Error is shown inside status component and alert box
      expect(screen.getByRole('alert').textContent).toMatch(/unable to start/i);
    });

    it('shows error state when API returns no URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}), // No URL
      });

      render(
        <OnboardingClient initialConnected={false} initialConnectedAt={null} />
      );

      const connectButton = screen.getByRole('button', { name: /connect linkedin/i });
      fireEvent.click(connectButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      expect(screen.getByRole('alert').textContent).toMatch(/no auth url/i);
    });

    it('shows error state when fetch throws', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(
        <OnboardingClient initialConnected={false} initialConnectedAt={null} />
      );

      const connectButton = screen.getByRole('button', { name: /connect linkedin/i });
      fireEvent.click(connectButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      expect(screen.getByRole('alert').textContent).toMatch(/network error/i);
    });
  });

  describe('Connected state', () => {
    it('redirects to dashboard when continue button is clicked', () => {
      render(
        <OnboardingClient
          initialConnected={true}
          initialConnectedAt={new Date().toISOString()}
        />
      );

      const continueButton = screen.getByRole('button', { name: /continue to dashboard/i });
      fireEvent.click(continueButton);

      expect(mockLocation.href).toBe('/dashboard');
    });
  });
});
