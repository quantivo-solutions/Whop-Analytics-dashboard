'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'

interface WizardProps {
  companyId: string
  initialPrefs?: {
    goalAmount: number | null
    wantsDailyMail: boolean
    wantsDiscord: boolean
    completedAt: string | null
  }
  onComplete?: () => void
}

export function Wizard({ companyId, initialPrefs, onComplete }: WizardProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [goalAmount, setGoalAmount] = useState<number | null>(
    initialPrefs?.goalAmount ?? 1000
  )
  const [wantsDailyMail, setWantsDailyMail] = useState(
    initialPrefs?.wantsDailyMail ?? false
  )
  const [wantsDiscord, setWantsDiscord] = useState(
    initialPrefs?.wantsDiscord ?? false
  )

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1)
      setError(null)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
      setError(null)
    }
  }

  const handleFinish = async () => {
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
            wantsDailyMail,
            wantsDiscord,
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
      console.error('[Whoplytics] Wizard save error:', err)
      setError(err instanceof Error ? err.message : 'Failed to save preferences')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              {[1, 2, 3].map((s) => (
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
            <div className="text-sm text-muted-foreground">
              Step {step} of 3
            </div>
          </div>

          {step === 1 && (
            <>
              <CardTitle>Welcome to Whoplytics</CardTitle>
              <CardDescription>
                Get started with powerful analytics for your Whop business. We'll help you set up your preferences in just a few steps.
              </CardDescription>
            </>
          )}

          {step === 2 && (
            <>
              <CardTitle>Set your monthly revenue goal</CardTitle>
              <CardDescription>
                Having a goal helps us personalize your insights and track your progress.
              </CardDescription>
            </>
          )}

          {step === 3 && (
            <>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Choose how you'd like to receive updates about your business performance.
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <h4 className="font-semibold">What you'll get:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Real-time revenue and member tracking</li>
                  <li>Insights into trial conversion and churn risk</li>
                  <li>Automated reports via email or Discord</li>
                  <li>Goal tracking and progress monitoring</li>
                </ul>
              </div>
            </div>
          )}

          {step === 2 && (
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
                    setGoalAmount(value === '' ? null : Number(value))
                  }}
                  placeholder="1000"
                />
                <p className="text-xs text-muted-foreground">
                  You can change this later in your preferences.
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="weeklyEmail">Weekly email reports</Label>
                  <p className="text-xs text-muted-foreground">
                    Get a weekly summary of your business metrics (Free)
                  </p>
                </div>
                <Switch id="weeklyEmail" checked={true} disabled />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="dailyMail">Daily email reports</Label>
                  <p className="text-xs text-muted-foreground">
                    Receive daily updates (Pro feature)
                  </p>
                </div>
                <Switch
                  id="dailyMail"
                  checked={wantsDailyMail}
                  onCheckedChange={setWantsDailyMail}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="discord">Discord alerts</Label>
                  <p className="text-xs text-muted-foreground">
                    Get real-time alerts in Discord (Pro feature)
                  </p>
                </div>
                <Switch
                  id="discord"
                  checked={wantsDiscord}
                  onCheckedChange={setWantsDiscord}
                />
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1 || loading}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {step < 3 ? (
            <Button onClick={handleNext} disabled={loading}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={loading}>
              {loading ? 'Saving...' : 'Finish'}
              {!loading && <Check className="ml-2 h-4 w-4" />}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

