'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Save, Mail, MessageSquare } from 'lucide-react'

interface Settings {
  reportEmail: string
  weeklyEmail: boolean
  dailyEmail: boolean
  discordWebhook: string
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<Settings>({
    reportEmail: '',
    weeklyEmail: true,
    dailyEmail: false,
    discordWebhook: '',
  })

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
        reportEmail: data.reportEmail,
        weeklyEmail: data.weeklyEmail,
        dailyEmail: data.dailyEmail,
        discordWebhook: data.discordWebhook || '',
      })
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            </div>
            <p className="text-muted-foreground">Manage your workspace preferences and integrations.</p>
          </div>
          <Button onClick={handleSaveSettings} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Email Reports Card */}
          <Card>
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
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="weekly-report">Weekly Report</Label>
                <Switch
                  id="weekly-report"
                  checked={settings.weeklyEmail}
                  onCheckedChange={(checked) => setSettings({ ...settings, weeklyEmail: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="daily-report">Daily Report</Label>
                <Switch
                  id="daily-report"
                  checked={settings.dailyEmail}
                  onCheckedChange={(checked) => setSettings({ ...settings, dailyEmail: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Discord Integration Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" /> Discord Integration
              </CardTitle>
              <CardDescription>
                Send daily/weekly summaries to a Discord webhook.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="discord-webhook">Discord Webhook URL</Label>
                <Input
                  id="discord-webhook"
                  type="url"
                  value={settings.discordWebhook}
                  onChange={(e) => setSettings({ ...settings, discordWebhook: e.target.value })}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="mt-1"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Get your webhook URL from Discord server settings (Integrations &gt; Webhooks).
              </p>
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
