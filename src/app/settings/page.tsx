'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save, Mail, Bell, MessageSquare } from 'lucide-react'

interface Settings {
  reportEmail: string
  weeklyEmail: boolean
  dailyEmail: boolean
  discordWebhook: string
}

export default function SettingsPage() {
  const router = useRouter()
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

  const handleSave = async () => {
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

      toast.success('Settings saved successfully!')
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
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your workspace settings and email preferences
          </p>
        </div>

        <div className="space-y-6">
          {/* Email Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Configuration
              </CardTitle>
              <CardDescription>
                Configure the email address where reports will be sent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reportEmail">Report Email Address</Label>
                <Input
                  id="reportEmail"
                  type="email"
                  placeholder="reports@yourcompany.com"
                  value={settings.reportEmail}
                  onChange={(e) =>
                    setSettings({ ...settings, reportEmail: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Analytics reports will be sent to this email address
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Discord Integration Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Discord Integration
              </CardTitle>
              <CardDescription>
                Receive report notifications in your Discord channel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="discordWebhook">Discord Webhook URL (Optional)</Label>
                <Input
                  id="discordWebhook"
                  type="url"
                  placeholder="https://discord.com/api/webhooks/..."
                  value={settings.discordWebhook}
                  onChange={(e) =>
                    setSettings({ ...settings, discordWebhook: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  A one-line summary will be posted to Discord after each email report is sent
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Report Schedule Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Report Schedule
              </CardTitle>
              <CardDescription>
                Choose which reports you want to receive automatically
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Weekly Report Toggle */}
              <div className="flex items-center justify-between space-x-4">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="weeklyEmail" className="text-base">
                    Weekly Report
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive a summary every Sunday at 9:00 AM with the last 7 days of data
                  </p>
                </div>
                <Switch
                  id="weeklyEmail"
                  checked={settings.weeklyEmail}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, weeklyEmail: checked })
                  }
                />
              </div>

              {/* Daily Report Toggle */}
              <div className="flex items-center justify-between space-x-4">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="dailyEmail" className="text-base">
                    Daily Report
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive a summary every day at 8:00 AM with yesterday&apos;s metrics
                  </p>
                </div>
                <Switch
                  id="dailyEmail"
                  checked={settings.dailyEmail}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, dailyEmail: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

