'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Target, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Wizard } from './onboarding/Wizard'
// Simple relative time formatter
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) !== 1 ? 's' : ''} ago`
}

interface GoalProgressProps {
  goalAmount: number | null
  revenueThisMonth: number
  lastSyncAt: Date | null
  companyId: string
}

export function GoalProgress({ goalAmount, revenueThisMonth, lastSyncAt, companyId }: GoalProgressProps) {
  const [showGoalWizard, setShowGoalWizard] = useState(false)

  // Check if data is fresh (< 24 hours old)
  const isDataFresh = lastSyncAt ? (Date.now() - new Date(lastSyncAt).getTime()) < 24 * 60 * 60 * 1000 : false

  // Format relative time
  const relativeTime = lastSyncAt ? formatRelativeTime(new Date(lastSyncAt)) : 'Never'

  // If no goal set, show prompt to set one
  if (!goalAmount) {
    return (
      <>
        <Card className="border-dashed border-2 bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Set your monthly revenue goal</p>
                  <p className="text-xs text-muted-foreground">Track your progress and stay motivated</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setShowGoalWizard(true)}
                className="bg-gradient-to-r from-cyan-400 to-sky-500 hover:shadow-[0_0_30px_rgba(56,189,248,0.35)]"
              >
                <Target className="mr-2 h-4 w-4" />
                Set Goal
              </Button>
            </div>
          </CardContent>
        </Card>

        {showGoalWizard && (
          <Wizard
            companyId={companyId}
            initialPrefs={{ goalAmount: null, completedAt: null }}
            onComplete={() => {
              setShowGoalWizard(false)
              window.location.reload()
            }}
          />
        )}
      </>
    )
  }

  // Calculate progress
  const percent = Math.min(Math.max(revenueThisMonth / goalAmount, 0), 1)
  const amountRemaining = Math.max(goalAmount - revenueThisMonth, 0)
  const isGoalReached = revenueThisMonth >= goalAmount

  return (
    <Card className="border bg-background/50 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1">
            {isGoalReached ? (
              <p className="text-sm font-semibold text-foreground">
                Goal reached 🎉
              </p>
            ) : (
              <p className="text-sm font-semibold text-foreground">
                You're ${amountRemaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} away from your monthly goal
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Last synced {relativeTime}</span>
            {isDataFresh && (
              <>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="text-green-600 dark:text-green-400 font-medium">LIVE</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative h-3 rounded-full bg-slate-200/40 dark:bg-slate-800/40 overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-700 ease-out ${
              percent >= 0.75 ? 'shadow-lg shadow-cyan-500/50 ring-2 ring-cyan-400/30' : ''
            }`}
            style={{ width: `${percent * 100}%` }}
          />
          {percent >= 0.75 && !isGoalReached && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent animate-pulse" />
          )}
        </div>

        {/* Progress Text */}
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>
            ${revenueThisMonth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ${goalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="font-medium text-foreground">
            {(percent * 100).toFixed(1)}%
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

