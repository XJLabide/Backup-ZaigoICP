'use client';

import { ReactNode } from 'react';
import { SidebarProvider, useSidebarState } from './sidebar-provider';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

interface DashboardLayoutProps {
  children: ReactNode;
}

function DashboardContent({ children }: DashboardLayoutProps) {
  const { isCollapsed } = useSidebarState();

  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      <div
        className={`min-h-screen flex flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? 'ml-[80px]' : 'ml-[260px]'
        }`}
      >
        <TopBar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  );
}
