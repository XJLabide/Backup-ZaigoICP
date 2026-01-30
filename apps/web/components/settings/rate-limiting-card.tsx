"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"

interface RateLimitingCardProps {
  defaultValue?: number
  onSave: (limit: number) => Promise<void>
}

export function RateLimitingCard({
  defaultValue = 25,
  onSave
}: RateLimitingCardProps) {
  const [limit, setLimit] = React.useState(defaultValue)
  const [isLoading, setIsLoading] = React.useState(false)

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await onSave(limit)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-[#242836] border border-white/10 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-white">Rate Limiting</h2>
      <p className="text-sm text-gray-400 mt-2">
        Control how many connection requests we send daily to protect your account.
      </p>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-white">Daily Limit</span>
          <span className="text-sm font-semibold text-white">
            {limit} connections/day
          </span>
        </div>

        <Slider
          value={[limit]}
          onValueChange={(values) => setLimit(values[0])}
          min={10}
          max={50}
          step={1}
          className="w-full"
        />

        <p className="text-xs text-gray-500 mt-2">
          LinkedIn allows ~100 per week. We keep it conservative for account safety.
        </p>
      </div>

      <Button
        onClick={handleSave}
        disabled={isLoading}
        className="w-full bg-[#d4a84b] text-[#1a1d29] rounded-lg mt-4 h-12 hover:bg-[#e5b95c] font-semibold"
      >
        {isLoading ? "Saving..." : "Save Limit"}
      </Button>
    </div>
  )
}
