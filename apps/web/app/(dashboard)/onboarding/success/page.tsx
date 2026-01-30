export const dynamic = 'force-dynamic';

/**
 * Onboarding success page.
 *
 * After the user completes LinkedIn OAuth, Unipile redirects them here.
 * This page polls /api/user/status every 2 seconds to detect when the
 * webhook has been processed. Times out after 60 seconds.
 *
 * If webhook fails, uses account_id from URL to manually sync.
 */

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { SuccessClient } from './client';

interface SuccessPageProps {
  searchParams: Promise<{ account_id?: string }>;
}

export default async function OnboardingSuccessPage({ searchParams }: SuccessPageProps) {
  // Verify authentication
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }

  const params = await searchParams;
  const accountId = params.account_id || null;

  return <SuccessClient accountId={accountId} />;
}
