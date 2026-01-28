'use client';

import { useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard';

export default function DashboardLayoutPage({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sync user to database on first visit
  useEffect(() => {
    fetch('/api/me').catch(() => {
      // Silently fail - user will be created on next visit
    });
  }, []);

  return <DashboardLayout>{children}</DashboardLayout>;
}
