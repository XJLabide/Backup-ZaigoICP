'use client';

/**
 * Client component for the success page.
 *
 * Polls /api/user/status every 2 seconds to detect when the webhook
 * has been processed. Times out after 60 seconds with a friendly message.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { LinkedInConnectionStatus, ConnectionStatus } from '@/components/linkedin-connection-status';

// =============================================================================
// Constants
// =============================================================================

const POLL_INTERVAL_MS = 2000;
const TIMEOUT_MS = 60000;

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
  textAlign: 'center',
};

const spinnerContainerStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  marginBottom: '24px',
};

const spinnerStyles: React.CSSProperties = {
  width: '48px',
  height: '48px',
  border: '4px solid #e5e7eb',
  borderTopColor: '#0077b5',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite',
};

const checkmarkContainerStyles: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '64px',
  height: '64px',
  borderRadius: '50%',
  backgroundColor: '#f0fdf4',
  marginBottom: '16px',
};

const titleStyles: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 600,
  color: '#111827',
  marginBottom: '8px',
};

const descriptionStyles: React.CSSProperties = {
  fontSize: '14px',
  color: '#6b7280',
  marginBottom: '24px',
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
  backgroundColor: '#22c55e',
  color: 'white',
  fontSize: '16px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'background-color 0.2s',
};

const secondaryButtonStyles: React.CSSProperties = {
  ...buttonStyles,
  backgroundColor: '#6b7280',
  marginTop: '12px',
};

const warningBoxStyles: React.CSSProperties = {
  padding: '16px',
  backgroundColor: '#fefce8',
  borderRadius: '8px',
  marginBottom: '24px',
};

const warningTitleStyles: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: '#a16207',
  marginBottom: '4px',
};

const warningTextStyles: React.CSSProperties = {
  fontSize: '14px',
  color: '#a16207',
  lineHeight: 1.5,
};

// =============================================================================
// Types
// =============================================================================

type PageState = 'polling' | 'connected' | 'timeout';

// =============================================================================
// Component
// =============================================================================

export function SuccessClient() {
  const [pageState, setPageState] = useState<PageState>('polling');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ state: 'connecting' });
  const pollCountRef = useRef(0);
  const startTimeRef = useRef(Date.now());
  const isActiveRef = useRef(true);

  /**
   * Polls the user status API to check if the webhook has been processed.
   * Returns 'connected', 'continue', or 'expired' based on the result.
   */
  const checkStatus = useCallback(async (): Promise<'connected' | 'continue' | 'expired'> => {
    try {
      const response = await fetch('/api/user/status', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      // Handle 401 (session expired) - redirect to sign-in
      if (response.status === 401) {
        console.error('Session expired during polling');
        return 'expired';
      }

      if (!response.ok) {
        // Don't fail on other API errors during polling - keep trying
        console.error('Status check failed:', response.status);
        return 'continue';
      }

      const data = await response.json();

      if (data.linkedInConnected) {
        // Guard against state updates after unmount
        if (isActiveRef.current) {
          setConnectionStatus({
            state: 'connected',
            connectedAt: data.connectedAt || new Date().toISOString(),
          });
          setPageState('connected');
        }
        return 'connected';
      }

      return 'continue';
    } catch (error) {
      console.error('Status check error:', error);
      return 'continue';
    }
  }, []);

  /**
   * Main polling effect.
   * Polls every 2 seconds until connected or 60 second timeout.
   */
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    isActiveRef.current = true;

    const poll = async () => {
      if (!isActiveRef.current) return;

      const elapsed = Date.now() - startTimeRef.current;

      // Check for timeout
      if (elapsed >= TIMEOUT_MS) {
        if (isActiveRef.current) {
          setPageState('timeout');
          setConnectionStatus({ state: 'disconnected' });
        }
        return;
      }

      pollCountRef.current += 1;
      const result = await checkStatus();

      if (!isActiveRef.current) return;

      if (result === 'expired') {
        // Session expired, redirect to sign-in
        window.location.href = '/sign-in';
        return;
      }

      if (result === 'continue') {
        timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
      }
      // 'connected' case: state already updated in checkStatus
    };

    // Start polling immediately
    poll();

    return () => {
      isActiveRef.current = false;
      clearTimeout(timeoutId);
    };
  }, [checkStatus]);

  // Timeout state
  if (pageState === 'timeout') {
    return (
      <div style={containerStyles}>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <div style={cardStyles}>
          <div style={warningBoxStyles}>
            <div style={warningTitleStyles}>Connection Taking Longer Than Expected</div>
            <div style={warningTextStyles}>
              We haven&apos;t received confirmation yet. This sometimes happens if the connection
              is still processing. Please try refreshing the page or attempting to connect again.
            </div>
          </div>

          <div style={statusContainerStyles}>
            <LinkedInConnectionStatus status={connectionStatus} />
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            style={buttonStyles}
          >
            Refresh Page
          </button>

          <button
            type="button"
            style={secondaryButtonStyles}
            onClick={() => { window.location.href = '/onboarding'; }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Connected state
  if (pageState === 'connected') {
    return (
      <div style={containerStyles}>
        <div style={cardStyles}>
          <div style={checkmarkContainerStyles}>
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

          <h1 style={titleStyles}>Successfully Connected!</h1>
          <p style={descriptionStyles}>
            Your LinkedIn account is now connected. You can start using all the features.
          </p>

          <div style={statusContainerStyles}>
            <LinkedInConnectionStatus status={connectionStatus} />
          </div>

          <button
            type="button"
            style={buttonStyles}
            onClick={() => { window.location.href = '/dashboard'; }}
          >
            Continue to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Polling state (default)
  return (
    <div style={containerStyles}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={cardStyles}>
        <div style={spinnerContainerStyles}>
          <div style={spinnerStyles} />
        </div>

        <h1 style={titleStyles}>Connecting Your Account...</h1>
        <p style={descriptionStyles}>
          Please wait while we verify your LinkedIn connection. This usually takes just a few seconds.
        </p>

        <div style={statusContainerStyles}>
          <LinkedInConnectionStatus status={connectionStatus} />
        </div>
      </div>
    </div>
  );
}
