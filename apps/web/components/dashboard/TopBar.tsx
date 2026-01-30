'use client';

import { useClerk } from '@clerk/nextjs';
import { LogOut } from 'lucide-react';
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
import { useOnboarding } from '@/components/onboarding/onboarding-provider';

export function TopBar() {
  const { signOut } = useClerk();
  const { startTour } = useOnboarding();

  const handleLogout = () => {
    signOut({ redirectUrl: '/sign-in' });
  };

  return (
    <header className="sticky top-0 z-30 bg-[#242836] border-b border-white/10 h-13">
      <div className="flex items-center justify-end h-full px-6">
        {/* Actions */}
        <div className="flex items-center gap-3">
          <button onClick={startTour} className="px-4 py-2 text-sm font-medium text-white bg-transparent border border-white/20 rounded-md hover:bg-white/10 hover:border-[#d4a84b] transition-colors cursor-pointer">
            Help
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-transparent border border-white/20 rounded-md hover:bg-white/10 hover:border-[#d4a84b] transition-colors cursor-pointer">
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
