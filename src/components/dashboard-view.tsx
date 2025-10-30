/**
 * Reusable Dashboard View Component
 * Used across all dashboard pages (main, experience-scoped, company-scoped)
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, Users, UserPlus, UserMinus, CheckCircle, TrendingUp, TrendingDown, Info, Zap, Activity } from 'lucide-react'
import type { DashboardData } from '@/lib/metrics'
import type { Plan } from '@/lib/plan'
import { getPlanFeatures, hasPro } from '@/lib/plan'
import { ProFeatureLock } from './pro-feature-lock'
import { ModernChart } from './modern-chart'

interface DashboardViewProps {
  data: DashboardData
  showBadge?: boolean
  badgeType?: 'live' | 'stale'
  plan?: Plan
  upgradeUrl?: string
}

export function DashboardView({ data, showBadge = true, badgeType, plan = 'free', upgradeUrl }: DashboardViewProps) {
  const { kpis, series, hasData } = data

  // Determine badge type if not explicitly provided
  const effectiveBadgeType = badgeType ?? (kpis.isDataFresh ? 'live' : 'stale')
  
  // Get plan features
  const features = getPlanFeatures(plan)
  const isPro = hasPro(plan)

  // Format date range for display
  const dateRange = series.length > 0
    ? `${new Date(series[0].date).toLocaleDateString()} - ${new Date(series[series.length - 1].date).toLocaleDateString()}`
    : 'No data'

  // Build stats data
  const statsData = [
    {
      title: 'Gross Revenue',
      value: `$${kpis.grossRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      description: kpis.latestDate ? `as of ${new Date(kpis.latestDate).toLocaleDateString()}` : 'no data yet',
      icon: DollarSign,
      trend: 'up' as const,
    },
    {
      title: 'Active Members',
      value: kpis.activeMembers.toLocaleString(),
      description: 'currently active',
      icon: Users,
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
    {
      title: 'Trials Paid',
      value: kpis.trialsPaid.toLocaleString(),
      description: 'converted to paid',
      icon: CheckCircle,
      trend: 'up' as const,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header with status badge */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Analytics
            </h1>
            {showBadge && effectiveBadgeType === 'live' && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Live Data
              </span>
            )}
          </div>
          <p className="text-muted-foreground">
            {hasData 
              ? `Real-time insights from your Whop business` 
              : 'Waiting for your first customer'
            }
          </p>
        </div>
        
        {kpis.latestDate && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Last updated</p>
            <p className="text-sm font-medium">{new Date(kpis.latestDate).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>
        )}
      </div>

      {/* Empty state */}
      {!hasData && (
        <Card className="border-dashed border-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-xl opacity-20 animate-pulse" />
              <div className="relative rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-6 border border-blue-500/20">
                <Activity className="h-12 w-12 text-blue-500" />
              </div>
            </div>
            
            <h3 className="text-2xl font-bold mb-2">No activity yet</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              Your analytics will appear here as soon as customers start joining your Whop.
              Data syncs automatically in real-time via webhooks.
            </p>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span>Waiting for your first member or payment...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats cards with stagger animation */}
      {hasData && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {statsData.map((stat, index) => {
            const Icon = stat.icon
            const colors = [
              'from-green-500/10 to-emerald-500/10 border-green-500/20 text-green-600',
              'from-blue-500/10 to-cyan-500/10 border-blue-500/20 text-blue-600',
              'from-purple-500/10 to-indigo-500/10 border-purple-500/20 text-purple-600',
              'from-orange-500/10 to-red-500/10 border-orange-500/20 text-orange-600',
              'from-pink-500/10 to-rose-500/10 border-pink-500/20 text-pink-600',
            ]
            
            return (
              <Card 
                key={index} 
                className={`relative overflow-hidden bg-gradient-to-br ${colors[index]} border group hover:shadow-lg hover:scale-105 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4`}
                style={{ 
                  animationDelay: `${index * 100}ms`,
                  animationFillMode: 'backwards'
                }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {stat.title}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground group-hover:scale-110 transition-transform" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-1">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
                
                {/* Subtle shine effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
              </Card>
            )
          })}
        </div>
      )}

      {/* Modern Charts */}
      {hasData && (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700" style={{ animationDelay: '600ms', animationFillMode: 'backwards' }}>
          <ModernChart data={series} />
        </div>
      )}

      {/* Pro features section */}
      {hasData && !isPro && upgradeUrl && (
        <div className="mt-8">
          <ProFeatureLock
            title="Daily Trend Breakdown"
            description="Unlock daily email reports, Discord alerts, and advanced insights with Pro."
            upgradeUrl={upgradeUrl}
          />
        </div>
      )}

      {/* Feature availability note */}
      {hasData && (
        <div className="mt-4 text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
          <Info className="h-3 w-3" />
          {features.dailyEmail ? (
            <span>Daily reports enabled (Pro)</span>
          ) : (
            <span>Daily reports are Pro-only. Weekly reports are free for all users.</span>
          )}
        </div>
      )}
    </div>
  )
}

