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
    <div className="bg-neutral-100 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-black">Rate Limiting</h2>
      <p className="text-sm text-neutral-600 mt-2">
        Control how many connection requests we send daily to protect your account.
      </p>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-black">Daily Limit</span>
          <span className="text-sm font-semibold text-black">
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

        <p className="text-xs text-neutral-500 mt-2">
          LinkedIn allows ~100 per week. We keep it conservative for account safety.
        </p>
      </div>

      <Button
        onClick={handleSave}
        disabled={isLoading}
        className="w-full bg-black text-white rounded-lg mt-4 h-12 hover:bg-neutral-800"
      >
        {isLoading ? "Saving..." : "Save Limit"}
      </Button>
    </div>
  )
}
