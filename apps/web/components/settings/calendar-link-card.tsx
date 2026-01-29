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
    <div className="bg-neutral-100 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-black">Calendar Link</h2>
      <p className="text-sm text-neutral-600 mt-2">
        Add your calendar link to automatically include it in outreach messages when using "Book a Call" CTA.
      </p>

      <div className="mt-4">
        <Label htmlFor="calendar-url" className="text-sm font-medium text-black">
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
        <p className="text-xs text-neutral-500 mt-2">
          Supports Calendly, Cal.com, Acuity Scheduling, etc.
        </p>
      </div>

      <Button
        onClick={handleSave}
        disabled={isLoading}
        className="w-full bg-black text-white rounded-lg mt-4 h-12 hover:bg-neutral-800"
      >
        {isLoading ? 'Saving...' : 'Save Calendar Link'}
      </Button>
    </div>
  )
}
