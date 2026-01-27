/**
 * Onboarding success page.
 *
 * After the user completes LinkedIn OAuth, Unipile redirects them here.
 * This page polls /api/user/status every 2 seconds to detect when the
 * webhook has been processed. Times out after 60 seconds.
 */

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { SuccessClient } from './client';

export default async function OnboardingSuccessPage() {
  // Verify authentication
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }

  return <SuccessClient />;
}
