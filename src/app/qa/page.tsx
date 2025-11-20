/**
 * QA / Visual Regression Testing Page
 * Renders all core components in both light and dark mode for visual testing
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DashboardView } from '@/components/dashboard-view'
import { LockedCard } from '@/components/locked-card'
import { ModernChart } from '@/components/modern-chart'
import { InsightsPanel } from '@/components/insights/InsightsPanel'
import { UserProfileMenu } from '@/components/user-profile-menu'
import { GoalProgress } from '@/components/goal-progress'
import { UpsellModal } from '@/components/upsell/UpsellModal'
import { ProWelcomeModal } from '@/components/pro-welcome/ProWelcomeModal'
import { ExperienceDashboardCard } from '@/components/experience-dashboard-card'
import { StepWelcome } from '@/components/onboarding/StepWelcome'
import { StepGoal } from '@/components/onboarding/StepGoal'
import { StepCompare } from '@/components/onboarding/StepCompare'
import { cn } from '@/lib/utils'
import type { DashboardData } from '@/lib/metrics'

// Mock data for testing
const mockDashboardData: DashboardData = {
  companyId: 'biz_test_123',
  hasData: true,
  series: [
    { date: new Date('2025-11-11'), grossRevenue: 1000, activeMembers: 50, newMembers: 5, cancellations: 1, trialsPaid: 2 },
    { date: new Date('2025-11-12'), grossRevenue: 1200, activeMembers: 52, newMembers: 3, cancellations: 1, trialsPaid: 1 },
    { date: new Date('2025-11-13'), grossRevenue: 1500, activeMembers: 54, newMembers: 4, cancellations: 0, trialsPaid: 3 },
    { date: new Date('2025-11-14'), grossRevenue: 1800, activeMembers: 57, newMembers: 5, cancellations: 2, trialsPaid: 2 },
    { date: new Date('2025-11-15'), grossRevenue: 2000, activeMembers: 60, newMembers: 6, cancellations: 1, trialsPaid: 4 },
    { date: new Date('2025-11-16'), grossRevenue: 2200, activeMembers: 63, newMembers: 5, cancellations: 0, trialsPaid: 3 },
    { date: new Date('2025-11-17'), grossRevenue: 2500, activeMembers: 65, newMembers: 4, cancellations: 1, trialsPaid: 2 },
  ],
  kpis: {
    grossRevenue: 12200,
    activeMembers: 65,
    newMembers: 32,
    cancellations: 6,
    trialsPaid: 17,
    latestDate: new Date('2025-11-17').toISOString(),
    isDataFresh: true,
  },
}

const mockEmptyDashboardData: DashboardData = {
  companyId: 'biz_test_empty',
  hasData: false,
  series: [],
  kpis: {
    grossRevenue: 0,
    activeMembers: 0,
    newMembers: 0,
    cancellations: 0,
    trialsPaid: 0,
    latestDate: null,
    isDataFresh: false,
  },
}

export default function QAPage() {
  const [darkMode, setDarkMode] = useState(false)
  const [upsellOpen, setUpsellOpen] = useState(false)
  const [proWelcomeOpen, setProWelcomeOpen] = useState(false)

  return (
    <div className={cn("min-h-screen transition-colors", darkMode ? "dark" : "")}>
      <div className={cn(
        "min-h-screen bg-gradient-to-br",
        "from-neutral-50 via-white to-neutral-50",
        "dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950"
      )}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
          {/* Header with theme toggle */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">QA / Visual Regression Testing</h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">
                Testing all components in {darkMode ? 'dark' : 'light'} mode
              </p>
            </div>
            <Button
              onClick={() => setDarkMode(!darkMode)}
              variant="outline"
              className="border-2"
            >
              {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
            </Button>
          </div>

          {/* Component Grid */}
          <div className="space-y-12">
            {/* Dashboard View */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-neutral-900 dark:text-neutral-50">Dashboard View</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-neutral-700 dark:text-neutral-200">With Data</h3>
                  <DashboardView data={mockDashboardData} plan="free" companyId="biz_test_123" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-neutral-700 dark:text-neutral-200">Empty State</h3>
                  <DashboardView data={mockEmptyDashboardData} plan="free" companyId="biz_test_empty" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-neutral-700 dark:text-neutral-200">Pro Plan</h3>
                  <DashboardView data={mockDashboardData} plan="pro" companyId="biz_test_123" />
                </div>
              </div>
            </section>

            {/* Locked Cards */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-neutral-900 dark:text-neutral-50">Locked Cards</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <LockedCard
                  title="Active Members (Pro)"
                  subtitle="See how many paying members are active today (Pro)"
                  companyId="biz_test_123"
                />
                <LockedCard
                  title="Trials Converted (Pro)"
                  subtitle="Track trial conversions to paid (Pro)"
                  companyId="biz_test_123"
                />
                <LockedCard
                  title="Top Customers (Pro)"
                  subtitle="Identify your best customers (Pro)"
                  companyId="biz_test_123"
                />
              </div>
            </section>

            {/* Chart */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-neutral-900 dark:text-neutral-50">Modern Chart</h2>
              <ModernChart data={mockDashboardData.series} />
            </section>

            {/* Insights Panel */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-neutral-900 dark:text-neutral-50">Insights Panel</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-neutral-700 dark:text-neutral-200">Free Plan</h3>
                  <InsightsPanel data={mockDashboardData} plan="free" goalAmount={5000} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-neutral-700 dark:text-neutral-200">Pro Plan</h3>
                  <InsightsPanel data={mockDashboardData} plan="pro" goalAmount={5000} />
                </div>
              </div>
            </section>

            {/* User Profile Menu */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-neutral-900 dark:text-neutral-50">User Profile Menu</h2>
              <div className="flex gap-4">
                <UserProfileMenu
                  companyId="biz_test_123"
                  username="Test User"
                  plan="free"
                  prefs={{ goalAmount: 5000, completedAt: new Date().toISOString() }}
                />
                <UserProfileMenu
                  companyId="biz_test_123"
                  username="Pro User"
                  plan="pro"
                  prefs={{ goalAmount: 10000, completedAt: new Date().toISOString() }}
                />
              </div>
            </section>

            {/* Goal Progress */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-neutral-900 dark:text-neutral-50">Goal Progress</h2>
              <div className="space-y-4">
                <GoalProgress
                  goalAmount={5000}
                  revenueThisMonth={3500}
                  lastSyncAt={new Date()}
                  companyId="biz_test_123"
                />
                <GoalProgress
                  goalAmount={10000}
                  revenueThisMonth={12000}
                  lastSyncAt={new Date()}
                  companyId="biz_test_123"
                />
                <GoalProgress
                  goalAmount={null}
                  revenueThisMonth={0}
                  lastSyncAt={null}
                  companyId="biz_test_123"
                />
              </div>
            </section>

            {/* Onboarding Steps */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-neutral-900 dark:text-neutral-50">Onboarding Steps</h2>
              <div className="grid gap-6 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Step Welcome</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <StepWelcome />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Step Goal</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <StepGoal goalAmount={5000} onGoalChange={() => {}} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Step Compare</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <StepCompare onChooseFree={() => {}} onChoosePro={() => {}} />
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Experience Dashboard Card */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-neutral-900 dark:text-neutral-50">Experience Dashboard Card</h2>
              <ExperienceDashboardCard
                companyId="biz_test_123"
                experienceName="Test Experience"
                redirectHref="/dashboard/{companyId}"
              />
            </section>

            {/* Modals */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-neutral-900 dark:text-neutral-50">Modals</h2>
              <div className="flex gap-4">
                <Button onClick={() => setUpsellOpen(true)}>Open Upsell Modal</Button>
                <Button onClick={() => setProWelcomeOpen(true)}>Open Pro Welcome Modal</Button>
              </div>
              <UpsellModal open={upsellOpen} onClose={() => setUpsellOpen(false)} />
              <ProWelcomeModal open={proWelcomeOpen} onClose={() => setProWelcomeOpen(false)} />
            </section>

            {/* Badges */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-neutral-900 dark:text-neutral-50">Badges</h2>
              <div className="flex flex-wrap gap-4">
                <Badge variant="default">Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 border-0">
                  <span className="mr-1">👑</span>
                  Pro Plan
                </Badge>
              </div>
            </section>

            {/* Cards */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-neutral-900 dark:text-neutral-50">Cards</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Card Title</CardTitle>
                    <CardDescription>Card description text</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">
                      Card content with proper dark mode contrast
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle>Bordered Card</CardTitle>
                    <CardDescription>Card with border-2</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">
                      This card has a thicker border
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardHeader>
                    <CardTitle>Muted Card</CardTitle>
                    <CardDescription>Card with muted background</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">
                      This card uses muted background
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Buttons */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-neutral-900 dark:text-neutral-50">Buttons</h2>
              <div className="flex flex-wrap gap-4">
                <Button variant="default">Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button className="bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-500 hover:to-sky-600 text-white">
                  Gradient
                </Button>
              </div>
            </section>

            {/* Text Colors */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-neutral-900 dark:text-neutral-50">Text Colors</h2>
              <div className="space-y-2">
                <p className="text-neutral-900 dark:text-neutral-50">Primary text (neutral-900 / neutral-50)</p>
                <p className="text-neutral-700 dark:text-neutral-200">Secondary text (neutral-700 / neutral-200)</p>
                <p className="text-neutral-600 dark:text-neutral-300">Tertiary text (neutral-600 / neutral-300)</p>
                <p className="text-neutral-500 dark:text-neutral-400">Muted text (neutral-500 / neutral-400)</p>
                <p className="text-muted-foreground">Muted foreground (theme-aware)</p>
                <p className="text-foreground">Foreground (theme-aware)</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

