/**
 * Discover / Marketing Page
 * Polished landing page for Whoplytics
 */

import { Metadata } from 'next'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/page-header'
import { WhoplyticsLogo } from '@/components/whoplytics-logo'
import { TrendingUp, BarChart3, Bell, Target, Zap, FileText, ExternalLink, CheckCircle2 } from 'lucide-react'
import { env } from '@/lib/env'

export const metadata: Metadata = {
  title: 'Whoplytics - Business insights for your Whop',
  description: 'Track growth, churn, and goals in one place. Real-time revenue and member insights for Whop creators.',
  openGraph: {
    title: 'Whoplytics - Business insights for your Whop',
    description: 'Track growth, churn, and goals in one place. Real-time revenue and member insights for Whop creators.',
  },
}

const PRODUCT_NAME = 'Whoplytics'
const TAGLINE = 'Business insights for your Whop — track growth, churn, and goals in one place.'
const PRO_PRICE = '$15/mo'
const FREE_FEATURES = [
  '7-day dashboard history',
  'Core KPIs (Revenue, New Members, Cancellations)',
  'Weekly email summary'
]
const PRO_FEATURES = [
  '90-day history',
  'Daily email reports',
  'Churn risk insights',
  'Trial conversion analysis',
  'Discord alerts',
  'CSV export'
]

export default function DiscoverPage() {
  const appId = env.NEXT_PUBLIC_WHOP_APP_ID
  const whopInstallUrl = appId ? `https://whop.com/apps/${appId}` : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl">
        <PageHeader title="Whoplytics" subtitle={TAGLINE} />
        
        {/* Hero section */}
        <div className="max-w-4xl mx-auto text-center mb-20 mt-12">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            {PRODUCT_NAME}
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {TAGLINE}
          </p>

          {/* Install button */}
          {whopInstallUrl ? (
            <a href={whopInstallUrl} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="gap-2 text-lg px-8 py-6 h-auto">
                Install on Whop <ExternalLink className="h-5 w-5" />
              </Button>
            </a>
          ) : (
            <Button size="lg" disabled className="gap-2 text-lg px-8 py-6 h-auto">
              App ID not configured
            </Button>
          )}

          {/* Social proof placeholder */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Trusted by creators</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Real-time insights</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Free to start</span>
            </div>
          </div>
        </div>

        {/* Features grid */}
        <div className="max-w-6xl mx-auto mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Everything you need to grow</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Live KPIs at a glance</h3>
                <p className="text-sm text-muted-foreground">
                  See revenue, new members, cancellations, and more in one clean dashboard. Real-time updates via secure webhooks.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Clear goals & progress</h3>
                <p className="text-sm text-muted-foreground">
                  Set your monthly revenue goal and track progress with an animated progress bar. Know exactly how close you are.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                  <Bell className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Weekly & Daily reports</h3>
                <p className="text-sm text-muted-foreground">
                  Free includes weekly summaries. Pro unlocks daily email reports with insights delivered to your inbox.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Smart insights</h3>
                <p className="text-sm text-muted-foreground">
                  Churn risk detection and trial conversion analysis help you spot trends before they become problems.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Clean 7–90 day trends</h3>
                <p className="text-sm text-muted-foreground">
                  Free gets 7 days of history. Pro unlocks 90 days of trend data to see long-term patterns.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Export your data</h3>
                <p className="text-sm text-muted-foreground">
                  Pro users can export historical data as CSV for deeper analysis or record-keeping.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Pricing comparison */}
        <div className="max-w-4xl mx-auto mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Simple, transparent pricing</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Free Plan */}
            <Card className="border-2">
              <CardContent className="pt-8 pb-8">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2">Free</h3>
                  <div className="text-4xl font-bold mb-1">$0</div>
                  <p className="text-sm text-muted-foreground">per month</p>
                </div>
                <ul className="space-y-3 text-sm">
                  {FREE_FEATURES.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="border-2 border-primary shadow-lg relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                  POPULAR
                </span>
              </div>
              <CardContent className="pt-8 pb-8">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2">Pro</h3>
                  <div className="text-4xl font-bold mb-1">{PRO_PRICE}</div>
                  <p className="text-sm text-muted-foreground">per month</p>
                </div>
                <ul className="space-y-3 text-sm">
                  {PRO_FEATURES.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently asked questions</h2>
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">What data do you access?</h3>
                <p className="text-sm text-muted-foreground">
                  Only membership and payment metadata through Whop webhooks (no card numbers). We process revenue amounts, member counts, cancellations, and trial conversions to generate your analytics.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">Does it work without sales yet?</h3>
                <p className="text-sm text-muted-foreground">
                  Yes — you'll see an empty state until your first member or payment, then data fills in automatically. The dashboard is ready whenever you're ready to start tracking.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
                <p className="text-sm text-muted-foreground">
                  Yes, via Whop. Your plan and billing are handled by Whop, so you can cancel your Pro subscription at any time through your Whop account settings.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">How often is data updated?</h3>
                <p className="text-sm text-muted-foreground">
                  Events are near-real-time via webhooks. Pro adds daily summaries by email and optional Discord alerts so you never miss important changes.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Secondary CTA */}
        {whopInstallUrl && (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to get started?</h2>
            <p className="text-muted-foreground mb-6">
              Connect once and get instant insights into your Whop business.
            </p>
            <a href={whopInstallUrl} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="gap-2">
                Install on Whop <ExternalLink className="h-5 w-5" />
              </Button>
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
