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
    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
      <h3 className="font-semibold text-red-600 mb-2">Danger Zone</h3>
      <p className="text-sm text-neutral-600 mb-4">
        Disconnect your LinkedIn account from Warm
      </p>

      <div className="bg-white rounded p-3 mb-4 space-y-2">
        <p className="text-sm text-neutral-700">
          • This will stop all future automated outreach
        </p>
        <p className="text-sm text-neutral-700">
          • Your LinkedIn credentials remain safe with Unipile
        </p>
        <p className="text-sm text-neutral-700">• You can reconnect anytime</p>
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-100 hover:text-red-600"
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
