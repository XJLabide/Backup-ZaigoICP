'use client';

import { useClerk } from '@clerk/nextjs';
import { Users, LogOut } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-black bg-white border border-neutral-300 rounded-md hover:bg-neutral-100 transition-colors">
            <Users className="w-4 h-4" />
            <span>Invite</span>
          </button>
          <button className="px-4 py-2 text-sm font-medium text-black bg-white border border-neutral-300 rounded-md hover:bg-neutral-100 transition-colors">
            Help
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-black bg-white border border-neutral-300 rounded-md hover:bg-neutral-100 transition-colors">
                <LogOut className="w-4 h-4" />
                <span>Log out</span>
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
                <AlertDialogDescription>
                  You will be redirected to the sign-in page and will need to log in again to access your dashboard.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout}>Log out</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </header>
  );
}
