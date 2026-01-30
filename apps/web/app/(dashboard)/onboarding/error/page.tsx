export const dynamic = 'force-dynamic';

/**
 * Onboarding error page.
 *
 * Displayed when LinkedIn OAuth fails or is cancelled.
 * Provides a friendly error message and a button to try again.
 */

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { ErrorClient } from './client';

export default async function OnboardingErrorPage() {
  // Verify authentication
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }

  return <ErrorClient />;
}
