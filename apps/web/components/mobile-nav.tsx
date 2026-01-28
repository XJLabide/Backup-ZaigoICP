'use client';

import { Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

// Dynamic import of UserButton to avoid build-time Clerk errors
const UserButton = dynamic(
  () => import('@clerk/nextjs').then((mod) => mod.UserButton),
  {
    ssr: false,
    loading: () => <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
  }
);

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/dashboard/leads', label: 'Leads', icon: '👥' },
  { href: '/dashboard/campaigns', label: 'Campaigns', icon: '📧' },
  { href: '/dashboard/messages', label: 'Messages', icon: '💬' },
  { href: '/dashboard/settings', label: 'Settings', icon: '⚙️' },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <div className="fixed top-0 left-0 right-0 z-40 flex h-16 items-center justify-between border-b bg-white px-4">
        <h1 className="text-lg font-bold">LinkedIn Auto</h1>

        <Sheet>
          <SheetTrigger className="p-3 hover:bg-gray-100 rounded-lg transition-colors">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Open menu</span>
          </SheetTrigger>

          <SheetContent side="left" className="w-[280px] sm:w-[320px]">
            <SheetHeader>
              <SheetTitle className="text-left">Navigation</SheetTitle>
            </SheetHeader>

            <nav className="mt-8 space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-4 rounded-lg px-4 py-3 text-base transition-colors',
                    'min-h-[44px]', // Touch target size
                    pathname === item.href
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                  )}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
            </nav>

            <div className="absolute bottom-0 left-0 right-0 border-t bg-white p-6">
              <div className="flex items-center gap-3">
                <UserButton afterSignOutUrl="/" />
                <span className="text-sm font-medium text-gray-700">Account</span>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Spacer to prevent content from hiding under fixed header */}
      <div className="h-16" />
    </div>
  );
}
