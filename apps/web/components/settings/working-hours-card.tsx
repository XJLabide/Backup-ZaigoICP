'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface WorkingHoursCardProps {
  defaultStart: string // "HH:00" format, e.g., "09:00"
  defaultEnd: string   // "HH:00" format, e.g., "17:00"
  onSave: (start: string, end: string) => Promise<void>
}

export function WorkingHoursCard({ defaultStart, defaultEnd, onSave }: WorkingHoursCardProps) {
  const [startTime, setStartTime] = useState(defaultStart)
  const [endTime, setEndTime] = useState(defaultEnd)
  const [isSaving, setIsSaving] = useState(false)

  const timeOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0')
    return { value: `${hour}:00`, label: `${hour}:00` }
  })

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(startTime, endTime)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-[#242836] border border-white/10 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-white">Working Hours</h2>
      <p className="text-sm text-gray-400 mb-4">
        Set when automated messages can be sent
      </p>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <div>
          <Label htmlFor="start-time" className="text-sm font-medium text-white">
            Start Time
          </Label>
          <Select value={startTime} onValueChange={setStartTime}>
            <SelectTrigger id="start-time" className="mt-2">
              <SelectValue placeholder="Select start time" />
            </SelectTrigger>
            <SelectContent>
              {timeOptions.map((option) => (
                <SelectItem key={`start-${option.value}`} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="end-time" className="text-sm font-medium text-white">
            End Time
          </Label>
          <Select value={endTime} onValueChange={setEndTime}>
            <SelectTrigger id="end-time" className="mt-2">
              <SelectValue placeholder="Select end time" />
            </SelectTrigger>
            <SelectContent>
              {timeOptions.map((option) => (
                <SelectItem key={`end-${option.value}`} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-2">
        Messages will only be sent during these hours in your timezone
      </p>

      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full bg-[#d4a84b] text-[#1a1d29] rounded-lg mt-4 h-12 hover:bg-[#e5b95c] font-semibold"
      >
        {isSaving ? 'Saving...' : 'Save Hours'}
      </Button>
    </div>
  )
}
