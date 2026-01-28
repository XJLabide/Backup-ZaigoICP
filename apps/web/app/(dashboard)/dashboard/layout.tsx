'use client';

import { useEffect } from 'react';
import { Sidebar } from '@/components/sidebar';
import { MobileNav } from '@/components/mobile-nav';

export default function DashboardLayout({
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

  return (
    <div className="flex h-screen">
      <Sidebar />
      <MobileNav />
      <main className="flex-1 overflow-auto bg-gray-100">
        {children}
      </main>
    </div>
  );
}
