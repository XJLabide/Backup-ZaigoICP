"use client"

import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TimezoneCardProps {
  defaultValue: string;
  onSave: (timezone: string) => Promise<void>;
}

const timezones = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Dubai', label: 'Gulf Standard (GST)' },
  { value: 'Asia/Kolkata', label: 'India Standard (IST)' },
  { value: 'Asia/Tokyo', label: 'Japan (JST)' },
  { value: 'Asia/Shanghai', label: 'China (CST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'Pacific/Auckland', label: 'New Zealand (NZST)' },
];

export function TimezoneCard({ defaultValue, onSave }: TimezoneCardProps) {
  const [selectedTimezone, setSelectedTimezone] = useState(defaultValue);
  const [isSaving, setIsSaving] = useState(false);

  const allTimezones = useMemo(() => {
    if (timezones.some(tz => tz.value === defaultValue)) {
      return timezones;
    }
    return [{ value: defaultValue, label: defaultValue }, ...timezones];
  }, [defaultValue]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(selectedTimezone);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-neutral-100 rounded-lg p-6">
      <h3 className="font-semibold text-black mb-1">Timezone</h3>
      <p className="text-sm text-neutral-600 mb-4">
        Set your local timezone for scheduling
      </p>

      <div className="space-y-4">
        <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
          <SelectTrigger className="w-full bg-white">
            <SelectValue placeholder="Select timezone" />
          </SelectTrigger>
          <SelectContent>
            {allTimezones.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-black text-white px-4 py-2 rounded-lg font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? "Saving..." : "Save Timezone"}
        </button>
      </div>
    </div>
  );
}
