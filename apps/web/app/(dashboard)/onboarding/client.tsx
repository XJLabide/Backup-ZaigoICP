'use client';

/**
 * Client component for the onboarding page.
 *
 * Handles the "Connect LinkedIn" button click, API call, and redirect to Unipile.
 */

import { useState, useCallback } from 'react';
import { LinkedInConnectionStatus, ConnectionStatus } from '@/components/linkedin-connection-status';

// =============================================================================
// Styles
// =============================================================================

const containerStyles: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  backgroundColor: '#f9fafb',
};

const cardStyles: React.CSSProperties = {
  maxWidth: '480px',
  width: '100%',
  backgroundColor: 'white',
  borderRadius: '12px',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  padding: '32px',
};

const titleStyles: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 600,
  color: '#111827',
  marginBottom: '8px',
  textAlign: 'center',
};

const descriptionStyles: React.CSSProperties = {
  fontSize: '14px',
  color: '#6b7280',
  marginBottom: '24px',
  textAlign: 'center',
  lineHeight: 1.5,
};

const statusContainerStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  marginBottom: '24px',
};

const buttonStyles: React.CSSProperties = {
  width: '100%',
  padding: '12px 24px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: '#0077b5',
  color: 'white',
  fontSize: '16px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'background-color 0.2s',
};

const buttonDisabledStyles: React.CSSProperties = {
  ...buttonStyles,
  backgroundColor: '#9ca3af',
  cursor: 'not-allowed',
};

const errorMessageStyles: React.CSSProperties = {
  marginTop: '16px',
  padding: '12px',
  backgroundColor: '#fef2f2',
  borderRadius: '8px',
  color: '#b91c1c',
  fontSize: '14px',
  textAlign: 'center',
};

const connectedContainerStyles: React.CSSProperties = {
  textAlign: 'center',
};

const checkmarkStyles: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '64px',
  height: '64px',
  borderRadius: '50%',
  backgroundColor: '#f0fdf4',
  marginBottom: '16px',
};

const continueButtonStyles: React.CSSProperties = {
  ...buttonStyles,
  backgroundColor: '#22c55e',
  marginTop: '16px',
};

// =============================================================================
// Props
// =============================================================================

interface OnboardingClientProps {
  initialConnected: boolean;
  initialConnectedAt: string | null;
}

// =============================================================================
// Component
// =============================================================================

export function OnboardingClient({
  initialConnected,
  initialConnectedAt,
}: OnboardingClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build initial status from server-provided data
  const getInitialStatus = (): ConnectionStatus => {
    if (initialConnected && initialConnectedAt) {
      return { state: 'connected', connectedAt: initialConnectedAt };
    }
    return { state: 'disconnected' };
  };

  const [status, setStatus] = useState<ConnectionStatus>(getInitialStatus);

  /**
   * Handles the Connect LinkedIn button click.
   * Calls the API to generate an auth link, then redirects to Unipile.
   */
  const handleConnect = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setStatus({ state: 'connecting' });

    try {
      const response = await fetch('/api/auth/unipile/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate auth link');
      }

      const data = await response.json();

      if (!data.url) {
        throw new Error('No auth URL returned from server');
      }

      // Redirect to Unipile hosted auth
      window.location.href = data.url;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      setStatus({ state: 'error', message: errorMessage });
      setIsLoading(false);
    }
  }, []);

  // If already connected, show success state
  if (status.state === 'connected') {
    return (
      <div style={containerStyles}>
        <div style={cardStyles}>
          <div style={connectedContainerStyles}>
            <div style={checkmarkStyles}>
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#22c55e"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 style={titleStyles}>LinkedIn Connected</h1>
            <p style={descriptionStyles}>
              Your LinkedIn account is successfully connected. You can now use all features.
            </p>
            <div style={statusContainerStyles}>
              <LinkedInConnectionStatus status={status} />
            </div>
            <a href="/dashboard" style={{ textDecoration: 'none' }}>
              <button type="button" style={continueButtonStyles}>
                Continue to Dashboard
              </button>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyles}>
      <div style={cardStyles}>
        <h1 style={titleStyles}>Connect Your LinkedIn</h1>
        <p style={descriptionStyles}>
          To get started, connect your LinkedIn account. This allows us to
          access your profile viewers and send connection requests on your behalf.
        </p>

        <div style={statusContainerStyles}>
          <LinkedInConnectionStatus status={status} />
        </div>

        <button
          type="button"
          onClick={handleConnect}
          disabled={isLoading}
          style={isLoading ? buttonDisabledStyles : buttonStyles}
          aria-busy={isLoading}
        >
          {isLoading ? 'Connecting...' : 'Connect LinkedIn'}
        </button>

        {error && (
          <div style={errorMessageStyles} role="alert">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
