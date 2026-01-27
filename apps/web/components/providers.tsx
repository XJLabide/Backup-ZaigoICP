'use client';

import { ClerkProvider } from '@clerk/nextjs';

export function Providers({ children }: { children: React.ReactNode }) {
  // Check if Clerk is configured
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  // Skip Clerk if no key (allows build without Clerk configured)
  if (!publishableKey) {
    return <>{children}</>;
  }

  return <ClerkProvider>{children}</ClerkProvider>;
}
