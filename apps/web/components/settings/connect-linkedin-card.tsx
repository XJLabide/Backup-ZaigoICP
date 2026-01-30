'use client';

import { Shield, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConnectLinkedInCardProps {
  onConnect: () => void;
  isLoading?: boolean;
}

export function ConnectLinkedInCard({ onConnect, isLoading }: ConnectLinkedInCardProps) {
  return (
    <div className="bg-[#242836] border border-white/10 rounded-lg p-8">
      {/* Icon */}
      <div className="flex justify-center mb-6">
        <div className="p-4 bg-[#d4a84b] rounded-full">
          <Shield className="w-12 h-12 text-[#1a1d29]" />
        </div>
      </div>

      {/* Heading */}
      <h2 className="text-2xl font-bold text-white text-center mb-3">
        Connect Your LinkedIn
      </h2>

      {/* Subtitle */}
      <p className="text-gray-400 text-center mb-6">
        Securely authenticate your LinkedIn account to start warm outreach
      </p>

      {/* Security Features Box */}
      <div className="bg-[#1a1d29] border border-white/10 rounded-lg p-4 my-6 space-y-4">
        {/* Bank-level Security */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
            <span className="font-semibold text-white">Bank-level Security</span>
          </div>
          <p className="text-sm text-gray-400 ml-7">
            Your LinkedIn credentials are never stored. Unipile handles OAuth authentication.
          </p>
        </div>

        {/* Automated Rate Limiting */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
            <span className="font-semibold text-white">Automated Rate Limiting</span>
          </div>
          <p className="text-sm text-gray-400 ml-7">
            Stay safe with LinkedIn's guidelines. Unipile & AOG manage daily limits.
          </p>
        </div>
      </div>

      {/* Features List */}
      <div className="mb-6">
        <p className="font-semibold text-white mb-3">Once connected, you can:</p>
        <ul className="space-y-2 text-gray-400">
          <li className="flex items-start gap-2">
            <span className="text-gray-500 mt-1">•</span>
            <span>Automatically capture profile viewers</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gray-500 mt-1">•</span>
            <span>Send personalized connection requests with AI messages</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gray-500 mt-1">•</span>
            <span>Track acceptance and reply rates</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gray-500 mt-1">•</span>
            <span>Manage multiple campaigns with different tones and CTAs</span>
          </li>
        </ul>
      </div>

      {/* Connect Button */}
      <Button
        onClick={onConnect}
        disabled={isLoading}
        className="w-full bg-[#d4a84b] text-[#1a1d29] rounded-lg h-12 hover:bg-[#e5b95c] transition-colors font-semibold"
      >
        {isLoading ? 'Connecting...' : 'Connect LinkedIn Account'}
      </Button>

      {/* Footer */}
      <p className="text-xs text-gray-500 text-center mt-6">
        By connecting, you agree to our Terms of Service and Privacy Policy. Your account data is encrypted and secure.
      </p>
    </div>
  );
}
