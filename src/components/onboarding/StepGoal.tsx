'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface StepGoalProps {
  goalAmount: number | null
  onGoalChange: (amount: number | null) => void
}

export function StepGoal({ goalAmount, onGoalChange }: StepGoalProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-semibold">Set your monthly revenue goal</h2>
        <p className="text-muted-foreground">We'll track your progress automatically.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="goalAmount">Monthly Revenue Goal (USD)</Label>
          <Input
            id="goalAmount"
            type="number"
            min="0"
            step="100"
            value={goalAmount ?? ''}
            onChange={(e) => {
              const value = e.target.value
              onGoalChange(value === '' ? null : Number(value))
            }}
            placeholder="1000"
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

