'use client';

/**
 * Client component for the error page.
 *
 * Displays a friendly error message and provides a button to retry the connection.
 */

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
  textAlign: 'center',
};

const errorIconContainerStyles: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '64px',
  height: '64px',
  borderRadius: '50%',
  backgroundColor: '#fef2f2',
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
  backgroundColor: '#0077b5',
  color: 'white',
  fontSize: '16px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'background-color 0.2s',
};

const helpTextStyles: React.CSSProperties = {
  marginTop: '24px',
  padding: '16px',
  backgroundColor: '#f3f4f6',
  borderRadius: '8px',
  textAlign: 'left',
};

const helpTitleStyles: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: '#374151',
  marginBottom: '8px',
};

const helpListStyles: React.CSSProperties = {
  fontSize: '14px',
  color: '#6b7280',
  lineHeight: 1.6,
  paddingLeft: '20px',
  margin: 0,
};

// =============================================================================
// Component
// =============================================================================

export function ErrorClient() {
  const status: ConnectionStatus = {
    state: 'error',
    message: 'Connection failed',
  };

  return (
    <div style={containerStyles}>
      <div style={cardStyles}>
        <div style={errorIconContainerStyles}>
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>

        <h1 style={titleStyles}>Connection Failed</h1>
        <p style={descriptionStyles}>
          We couldn&apos;t connect your LinkedIn account. This can happen if the authorization
          was cancelled or if there was an issue with LinkedIn.
        </p>

        <div style={statusContainerStyles}>
          <LinkedInConnectionStatus status={status} />
        </div>

        <button
          type="button"
          style={buttonStyles}
          onClick={() => { window.location.href = '/onboarding'; }}
        >
          Try Again
        </button>

        <div style={helpTextStyles}>
          <div style={helpTitleStyles}>Troubleshooting tips:</div>
          <ul style={helpListStyles}>
            <li>Make sure you&apos;re logged into your LinkedIn account</li>
            <li>Try using a different browser or clearing your cache</li>
            <li>Disable any browser extensions that might interfere</li>
            <li>If the issue persists, contact support</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
