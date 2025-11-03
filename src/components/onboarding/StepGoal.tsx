'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface StepGoalProps {
  goalAmount: number | null
  onGoalChange: (amount: number | null) => void
}

const PRESET_AMOUNTS = [500, 1000, 2500, 5000, 10000]

export function StepGoal({ goalAmount, onGoalChange }: StepGoalProps) {
  const [customAmount, setCustomAmount] = useState<string>(
    goalAmount && !PRESET_AMOUNTS.includes(goalAmount) ? String(goalAmount) : ''
  )

  const handlePresetClick = (amount: number) => {
    setCustomAmount('')
    onGoalChange(amount)
  }

  const handleCustomChange = (value: string) => {
    setCustomAmount(value)
    if (value === '') {
      onGoalChange(null)
    } else {
      const num = Number(value)
      if (!isNaN(num) && num >= 0) {
        onGoalChange(num)
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-semibold">Set your monthly revenue goal</h2>
        <p className="text-muted-foreground">We'll track your progress automatically.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-3">
          <Label>Choose an amount or enter custom</Label>
          
          {/* Preset buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {PRESET_AMOUNTS.map((amount) => (
              <Button
                key={amount}
                type="button"
                variant={goalAmount === amount ? 'default' : 'outline'}
                onClick={() => handlePresetClick(amount)}
                className="w-full"
              >
                ${amount.toLocaleString()}
              </Button>
            ))}
          </div>
        </div>

        {/* Custom amount input */}
        <div className="space-y-2">
          <Label htmlFor="goalAmount">Or enter custom amount (USD)</Label>
          <Input
            id="goalAmount"
            type="number"
            min="0"
            step="100"
            value={customAmount}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="Enter amount"
            className="text-lg"
          />
          <p className="text-xs text-muted-foreground">
            You can change this later in your preferences.
          </p>
        </div>
      </div>
    </div>
  )
}
