'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/page-header'
import { PlanBadge } from '@/components/plan-badge'
import { Save, Mail, MessageSquare, Crown, Lock } from 'lucide-react'
import type { Plan } from '@/lib/plan'

interface Settings {
  reportEmail: string
  weeklyEmail: boolean
  dailyEmail: boolean
  discordWebhook: string
  plan?: Plan
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<Settings>({
    reportEmail: '',
    weeklyEmail: true,
    dailyEmail: false,
    discordWebhook: '',
    plan: 'free',
  })

  const isPro = settings.plan === 'pro' || settings.plan === 'business'

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      if (!response.ok) throw new Error('Failed to fetch settings')
      const data = await response.json()
      setSettings({
        reportEmail: data.reportEmail || '',
        weeklyEmail: data.weeklyEmail ?? true,
        dailyEmail: data.dailyEmail ?? false,
        discordWebhook: data.discordWebhook || '',
        plan: data.plan || 'free',
      })
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    // Validate email if provided
    if (settings.reportEmail && !settings.reportEmail.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      if (!response.ok) throw new Error('Failed to save settings')

      toast.success('Settings saved!')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleProFeatureClick = () => {
    toast.error('This feature requires Pro plan', {
      description: 'Upgrade to Whoplytics Pro to unlock daily reports and Discord integration'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl">
        <PageHeader title="Settings" subtitle="Manage your workspace preferences and integrations" />
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PlanBadge plan={settings.plan || 'free'} />
          </div>
          <Button onClick={handleSaveSettings} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Email Reports Card */}
          <Card className="relative">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" /> Email Reports
              </CardTitle>
              <CardDescription>
                Configure your email preferences for analytics reports.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="report-email">Report Email</Label>
                <Input
                  id="report-email"
                  type="email"
                  value={settings.reportEmail}
                  onChange={(e) => setSettings({ ...settings, reportEmail: e.target.value })}
                  placeholder="your@email.com"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  We'll send analytics reports to this email address
                </p>
              </div>
              
              {/* Weekly Report - Always available */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="weekly-report" className="cursor-pointer">
                    Weekly Report
                  </Label>
                  <p className="text-xs text-muted-foreground">Free for all users</p>
                </div>
                <Switch
                  id="weekly-report"
                  checked={settings.weeklyEmail}
                  onCheckedChange={(checked) => setSettings({ ...settings, weeklyEmail: checked })}
                />
              </div>
              
              {/* Daily Report - Pro only */}
              <div className={`relative flex items-center justify-between p-3 rounded-lg border-2 ${
                isPro 
                  ? 'bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20' 
                  : 'bg-muted/30 border-muted'
              }`}>
                {!isPro && (
                  <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] rounded-lg flex items-center justify-center">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground bg-background border rounded-lg px-4 py-2 shadow-sm">
                      <Lock className="h-4 w-4" />
                      Pro Feature
                    </div>
                  </div>
                )}
                <div className="flex-1">
                  <Label 
                    htmlFor="daily-report" 
                    className={`flex items-center gap-2 ${isPro ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  >
                    Daily Report
                    {isPro && <Crown className="h-3 w-3 text-yellow-500" />}
                  </Label>
                  <p className="text-xs text-muted-foreground">Get daily insights every morning</p>
                </div>
                <Switch
                  id="daily-report"
                  checked={isPro && settings.dailyEmail}
                  onCheckedChange={(checked) => {
                    if (isPro) {
                      setSettings({ ...settings, dailyEmail: checked })
                    } else {
                      handleProFeatureClick()
                    }
                  }}
                  disabled={!isPro}
                />
              </div>
            </CardContent>
          </Card>

          {/* Discord Integration Card - Pro only */}
          <Card className={`relative ${
            !isPro ? 'opacity-75' : ''
          }`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" /> Discord Integration
                {isPro && <Crown className="h-4 w-4 text-yellow-500" />}
                {!isPro && <Lock className="h-4 w-4 text-muted-foreground" />}
              </CardTitle>
              <CardDescription>
                Send daily/weekly summaries to a Discord webhook.
                {!isPro && <span className="text-orange-600 dark:text-orange-400"> (Pro only)</span>}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 relative">
              {!isPro && (
                <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] rounded-lg z-10" />
              )}
              <div>
                <Label htmlFor="discord-webhook">Discord Webhook URL</Label>
                <Input
                  id="discord-webhook"
                  type="url"
                  value={settings.discordWebhook}
                  onChange={(e) => setSettings({ ...settings, discordWebhook: e.target.value })}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="mt-1"
                  disabled={!isPro}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Get your webhook URL from Discord server settings (Integrations &gt; Webhooks).
              </p>
              
              {!isPro && (
                <div className="mt-4 p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Crown className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium mb-1">Upgrade to Whoplytics Pro</p>
                      <p className="text-xs text-muted-foreground mb-3">
                        Get Discord alerts, daily reports, and advanced insights
                      </p>
                      <Button 
                        size="sm" 
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                        onClick={() => {
                          // Navigate to upgrade
                          window.location.href = '/dashboard'
                        }}
                      >
                        Upgrade Now
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Whop App Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Whop App</CardTitle>
              <CardDescription>
                This analytics dashboard is installed as a Whop App.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Data is automatically synced from your Whop company.
                No manual API key configuration required.
              </p>
              <p className="text-xs text-muted-foreground">
                To manage your Whop app installation, visit your Whop company settings.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
