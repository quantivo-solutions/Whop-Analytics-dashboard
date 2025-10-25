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

