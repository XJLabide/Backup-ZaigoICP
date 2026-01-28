'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  Megaphone,
  MessageSquare,
  Settings,
  Sparkles,
} from 'lucide-react';

const navItems = [
  { icon: Home, label: 'Dashboard', href: '/dashboard' },
  { icon: Users, label: 'Leads', href: '/dashboard/leads' },
  { icon: Megaphone, label: 'Campaigns', href: '/dashboard/campaigns' },
  { icon: MessageSquare, label: 'Messages', href: '/dashboard/messages' },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] bg-transparent border-r border-neutral-300 flex flex-col z-40">
      {/* Brand */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-neutral-300">
        <span className="text-lg font-semibold text-neutral-900">Flowline</span>
        <Sparkles className="w-5 h-5 text-neutral-900" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-neutral-100 text-neutral-900'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              <span>{item.label}</span>
              <item.icon className="w-5 h-5" />
            </Link>
          ))}
        </div>
      </nav>

      {/* Settings at bottom */}
      <div className="p-3 border-t border-neutral-300">
        <Link
          href="/dashboard/settings"
          className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            pathname === '/dashboard/settings'
              ? 'bg-neutral-100 text-neutral-900'
              : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
          }`}
        >
          <span>Settings</span>
          <Settings className="w-5 h-5" />
        </Link>
      </div>
    </aside>
  );
}
