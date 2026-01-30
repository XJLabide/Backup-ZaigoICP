'use client';

import { useState } from 'react';
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
import { Button } from '@/components/ui/button';

interface DisconnectLinkedInCardProps {
  isConnected: boolean;
  onDisconnect: () => Promise<void>;
}

export function DisconnectLinkedInCard({
  isConnected,
  onDisconnect,
}: DisconnectLinkedInCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      await onDisconnect();
      setOpen(false);
    } catch (error) {
      console.error('Disconnect failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
      <h3 className="font-semibold text-red-400 mb-2">Danger Zone</h3>
      <p className="text-sm text-gray-400 mb-4">
        Disconnect your LinkedIn account from AOG Outreach
      </p>

      <div className="bg-[#1a1d29] border border-white/10 rounded p-3 mb-4 space-y-2">
        <p className="text-sm text-gray-300">
          • This will stop all future automated outreach
        </p>
        <p className="text-sm text-gray-300">
          • Your LinkedIn credentials remain safe with Unipile
        </p>
        <p className="text-sm text-gray-300">• You can reconnect anytime</p>
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            className="border-red-500/50 text-red-400 hover:bg-red-500/20 hover:text-red-400"
            disabled={!isConnected || isLoading}
          >
            {isLoading ? 'Disconnecting...' : 'Disconnect LinkedIn'}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect LinkedIn?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This will stop all future automated outreach.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={handleDisconnect}
                disabled={isLoading}
              >
                {isLoading ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
