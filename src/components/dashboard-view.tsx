'use client'

/**
 * Reusable Dashboard View Component
 * Used across all dashboard pages (main, experience-scoped, company-scoped)
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, Users, UserPlus, UserMinus, CheckCircle, TrendingUp, TrendingDown, Info, Zap, Activity, Download } from 'lucide-react'
import type { DashboardData } from '@/lib/metrics'
import type { Plan } from '@/lib/plan'
import { getPlanFeatures, hasPro, isPro, isFree } from '@/lib/plan'
import { ProFeatureLock } from './pro-feature-lock'
import { ModernChart } from './modern-chart'
import { Button } from './ui/button'
import { UpsellModal } from './upsell/UpsellModal'
import { LockedCard } from './locked-card'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface DashboardViewProps {
  data: DashboardData
  showBadge?: boolean
  badgeType?: 'live' | 'stale'
  plan?: Plan
  upgradeUrl?: string
  companyId?: string
}

export function DashboardView({ data, showBadge = true, badgeType, plan = 'free', upgradeUrl, companyId }: DashboardViewProps) {
  const { kpis, series, hasData } = data
  const [upsellOpen, setUpsellOpen] = useState(false)

  // Determine badge type if not explicitly provided
  const effectiveBadgeType = badgeType ?? (kpis.isDataFresh ? 'live' : 'stale')
  
  // Get plan features
  const features = getPlanFeatures(plan)
  const isProPlan = isPro(plan)
  const isFreePlan = isFree(plan)

  // Format date range for display
  const dateRange = series.length > 0
    ? `${new Date(series[0].date).toLocaleDateString()} - ${new Date(series[series.length - 1].date).toLocaleDateString()}`
    : 'No data'

  // Build stats data - Free shows 3 KPIs, Pro shows all 5
  const freeStatsData = [
    {
      title: 'Gross Revenue',
      value: `$${kpis.grossRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      description: kpis.latestDate ? `as of ${new Date(kpis.latestDate).toLocaleDateString()}` : 'no data yet',
      icon: DollarSign,
      trend: 'up' as const,
    },
    {
      title: 'New Members',
      value: kpis.newMembers.toLocaleString(),
      description: 'joined recently',
      icon: UserPlus,
      trend: 'up' as const,
    },
    {
      title: 'Cancellations',
      value: kpis.cancellations.toLocaleString(),
      description: 'this period',
      icon: UserMinus,
      trend: 'down' as const,
    },
  ]

  const proStatsData = [
    ...freeStatsData,
    {
      title: 'Active Members',
      value: kpis.activeMembers.toLocaleString(),
      description: 'currently active',
      icon: Users,
      trend: 'up' as const,
    },
    {
      title: 'Trials Paid',
      value: kpis.trialsPaid.toLocaleString(),
      description: 'converted to paid',
      icon: CheckCircle,
      trend: 'up' as const,
    },
  ]

  const statsData = isProPlan ? proStatsData : freeStatsData

  return (
    <div className="space-y-6">
      {/* Status Badge - Frosted-UI Style */}
      {showBadge && hasData && effectiveBadgeType === 'live' && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-green-500/10 dark:bg-green-500/20 backdrop-blur-md border border-green-500/30 dark:border-green-500/40 rounded-xl px-4 py-3 animate-in fade-in slide-in-from-top duration-500">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            <span className="text-sm font-medium text-green-700 dark:text-green-300">Live Data</span>
          </div>
          {kpis.latestDate && (
            <span className="text-xs text-green-600 dark:text-green-400">
              Updated {new Date(kpis.latestDate).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          )}
        </div>
      )}

      {/* Empty state - Frosted-UI Style */}
      {!hasData && (
        <Card className="border-dashed border-2 border-border/50 bg-card/50 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-xl opacity-20 animate-pulse" />
              <div className="relative rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-6 border border-blue-500/20 backdrop-blur-sm">
                <Activity className="h-10 w-10 sm:h-12 sm:w-12 text-blue-500" />
              </div>
            </div>
            
            <h3 className="text-xl sm:text-2xl font-bold mb-2 text-foreground">No activity yet</h3>
            <p className="text-sm sm:text-base text-muted-foreground max-w-md mb-6">
              Your analytics will appear here as soon as customers start joining your Whop or making payments.
              Data syncs automatically via webhooks and daily cron jobs.
            </p>
            
            <div className="w-full max-w-md space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 backdrop-blur-sm rounded-lg px-4 py-2.5 border border-border/50">
                <Zap className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                <span>Waiting for your first member or payment...</span>
              </div>
              <div className="text-xs bg-blue-500/10 dark:bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 dark:border-blue-500/40 rounded-lg px-4 py-3">
                <p className="font-semibold text-blue-700 dark:text-blue-300 mb-1">💡 Note:</p>
                <p className="text-blue-600 dark:text-blue-400 leading-relaxed">
                  App installations are separate from analytics data. This dashboard tracks revenue, members, and payments in your Whop. 
                  If you just installed the app, data will appear once you have members or transactions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats cards - Frosted-UI Style */}
      {hasData && (
        <div className={`grid gap-3 sm:gap-4 ${isProPlan ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
          {statsData.map((stat, index) => {
            const Icon = stat.icon
            const iconColors = [
              'bg-green-500',
              'bg-blue-500',
              'bg-purple-500',
              'bg-orange-500',
              'bg-pink-500',
            ]
            
            return (
              <Card 
                key={index} 
                className={cn(
                  "relative overflow-hidden border border-border/50",
                  "bg-card/80 backdrop-blur-sm",
                  "hover:bg-card/90 hover:border-border hover:shadow-xl",
                  "transition-all duration-300 animate-in fade-in slide-in-from-bottom-2",
                  "shadow-lg"
                )}
                style={{ 
                  animationDelay: `${index * 50}ms`,
                  animationFillMode: 'backwards'
                }}
              >
                <CardContent className="p-4 sm:p-5 lg:p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`${iconColors[index]} rounded-lg p-2 sm:p-2.5 shadow-md`}>
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                      {stat.title}
                    </p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-1">{stat.value}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                      {stat.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          
          {/* Locked cards for Free plan */}
          {isFreePlan && (
            <>
              <LockedCard
                title="Active Members (Pro)"
                subtitle="See how many paying members are active today (Pro)"
                companyId={companyId}
              />
              <LockedCard
                title="Trials Converted (Pro)"
                subtitle="Track trial conversions to paid (Pro)"
                companyId={companyId}
              />
            </>
          )}
        </div>
      )}

      {/* Charts Section - Frosted-UI Style */}
      {hasData && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Revenue Trend</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {isFreePlan ? (
                  <>
                    Showing last {series.length} day{series.length !== 1 ? 's' : ''} —{' '}
                    <button
                      onClick={() => setUpsellOpen(true)}
                      className="text-primary hover:underline font-medium transition-colors"
                    >
                      Pro unlocks 90-day history
                    </button>
                  </>
                ) : (
                  <>
                    {series.length} day{series.length !== 1 ? 's' : ''} of data
                    {series.length >= 90 && ' (Extended history)'}
                  </>
                )}
              </p>
            </div>
            {isProPlan && companyId && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 w-full sm:w-auto"
                onClick={async () => {
                  try {
                    const url = `/api/export/csv?companyId=${companyId}&days=${series.length}`
                    const response = await fetch(url)
                    if (!response.ok) {
                      throw new Error('Failed to export CSV')
                    }
                    const blob = await response.blob()
                    const downloadUrl = window.URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = downloadUrl
                    a.download = `whoplytics-export-${companyId}-${new Date().toISOString().split('T')[0]}.csv`
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    window.URL.revokeObjectURL(downloadUrl)
                  } catch (error) {
                    console.error('Error exporting CSV:', error)
                    alert('Failed to export CSV. Please try again.')
                  }
                }}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export CSV</span>
                <span className="sm:hidden">Export</span>
              </Button>
            )}
          </div>
          <ModernChart data={series} kpis={{ newMembers: kpis.newMembers }} />
        </div>
      )}


      {/* Upsell Modal for CSV Export */}
      <UpsellModal open={upsellOpen} onClose={() => setUpsellOpen(false)} />
    </div>
  )
}

