'use client';

import { useClerk } from '@clerk/nextjs';
import { Users, LogOut } from 'lucide-react';

export function TopBar() {
  const { signOut } = useClerk();

  const handleLogout = () => {
    signOut({ redirectUrl: '/sign-in' });
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-neutral-200">
      <div className="flex items-center justify-end px-6 py-3">
        {/* Actions */}
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-200 rounded-full hover:bg-neutral-50 transition-colors">
            <Users className="w-4 h-4" />
            <span>Invite</span>
          </button>
          <button className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-200 rounded-full hover:bg-neutral-50 transition-colors">
            Help
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-200 rounded-full hover:bg-neutral-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Log out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
