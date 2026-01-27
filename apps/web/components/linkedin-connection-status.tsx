'use client';

/**
 * LinkedIn connection status component.
 *
 * Displays the current LinkedIn connection status with visual indicators.
 * Uses a discriminated union (state machine) for type-safe status handling.
 *
 * States:
 * - idle: Initial state, not yet checked
 * - connecting: OAuth flow in progress
 * - connected: LinkedIn account is linked (shows timestamp)
 * - disconnected: No LinkedIn account linked
 * - error: An error occurred (shows error message)
 */

import { useCallback } from 'react';

// =============================================================================
// Types
// =============================================================================

/**
 * Discriminated union for connection status states.
 * Using a state machine pattern prevents impossible states.
 */
export type ConnectionStatus =
  | { state: 'idle' }
  | { state: 'connecting' }
  | { state: 'connected'; connectedAt: Date }
  | { state: 'disconnected' }
  | { state: 'error'; message: string };

/**
 * Props for the LinkedInConnectionStatus component.
 */
export interface LinkedInConnectionStatusProps {
  /** Current connection status */
  status: ConnectionStatus;
  /** Optional callback when user clicks connect button */
  onConnect?: () => void;
  /** Optional class name for the container */
  className?: string;
}

// =============================================================================
// Styles
// =============================================================================

const baseContainerStyles: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 12px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 500,
};

const indicatorStyles: React.CSSProperties = {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  flexShrink: 0,
};

const buttonStyles: React.CSSProperties = {
  marginLeft: '8px',
  padding: '4px 8px',
  borderRadius: '4px',
  border: 'none',
  backgroundColor: '#0077b5',
  color: 'white',
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
};

// =============================================================================
// Status Configuration
// =============================================================================

interface StatusConfig {
  indicatorColor: string;
  backgroundColor: string;
  textColor: string;
  label: string;
}

function getStatusConfig(status: ConnectionStatus): StatusConfig {
  switch (status.state) {
    case 'idle':
      return {
        indicatorColor: '#9ca3af', // gray-400
        backgroundColor: '#f3f4f6', // gray-100
        textColor: '#6b7280', // gray-500
        label: 'Checking...',
      };
    case 'connecting':
      return {
        indicatorColor: '#fbbf24', // yellow-400
        backgroundColor: '#fefce8', // yellow-50
        textColor: '#a16207', // yellow-700
        label: 'Connecting...',
      };
    case 'connected':
      return {
        indicatorColor: '#22c55e', // green-500
        backgroundColor: '#f0fdf4', // green-50
        textColor: '#15803d', // green-700
        label: 'Connected',
      };
    case 'disconnected':
      return {
        indicatorColor: '#9ca3af', // gray-400
        backgroundColor: '#f3f4f6', // gray-100
        textColor: '#6b7280', // gray-500
        label: 'Not connected',
      };
    case 'error':
      return {
        indicatorColor: '#ef4444', // red-500
        backgroundColor: '#fef2f2', // red-50
        textColor: '#b91c1c', // red-700
        label: 'Error',
      };
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Formats a date for display in the connection status.
 * Shows relative time for recent connections, date for older ones.
 */
function formatConnectedAt(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) {
    return 'just now';
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

// =============================================================================
// Component
// =============================================================================

/**
 * Displays LinkedIn connection status with appropriate visual indicators.
 *
 * @example
 * // Disconnected state with connect button
 * <LinkedInConnectionStatus
 *   status={{ state: 'disconnected' }}
 *   onConnect={() => handleConnect()}
 * />
 *
 * @example
 * // Connected state showing timestamp
 * <LinkedInConnectionStatus
 *   status={{ state: 'connected', connectedAt: new Date() }}
 * />
 *
 * @example
 * // Error state
 * <LinkedInConnectionStatus
 *   status={{ state: 'error', message: 'Connection failed' }}
 * />
 */
export function LinkedInConnectionStatus({
  status,
  onConnect,
  className,
}: LinkedInConnectionStatusProps) {
  const config = getStatusConfig(status);

  const handleConnectClick = useCallback(() => {
    if (onConnect) {
      onConnect();
    }
  }, [onConnect]);

  // Determine if connect button should be shown
  const showConnectButton =
    (status.state === 'disconnected' || status.state === 'error') && onConnect;

  // Build indicator style with animation for connecting state
  const indicatorStyle: React.CSSProperties = {
    ...indicatorStyles,
    backgroundColor: config.indicatorColor,
    ...(status.state === 'connecting' && {
      animation: 'pulse 1.5s ease-in-out infinite',
    }),
  };

  return (
    <>
      {/* Keyframe animation for connecting state */}
      {status.state === 'connecting' && (
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}</style>
      )}
      <div
        className={className}
        style={{
          ...baseContainerStyles,
          backgroundColor: config.backgroundColor,
          color: config.textColor,
        }}
        role="status"
        aria-live="polite"
      >
        {/* Status indicator dot */}
        <span style={indicatorStyle} aria-hidden="true" />

        {/* Status label */}
        <span>
          {config.label}
          {status.state === 'connected' && (
            <span style={{ fontWeight: 400, marginLeft: '4px' }}>
              {formatConnectedAt(status.connectedAt)}
            </span>
          )}
          {status.state === 'error' && (
            <span style={{ fontWeight: 400, marginLeft: '4px' }}>
              - {status.message}
            </span>
          )}
        </span>

        {/* Connect button for disconnected/error states */}
        {showConnectButton && (
          <button
            type="button"
            onClick={handleConnectClick}
            style={buttonStyles}
            aria-label="Connect LinkedIn account"
          >
            Connect
          </button>
        )}
      </div>
    </>
  );
}

export default LinkedInConnectionStatus;
