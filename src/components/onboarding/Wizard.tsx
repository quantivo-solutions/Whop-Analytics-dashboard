'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import { StepWelcome } from './StepWelcome'
import { StepGoal } from './StepGoal'
import { StepCompare } from './StepCompare'

interface WizardProps {
  companyId: string
  initialPrefs?: {
    goalAmount: number | null
    completedAt: string | null
  }
  onComplete?: () => void // If provided, this is editing mode - show close button
  initialStep?: number // Optional: start at a specific step (e.g., 1 for goal step when editing from Pro)
}

export function Wizard({ companyId, initialPrefs, onComplete, initialStep }: WizardProps) {
  const [step, setStep] = useState(initialStep ?? 0) // 0: Welcome, 1: Goal, 2: Compare
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

  // If editing mode and Pro, save goal directly without showing Compare step
  const handleGoalSave = async () => {
    if (isEditingMode && onComplete) {
      // In editing mode for Pro users, just save the goal and close
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

        // Success - close the modal and refresh
        onComplete()
        window.location.reload()
      } catch (err) {
        console.error('[Onboarding] Error saving goal:', err)
        setError(err instanceof Error ? err.message : 'Failed to save goal')
      } finally {
        setLoading(false)
      }
    } else {
      // Normal flow - go to compare step
      await handleNext()
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

  const isEditingMode = !!onComplete

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-slate-950/80 dark:from-black/90 dark:via-slate-900/70 dark:to-black/90" />
      
      <Card className="relative w-full max-w-[640px] max-h-[90vh] rounded-2xl border shadow-2xl bg-background/95 backdrop-blur-sm flex flex-col overflow-hidden">
        {/* Close button - only show when editing (not first-time onboarding) */}
        {isEditingMode && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-3 top-3 z-10 h-8 w-8"
            onClick={() => onComplete?.()}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        
        <CardContent className="p-5 md:p-6 flex flex-col flex-1 overflow-y-auto">
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mb-4 flex-shrink-0">
            {[0, 1, 2].map((s) => (
              <div
                key={s}
                className={`h-1.5 w-6 rounded-full transition-colors ${
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
            <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 p-2.5 text-sm text-destructive flex-shrink-0">
              {error}
            </div>
          )}

          {/* Step content */}
          <div className="flex-1 min-h-0">
            {step === 0 && <StepWelcome />}
            {step === 1 && <StepGoal goalAmount={goalAmount} onGoalChange={setGoalAmount} />}
            {step === 2 && !isEditingMode && (
              <StepCompare
                onChooseFree={() => handleFinish('free')}
                onChoosePro={() => handleFinish('pro')}
              />
            )}
          </div>
        </CardContent>

        <CardFooter className="flex justify-between px-5 md:px-6 pb-5 md:pb-6 flex-shrink-0 border-t">
          {!isEditingMode && (
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 0 || loading}
              className="border-2 hover:bg-muted/50 transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}

          {step === 1 && isEditingMode ? (
            <Button 
              onClick={handleGoalSave} 
              disabled={loading}
              className="ml-auto bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-500 hover:to-sky-600 hover:shadow-[0_0_30px_rgba(56,189,248,0.35)] text-white font-medium shadow-lg shadow-cyan-500/20 transition-all duration-300"
            >
              {loading ? 'Saving...' : 'Save Goal'}
            </Button>
          ) : step < 2 ? (
            <Button 
              onClick={handleNext} 
              disabled={loading}
              className={`bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-500 hover:to-sky-600 hover:shadow-[0_0_30px_rgba(56,189,248,0.35)] text-white font-medium shadow-lg shadow-cyan-500/20 transition-all duration-300 ${isEditingMode ? 'ml-auto' : ''}`}
            >
              {step === 0 ? 'Get started' : 'Next'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <div className={isEditingMode ? 'w-0' : 'w-24'} />
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
