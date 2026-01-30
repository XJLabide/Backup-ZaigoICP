'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  Megaphone,
  Target,
  MessageSquare,
  History,
  Settings,
  Sparkles,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { useSidebarState } from './sidebar-provider';

const navItems = [
  { icon: Home, label: 'Dashboard', href: '/dashboard' },
  { icon: Users, label: 'Prospects', href: '/dashboard/leads' },
  { icon: Megaphone, label: 'Campaigns', href: '/dashboard/campaigns' },
  { icon: Target, label: 'ICP', href: '/dashboard/icp' },
  { icon: MessageSquare, label: 'Messages', href: '/dashboard/messages' },
  { icon: History, label: 'History', href: '/dashboard/history' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggleSidebar } = useSidebarState();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-[#1a1d29] border-r border-white/10 flex flex-col z-40 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-[80px]' : 'w-[260px]'
      }`}
    >
      {/* Brand + Collapse Toggle */}
      <div className={`flex items-center justify-between h-13 px-6 border-b border-white/10 ${isCollapsed ? 'justify-center px-3' : ''}`}>
        <div className={`flex items-center gap-2 ${isCollapsed ? 'justify-center' : ''}`}>
          {isCollapsed ? (
            <span className="text-lg font-bold text-[#d4a84b]">AOG</span>
          ) : (
            <>
              <img
                src="https://associateownersgroup.com/wp-content/uploads/Logo-Horizontal.svg"
                alt="AOG"
                className="h-7 w-auto"
              />
              <span className="text-lg font-semibold text-white">AOG Outreach</span>
            </>
          )}
        </div>
        {!isCollapsed && (
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-md text-[#9ca3af] hover:bg-white/10 hover:text-white transition-colors"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
        {isCollapsed && (
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-md text-[#9ca3af] hover:bg-white/10 hover:text-white transition-colors"
            title="Expand sidebar"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isCollapsed ? 'justify-center' : ''
              } ${
                isActive(item.href)
                  ? 'bg-[#d4a84b] text-[#1a1d29]'
                  : 'text-[#9ca3af] hover:bg-white/10 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </div>
      </nav>

      {/* Settings */}
      <div className="p-3 border-t border-white/10">
        <Link
          href="/dashboard/settings"
          title={isCollapsed ? 'Settings' : undefined}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
            isCollapsed ? 'justify-center' : ''
          } ${
            pathname === '/dashboard/settings'
              ? 'bg-[#d4a84b] text-[#1a1d29]'
              : 'text-[#9ca3af] hover:bg-white/10 hover:text-white'
          }`}
        >
          <Settings className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span>Settings</span>}
        </Link>
      </div>

    </aside>
  );
}
