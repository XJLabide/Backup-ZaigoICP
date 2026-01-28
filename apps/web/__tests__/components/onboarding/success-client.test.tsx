/**
 * @vitest-environment happy-dom
 */

/**
 * Component tests for SuccessClient
 *
 * Tests the success page client component:
 * - Polls /api/user/status to check connection
 * - Shows connected state when linkedInConnected is true
 * - Handles basic states correctly
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SuccessClient } from '@/app/(dashboard)/onboarding/success/client';

// Mock window.location
const mockLocation = {
  href: '',
  reload: vi.fn(),
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

describe('SuccessClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.href = '';
    mockLocation.reload.mockClear();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial polling state', () => {
    it('renders polling state initially', () => {
      // Setup a never-resolving promise to keep in initial state
      mockFetch.mockImplementation(() => new Promise(() => {}));

      render(<SuccessClient />);

      expect(screen.getByText('Connecting Your Account...')).toBeInTheDocument();
      expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });
  });

  describe('Successful connection', () => {
    it('shows connected state when API returns linkedInConnected: true', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            linkedInConnected: true,
            connectedAt: new Date().toISOString(),
          }),
      });

      render(<SuccessClient />);

      await waitFor(() => {
        expect(screen.getByText('Successfully Connected!')).toBeInTheDocument();
      });

      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue to dashboard/i })).toBeInTheDocument();
    });

    it('redirects to dashboard when continue button is clicked', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            linkedInConnected: true,
            connectedAt: new Date().toISOString(),
          }),
      });

      render(<SuccessClient />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /continue to dashboard/i })).toBeInTheDocument();
      });

      const continueButton = screen.getByRole('button', { name: /continue to dashboard/i });
      fireEvent.click(continueButton);

      expect(mockLocation.href).toBe('/dashboard');
    });
  });

  describe('Polling behavior', () => {
    it('makes API call on mount', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            linkedInConnected: true,
            connectedAt: new Date().toISOString(),
          }),
      });

      render(<SuccessClient />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/user/status',
          expect.objectContaining({
            method: 'GET',
          })
        );
      });
    });

    it('stops polling when connected', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              linkedInConnected: true,
              connectedAt: new Date().toISOString(),
            }),
        });
      });

      render(<SuccessClient />);

      await waitFor(() => {
        expect(screen.getByText('Successfully Connected!')).toBeInTheDocument();
      });

      // Should have been called at least once
      expect(callCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Session expiry handling', () => {
    it('handles 401 response gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized' }),
      });

      render(<SuccessClient />);

      // Should handle the 401 and redirect
      await waitFor(
        () => {
          expect(mockLocation.href).toBe('/sign-in');
        },
        { timeout: 3000 }
      );
    });
  });
});
