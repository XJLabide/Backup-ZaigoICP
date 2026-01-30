"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"

interface NotificationPreferencesCardProps {
  defaultNewLeads: boolean
  defaultReplies: boolean
  defaultDailyDigest: boolean
  onSave: (prefs: { newLeads: boolean; replies: boolean; dailyDigest: boolean }) => Promise<void>
}

export function NotificationPreferencesCard({
  defaultNewLeads,
  defaultReplies,
  defaultDailyDigest,
  onSave
}: NotificationPreferencesCardProps) {
  const [newLeads, setNewLeads] = React.useState(defaultNewLeads)
  const [replies, setReplies] = React.useState(defaultReplies)
  const [dailyDigest, setDailyDigest] = React.useState(defaultDailyDigest)
  const [isSaving, setIsSaving] = React.useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave({ newLeads, replies, dailyDigest })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-[#242836] border border-white/10 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-white">Notification Preferences</h2>
      <p className="text-sm text-gray-400 mt-2 mb-4">
        Control which email notifications you receive
      </p>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <label htmlFor="new-leads" className="text-sm font-medium text-white">
              New Prospects
            </label>
            <p className="text-xs text-gray-400 mt-0.5">
              Get notified when someone views your profile
            </p>
          </div>
          <Switch
            id="new-leads"
            checked={newLeads}
            onCheckedChange={setNewLeads}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex-1">
            <label htmlFor="replies" className="text-sm font-medium text-white">
              Replies
            </label>
            <p className="text-xs text-gray-400 mt-0.5">
              Get notified when a connection replies
            </p>
          </div>
          <Switch
            id="replies"
            checked={replies}
            onCheckedChange={setReplies}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex-1">
            <label htmlFor="daily-digest" className="text-sm font-medium text-white">
              Daily Digest
            </label>
            <p className="text-xs text-gray-400 mt-0.5">
              Receive a daily summary of activity
            </p>
          </div>
          <Switch
            id="daily-digest"
            checked={dailyDigest}
            onCheckedChange={setDailyDigest}
          />
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full bg-[#d4a84b] text-[#1a1d29] rounded-lg mt-6 h-12 hover:bg-[#e5b95c] font-semibold"
      >
        {isSaving ? "Saving..." : "Save Preferences"}
      </Button>
    </div>
  )
}
