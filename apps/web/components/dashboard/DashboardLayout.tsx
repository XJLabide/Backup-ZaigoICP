'use client';

import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="ml-[260px] min-h-screen flex flex-col">
        <TopBar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
