'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CalendarLinkCardProps {
  defaultValue?: string
  onSave: (url: string) => Promise<void>
}

export function CalendarLinkCard({ defaultValue = '', onSave }: CalendarLinkCardProps) {
  const [calendarUrl, setCalendarUrl] = useState(defaultValue)
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await onSave(calendarUrl)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-[#242836] border border-white/10 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-white">Calendar Link</h2>
      <p className="text-sm text-gray-400 mt-2">
        Add your calendar link to automatically include it in outreach messages when using "Book a Call" CTA.
      </p>

      <div className="mt-4">
        <Label htmlFor="calendar-url" className="text-sm font-medium text-white">
          Calendar URL
        </Label>
        <Input
          id="calendar-url"
          type="url"
          placeholder="https://cal.com/yourname/30min"
          value={calendarUrl}
          onChange={(e) => setCalendarUrl(e.target.value)}
          className="mt-2"
        />
        <p className="text-xs text-gray-500 mt-2">
          Supports Calendly, Cal.com, Acuity Scheduling, etc.
        </p>
      </div>

      <Button
        onClick={handleSave}
        disabled={isLoading}
        className="w-full bg-[#d4a84b] text-[#1a1d29] rounded-lg mt-4 h-12 hover:bg-[#e5b95c] font-semibold"
      >
        {isLoading ? 'Saving...' : 'Save Calendar Link'}
      </Button>
    </div>
  )
}
