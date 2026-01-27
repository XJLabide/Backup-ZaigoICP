/**
 * Unipile auth link generation utilities.
 *
 * Generates hosted auth links for LinkedIn OAuth flow.
 * The `name` field is used to correlate webhooks back to users.
 */

import { getUnipileClient, getUnipileConfig } from './client';

/**
 * Default auth link expiry in minutes.
 * Can be overridden via UNIPILE_AUTH_LINK_EXPIRY_MINUTES env var.
 */
const DEFAULT_EXPIRY_MINUTES = 30;

/**
 * Result from creating a hosted auth link.
 */
export interface AuthLinkResult {
  url: string;
  /** The expiresOn value we sent to Unipile (for logging) */
  expiresOn: string;
}

/**
 * Generates a Unipile hosted auth link for LinkedIn OAuth.
 *
 * @param userId - Clerk user ID to embed in the auth link for webhook correlation
 * @returns Object containing the auth URL and expiry information
 * @throws Error if environment variables are invalid or Unipile client fails
 */
export async function generateAuthLink(userId: string): Promise<AuthLinkResult> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    throw new Error('NEXT_PUBLIC_APP_URL environment variable is required');
  }

  // Configurable expiry duration
  const expiryMinutes = process.env.UNIPILE_AUTH_LINK_EXPIRY_MINUTES
    ? parseInt(process.env.UNIPILE_AUTH_LINK_EXPIRY_MINUTES, 10)
    : DEFAULT_EXPIRY_MINUTES;
  const expiresOn = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

  // Get client lazily - throws if env is invalid
  const client = getUnipileClient();
  const config = getUnipileConfig();

  // Normalize app URL to avoid double slashes
  const normalizedAppUrl = appUrl.replace(/\/$/, '');

  const result = await client.account.createHostedAuthLink({
    type: 'create',
    providers: ['LINKEDIN'],
    success_redirect_url: `${normalizedAppUrl}/onboarding/success`,
    failure_redirect_url: `${normalizedAppUrl}/onboarding/error`,
    expiresOn,
    notify_url: `${normalizedAppUrl}/api/webhooks/unipile`,
    api_url: config.dsn,
    name: userId, // Critical: Used to identify user in webhooks
  });

  return {
    url: result.url,
    expiresOn,
  };
}
