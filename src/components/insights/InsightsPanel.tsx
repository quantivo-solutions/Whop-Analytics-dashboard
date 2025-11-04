'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Lock, TrendingUp, TrendingDown, Users, DollarSign } from 'lucide-react'
import { UpsellModal } from '../upsell/UpsellModal'
import { LockedCard } from '../locked-card'
import { isFree } from '@/lib/plan'
import { useState } from 'react'
import type { DashboardData } from '@/lib/metrics'

interface InsightsPanelProps {
  data: DashboardData
  plan: 'free' | 'pro' | 'business'
  goalAmount?: number | null
}

export function InsightsPanel({ data, plan, goalAmount }: InsightsPanelProps) {
  const [upsellOpen, setUpsellOpen] = useState(false)
  const isFreePlan = isFree(plan)

  // Trial Conversion (Free)
  const trialConversion = (() => {
    if (!data.hasData || data.kpis.trialsPaid === 0) {
      return { value: 0, label: 'No trials yet', badge: 'neutral' as const }
    }
    
    // Sum total trials started and paid from series
    const totalTrialsStarted = data.series.reduce((sum, d) => sum + (d.trialsPaid || 0), 0)
    const totalTrialsPaid = data.kpis.trialsPaid
    
    // For simplicity, estimate trials started as trials paid + some buffer
    // In real app, would track trialsStarted separately
    const conversionRate = totalTrialsStarted > 0 
      ? (totalTrialsPaid / totalTrialsStarted) * 100 
      : 0
    
    if (conversionRate >= 50) {
      return { value: conversionRate, label: `${conversionRate.toFixed(1)}% conversion`, badge: 'good' as const }
    } else if (conversionRate >= 20) {
      return { value: conversionRate, label: `${conversionRate.toFixed(1)}% conversion`, badge: 'watch' as const }
    } else {
      return { value: conversionRate, label: `${conversionRate.toFixed(1)}% conversion`, badge: 'action' as const }
    }
  })()

  // Churn Risk (Pro only)
  const churnRisk = (() => {
    if (plan !== 'pro' && plan !== 'business') {
      return { locked: true, label: 'Pro feature', badge: null as any }
    }

    if (!data.hasData || data.series.length < 7) {
      return { locked: false, value: 'Low', label: 'Insufficient data', badge: 'neutral' as const }
    }

    // Get last 7 days cancellations
    const last7Days = data.series.slice(-7)
    const recentCancellations = last7Days.reduce((sum, d) => sum + d.cancellations, 0)

    // Get median of prior 3 weeks (if available)
    const priorWeeks = data.series.slice(-28, -7)
    const priorCancellations = priorWeeks.reduce((sum, d) => sum + d.cancellations, 0)
    const priorAvg = priorWeeks.length > 0 ? priorCancellations / priorWeeks.length * 7 : 0

    if (recentCancellations > priorAvg * 1.5) {
      return { locked: false, value: 'High', label: 'Elevated cancellation rate', badge: 'action' as const }
    } else if (recentCancellations > priorAvg * 1.2) {
      return { locked: false, value: 'Medium', label: 'Slightly elevated', badge: 'watch' as const }
    } else {
      return { locked: false, value: 'Low', label: 'Normal cancellation rate', badge: 'good' as const }
    }
  })()

  // Revenue Velocity (Free)
  const revenueVelocity = (() => {
    if (!data.hasData || data.series.length < 14) {
      return { value: 0, label: 'Insufficient data', badge: 'neutral' as const }
    }

    const last14Days = data.series.slice(-14)
    const firstHalf = last14Days.slice(0, 7)
    const secondHalf = last14Days.slice(7)

    const firstHalfAvg = firstHalf.reduce((sum, d) => sum + d.grossRevenue, 0) / firstHalf.length
    const secondHalfAvg = secondHalf.reduce((sum, d) => sum + d.grossRevenue, 0) / secondHalf.length

    const velocity = ((secondHalfAvg - firstHalfAvg) / Math.max(firstHalfAvg, 1)) * 100

    if (velocity > 10) {
      return { value: velocity, label: `+${velocity.toFixed(1)}% growth`, badge: 'good' as const }
    } else if (velocity > -5) {
      return { value: velocity, label: `${velocity >= 0 ? '+' : ''}${velocity.toFixed(1)}% change`, badge: 'watch' as const }
    } else {
      return { value: velocity, label: `${velocity.toFixed(1)}% decline`, badge: 'action' as const }
    }
  })()

  // Top Customers (Pro feature - placeholder for now)
  // In future, this would analyze individual customer revenue from Whop API
  const topCustomers = (() => {
    if (plan !== 'pro' && plan !== 'business') {
      return { locked: true, value: '—', label: 'Pro feature', badge: null as any }
    }

    // Placeholder: Calculate from aggregate data
    // In a real implementation, we'd fetch individual customer data from Whop API
    if (!data.hasData) {
      return { locked: false, value: '—', label: 'No data yet', badge: 'neutral' as const }
    }

    // Simple estimate: active members = potential top customers
    const estimatedCustomers = data.kpis.activeMembers
    return {
      locked: false,
      value: estimatedCustomers > 0 ? estimatedCustomers.toString() : '—',
      label: estimatedCustomers > 0 ? 'Active members' : 'No active members',
      badge: 'good' as const,
    }
  })()

  const getBadgeVariant = (badge: 'good' | 'watch' | 'action' | 'neutral') => {
    switch (badge) {
      case 'good':
        return 'default'
      case 'watch':
        return 'secondary'
      case 'action':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  // If Free plan, show locked insights cards
  if (isFreePlan) {
    return (
      <>
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight mb-2">Insights</h2>
          <p className="text-muted-foreground">
            Unlock advanced analytics with Pro
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <LockedCard
            title="Churn Risk (Pro)"
            subtitle="Spot churn before it happens (Pro)"
            companyId={data.companyId}
          />
          <LockedCard
            title="Trial Conversion (Pro)"
            subtitle="See where trials drop off (Pro)"
            companyId={data.companyId}
          />
          <LockedCard
            title="Top Customers (Pro)"
            subtitle="Identify your best customers (Pro)"
            companyId={data.companyId}
          />
        </div>

        <UpsellModal open={upsellOpen} onClose={() => setUpsellOpen(false)} />
      </>
    )
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight mb-2">Insights</h2>
        <p className="text-muted-foreground">
          Key metrics and alerts to help you grow your business
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Trial Conversion */}
        <Card className="relative">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Trial Conversion</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">{trialConversion.value.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground">{trialConversion.label}</p>
              <Badge variant={getBadgeVariant(trialConversion.badge)} className="text-xs">
                {trialConversion.badge === 'good' ? 'Good' : trialConversion.badge === 'watch' ? 'Watch' : 'Action'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Churn Risk */}
        <Card className={`relative border-2 border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-lg transition-all duration-300 ${churnRisk.locked ? 'opacity-75' : ''}`}>
          {churnRisk.locked && (
            <div className="absolute inset-0 bg-background/95 dark:bg-slate-950/95 backdrop-blur-md rounded-lg flex items-center justify-center z-10">
              <div className="text-center space-y-3 p-4">
                <div className="p-3 rounded-full bg-muted/80 dark:bg-slate-800/80 mx-auto w-fit">
                  <Lock className="h-6 w-6 text-slate-600 dark:text-slate-400" />
                </div>
                <p className="text-sm font-semibold">Pro feature</p>
                <Button
                  size="sm"
                  onClick={() => setUpsellOpen(true)}
                  className="bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-500 hover:to-sky-600 hover:shadow-[0_0_30px_rgba(56,189,248,0.35)] text-white font-medium shadow-lg shadow-cyan-500/20 transition-all duration-300"
                >
                  Upgrade to unlock
                </Button>
              </div>
            </div>
          )}
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Churn Risk</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {!churnRisk.locked ? (
              <div className="space-y-2">
                <p className="text-2xl font-bold">{churnRisk.value}</p>
                <p className="text-sm text-muted-foreground">{churnRisk.label}</p>
                <Badge variant={getBadgeVariant(churnRisk.badge)} className="text-xs">
                  {churnRisk.badge === 'good' ? 'Good' : churnRisk.badge === 'watch' ? 'Watch' : 'Action'}
                </Badge>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-2xl font-bold text-muted-foreground">—</p>
                <p className="text-sm text-muted-foreground">Locked</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue Velocity */}
        <Card className="relative border-2 border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Revenue Velocity</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">
                {revenueVelocity.value >= 0 ? '+' : ''}{revenueVelocity.value.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">{revenueVelocity.label}</p>
              <Badge variant={getBadgeVariant(revenueVelocity.badge)} className="text-xs">
                {revenueVelocity.badge === 'good' ? 'Growing' : revenueVelocity.badge === 'watch' ? 'Stable' : 'Declining'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card className={`relative border-2 border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-lg transition-all duration-300 ${topCustomers.locked ? 'opacity-75' : ''}`}>
          {topCustomers.locked && (
            <div className="absolute inset-0 bg-background/95 dark:bg-slate-950/95 backdrop-blur-md rounded-lg flex items-center justify-center z-10">
              <div className="text-center space-y-3 p-4">
                <div className="p-3 rounded-full bg-muted/80 dark:bg-slate-800/80 mx-auto w-fit">
                  <Lock className="h-6 w-6 text-slate-600 dark:text-slate-400" />
                </div>
                <p className="text-sm font-semibold">Pro feature</p>
                <Button
                  size="sm"
                  onClick={() => setUpsellOpen(true)}
                  className="bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-500 hover:to-sky-600 hover:shadow-[0_0_30px_rgba(56,189,248,0.35)] text-white font-medium shadow-lg shadow-cyan-500/20 transition-all duration-300"
                >
                  Upgrade to unlock
                </Button>
              </div>
            </div>
          )}
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Top Customers</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {!topCustomers.locked ? (
              <div className="space-y-2">
                <p className="text-2xl font-bold">{topCustomers.value}</p>
                <p className="text-sm text-muted-foreground">{topCustomers.label}</p>
                {topCustomers.badge && (
                  <Badge variant={getBadgeVariant(topCustomers.badge)} className="text-xs">
                    {topCustomers.badge === 'good' ? 'Active' : 'N/A'}
                  </Badge>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-2xl font-bold text-muted-foreground">—</p>
                <p className="text-sm text-muted-foreground">Locked</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <UpsellModal open={upsellOpen} onClose={() => setUpsellOpen(false)} />
    </>
  )
}

