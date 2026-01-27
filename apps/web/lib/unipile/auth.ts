/**
 * Unipile auth link generation utilities.
 *
 * Generates hosted auth links for LinkedIn OAuth flow.
 * The `name` field is used to correlate webhooks back to users.
 */

import { unipile, unipileConfig } from './client';

/**
 * Result from creating a hosted auth link.
 */
export interface AuthLinkResult {
  url: string;
  expiresAt?: string;
}

/**
 * Generates a Unipile hosted auth link for LinkedIn OAuth.
 *
 * @param userId - Clerk user ID to embed in the auth link for webhook correlation
 * @returns Object containing the auth URL and optional expiry information
 * @throws Error if Unipile client fails to create the auth link
 */
export async function generateAuthLink(userId: string): Promise<AuthLinkResult> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    throw new Error('NEXT_PUBLIC_APP_URL environment variable is required');
  }

  const expiresOn = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes

  const result = await unipile.account.createHostedAuthLink({
    type: 'create',
    providers: ['LINKEDIN'],
    success_redirect_url: `${appUrl}/onboarding/success`,
    failure_redirect_url: `${appUrl}/onboarding/error`,
    expiresOn,
    notify_url: `${appUrl}/api/webhooks/unipile`,
    api_url: unipileConfig.dsn,
    name: userId, // Critical: Used to identify user in webhooks
  });

  return {
    url: result.url,
    expiresAt: (result as { expiresAt?: string }).expiresAt,
  };
}
