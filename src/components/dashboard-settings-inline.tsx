'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Switch } from './ui/switch'
import { Mail, MessageSquare, Save, Check } from 'lucide-react'
import { toast } from 'sonner'

interface DashboardSettingsInlineProps {
  companyId: string
}

export function DashboardSettingsInline({ companyId }: DashboardSettingsInlineProps) {
  const [email, setEmail] = useState('')
  const [discordWebhook, setDiscordWebhook] = useState('')
  const [weeklyEmail, setWeeklyEmail] = useState(true)
  const [dailyEmail, setDailyEmail] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Load settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch(`/api/settings?companyId=${companyId}`)
        if (response.ok) {
          const data = await response.json()
          setEmail(data.reportEmail || '')
          setDiscordWebhook(data.discordWebhook || '')
          setWeeklyEmail(data.weeklyEmail !== false)
          setDailyEmail(data.dailyEmail || false)
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [companyId])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          reportEmail: email,
          discordWebhook,
          weeklyEmail,
          dailyEmail,
        }),
      })

      if (response.ok) {
        setSaved(true)
        toast.success('Settings saved successfully!')
        setTimeout(() => setSaved(false), 3000)
      } else {
        toast.error('Failed to save settings')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-muted-foreground text-sm">Loading settings...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Report Settings
        </CardTitle>
        <CardDescription>
          Configure email and Discord notifications for your analytics reports
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Settings */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Where to send your analytics reports
            </p>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label>Weekly Email Report</Label>
              <p className="text-xs text-muted-foreground">
                Receive a summary every Monday (Free plan)
              </p>
            </div>
            <Switch
              checked={weeklyEmail}
              onCheckedChange={setWeeklyEmail}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label>Daily Email Report</Label>
              <p className="text-xs text-muted-foreground">
                Receive a summary every day (Pro plan required)
              </p>
            </div>
            <Switch
              checked={dailyEmail}
              onCheckedChange={setDailyEmail}
            />
          </div>
        </div>

        {/* Discord Settings */}
        <div className="space-y-2">
          <Label htmlFor="discord" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Discord Webhook URL
          </Label>
          <Input
            id="discord"
            type="url"
            placeholder="https://discord.com/api/webhooks/..."
            value={discordWebhook}
            onChange={(e) => setDiscordWebhook(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Optional: Get notifications in your Discord server (Pro plan)
          </p>
        </div>

        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          disabled={saving || !email}
          className="w-full"
        >
          {saving ? (
            'Saving...'
          ) : saved ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Saved!
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

