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
    <div className="space-y-4">
      <div className="text-center space-y-1.5">
        <h2 className="text-xl md:text-2xl font-semibold">Set your monthly revenue goal</h2>
        <p className="text-sm text-muted-foreground">We'll track your progress automatically.</p>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <Label className="text-sm">Choose an amount or enter custom</Label>
          
          {/* Preset buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PRESET_AMOUNTS.map((amount) => (
              <Button
                key={amount}
                type="button"
                variant={goalAmount === amount ? 'default' : 'outline'}
                onClick={() => handlePresetClick(amount)}
                className={`w-full transition-all ${
                  goalAmount === amount
                    ? 'bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-500 hover:to-sky-600 text-white font-medium shadow-lg shadow-cyan-500/20'
                    : 'border-2 hover:bg-muted/50'
                }`}
              >
                ${amount.toLocaleString()}
              </Button>
            ))}
          </div>
        </div>

        {/* Custom amount input */}
        <div className="space-y-1.5">
          <Label htmlFor="goalAmount" className="text-sm">Or enter custom amount (USD)</Label>
          <Input
            id="goalAmount"
            type="number"
            min="0"
            step="100"
            value={customAmount}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="Enter amount"
            className="text-base"
          />
          <p className="text-xs text-muted-foreground">
            You can change this later in your preferences.
          </p>
        </div>
      </div>
    </div>
  )
}
