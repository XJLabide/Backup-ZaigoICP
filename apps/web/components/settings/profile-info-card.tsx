"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

interface ProfileInfoCardProps {
  defaultDisplayName: string | null;
  defaultCompanyName: string | null;
  onSave: (displayName: string | null, companyName: string | null) => Promise<void>;
}

export function ProfileInfoCard({
  defaultDisplayName,
  defaultCompanyName,
  onSave,
}: ProfileInfoCardProps) {
  const [displayName, setDisplayName] = useState(defaultDisplayName ?? "");
  const [companyName, setCompanyName] = useState(defaultCompanyName ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(
        displayName.trim() || null,
        companyName.trim() || null
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[#242836] border border-white/10 rounded-lg p-6">
      <h2 className="font-semibold text-white mb-1">Profile Info</h2>
      <p className="text-sm text-gray-400 mb-4">
        This information is used in your outreach messages
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="display-name" className="block text-sm font-medium text-white">
            Display Name
          </label>
          <Input
            id="display-name"
            type="text"
            placeholder="Your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={isSaving}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="company-name" className="block text-sm font-medium text-white">
            Company Name
          </label>
          <Input
            id="company-name"
            type="text"
            placeholder="Your company"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            disabled={isSaving}
          />
        </div>

        <p className="text-xs text-gray-500">
          These will be used when personalizing connection requests
        </p>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-[#d4a84b] text-[#1a1d29] rounded-md px-4 py-2 text-sm font-semibold hover:bg-[#e5b95c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </div>
  );
}
