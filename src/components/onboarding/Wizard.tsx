'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { StepWelcome } from './StepWelcome'
import { StepGoal } from './StepGoal'
import { StepCompare } from './StepCompare'

interface WizardProps {
  companyId: string
  initialPrefs?: {
    goalAmount: number | null
    completedAt: string | null
  }
  onComplete?: () => void
}

export function Wizard({ companyId, initialPrefs, onComplete }: WizardProps) {
  const [step, setStep] = useState(0) // 0: Welcome, 1: Goal, 2: Compare
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [goalAmount, setGoalAmount] = useState<number | null>(
    initialPrefs?.goalAmount ?? 1000
  )

  // Track step views
  useEffect(() => {
    console.log('[Onboarding] step_view', { step: step + 1 })
  }, [step])

  const handleNext = async () => {
    if (step === 0) {
      // Welcome -> Goal: just advance
      setStep(1)
      setError(null)
    } else if (step === 1) {
      // Goal -> Compare: save goal first
      console.log('[Onboarding] set_goal', { goalAmount })
      
      setLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/company/prefs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            companyId,
            patch: {
              goalAmount: goalAmount !== null ? Number(goalAmount) : null,
            },
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to save goal' }))
          throw new Error(errorData.error || 'Failed to save goal')
        }

        setStep(2)
      } catch (err) {
        console.error('[Onboarding] Error saving goal:', err)
        setError(err instanceof Error ? err.message : 'Failed to save goal')
      } finally {
        setLoading(false)
      }
    }
  }

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1)
      setError(null)
    }
  }

  const handleFinish = async (chosenPlan: 'free' | 'pro') => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/company/prefs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId,
          patch: {
            goalAmount: goalAmount !== null ? Number(goalAmount) : null,
            completedAt: new Date().toISOString(),
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to save preferences' }))
        throw new Error(errorData.error || 'Failed to save preferences')
      }

      // Success - refresh page or call onComplete
      if (onComplete) {
        onComplete()
      } else {
        window.location.reload()
      }
    } catch (err) {
      console.error('[Onboarding] Error finishing wizard:', err)
      setError(err instanceof Error ? err.message : 'Failed to save preferences')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-slate-950/80 dark:from-black/90 dark:via-slate-900/70 dark:to-black/90" />
      
      <Card className="relative w-full max-w-[820px] rounded-2xl border shadow-2xl bg-background/95 backdrop-blur-sm">
        <CardContent className="p-8">
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[0, 1, 2].map((s) => (
              <div
                key={s}
                className={`h-2 w-8 rounded-full transition-colors ${
                  s === step
                    ? 'bg-primary'
                    : s < step
                    ? 'bg-primary/50'
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Step content */}
          <div className="min-h-[400px]">
            {step === 0 && <StepWelcome />}
            {step === 1 && <StepGoal goalAmount={goalAmount} onGoalChange={setGoalAmount} />}
            {step === 2 && (
              <StepCompare
                onChooseFree={() => handleFinish('free')}
                onChoosePro={() => handleFinish('pro')}
              />
            )}
          </div>
        </CardContent>

        <CardFooter className="flex justify-between px-8 pb-8">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 0 || loading}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {step < 2 ? (
            <Button onClick={handleNext} disabled={loading}>
              {step === 0 ? 'Get started' : 'Next'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <div className="w-24" />
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
