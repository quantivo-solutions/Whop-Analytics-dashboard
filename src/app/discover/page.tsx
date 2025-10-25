/**
 * Discover / Marketing Page
 * Simple landing page with Whop install button
 */

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, BarChart3, Bell, ExternalLink } from 'lucide-react'
import { env } from '@/lib/env'

export default function DiscoverPage() {
  const appId = env.NEXT_PUBLIC_WHOP_APP_ID
  const whopInstallUrl = appId ? `https://whop.com/apps/${appId}/install` : null

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="container mx-auto px-6 py-16">
        {/* Hero section */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <BarChart3 className="h-4 w-4" />
            Whop Analytics Dashboard
          </div>
          
          <h1 className="text-5xl font-bold tracking-tight mb-6">
            Analytics for your Whop store
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8">
            Track revenue, memberships, and conversions in real-time.
            Get automated reports delivered to email and Discord.
          </p>

          {/* Install button */}
          {whopInstallUrl ? (
            <a href={whopInstallUrl} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="gap-2 text-lg px-8 py-6">
                Install on Whop <ExternalLink className="h-5 w-5" />
              </Button>
            </a>
          ) : (
            <div className="inline-block">
              <Button size="lg" disabled className="gap-2 text-lg px-8 py-6">
                App ID not configured
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                Contact support to enable installation
              </p>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Real-time Metrics</h3>
              <p className="text-sm text-muted-foreground">
                Track revenue, active members, new signups, and churn rate as they happen via webhooks.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Beautiful Dashboard</h3>
              <p className="text-sm text-muted-foreground">
                Clean, intuitive interface showing all your key metrics at a glance with 30-day trends.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                <Bell className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Automated Reports</h3>
              <p className="text-sm text-muted-foreground">
                Get daily and weekly summaries via email and Discord. Never miss important changes.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Pricing */}
        <div className="max-w-4xl mx-auto mt-16">
          <h2 className="text-3xl font-bold text-center mb-8">Simple, transparent pricing</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Free Plan */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2">Free</h3>
                  <div className="text-3xl font-bold">£0</div>
                  <p className="text-sm text-muted-foreground">per month</p>
                </div>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                    </div>
                    Weekly email reports
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                    </div>
                    Basic analytics dashboard
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                    </div>
                    30-day history
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="border-primary shadow-lg relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                  POPULAR
                </span>
              </div>
              <CardContent className="pt-6">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2">Pro</h3>
                  <div className="text-3xl font-bold">£12</div>
                  <p className="text-sm text-muted-foreground">per month</p>
                </div>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                    </div>
                    Everything in Free
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                    </div>
                    Daily email reports
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                    </div>
                    Discord alerts
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                    </div>
                    Advanced insights
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Business Plan */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2">Business</h3>
                  <div className="text-3xl font-bold">£39</div>
                  <p className="text-sm text-muted-foreground">per month</p>
                </div>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                    </div>
                    Everything in Pro
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                    </div>
                    Priority support
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                    </div>
                    Extended history (90 days)
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                    </div>
                    Data exports
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Upgrade CTA */}
          {whopInstallUrl && (
            <div className="text-center mt-8">
              <a href={whopInstallUrl} target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="gap-2">
                  View plans on Whop <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-sm text-muted-foreground">
          <p>Built for Whop creators who want better insights</p>
          {appId && (
            <p className="mt-2 text-xs">App ID: {appId}</p>
          )}
        </div>
      </div>
    </div>
  )
}

