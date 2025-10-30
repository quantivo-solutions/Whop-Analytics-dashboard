'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Switch } from './ui/switch'
import { Mail, MessageSquare, Save, Check, Lock, Crown, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

interface DashboardSettingsInlineProps {
  companyId: string
}

export function DashboardSettingsInline({ companyId }: DashboardSettingsInlineProps) {
  const [email, setEmail] = useState('')
  const [discordWebhook, setDiscordWebhook] = useState('')
  const [weeklyEmail, setWeeklyEmail] = useState(true)
  const [dailyEmail, setDailyEmail] = useState(false)
  const [plan, setPlan] = useState<string>('free')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const isPro = plan === 'pro' || plan === 'business'

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
          setPlan(data.plan || 'free')
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

  const handleProFeatureClick = () => {
    toast.error('This feature requires Pro plan', {
      description: 'Upgrade to Pro to unlock daily reports and Discord integration'
    })
  }

  if (loading) {
    return <div className="text-muted-foreground text-sm">Loading settings...</div>
  }

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="px-0">
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Report Settings
        </CardTitle>
        <CardDescription>
          Configure email and Discord notifications for your analytics reports
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 px-0">
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

          {/* Weekly Report - Always available */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
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
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                Daily Email Report
                {isPro && <Crown className="h-3 w-3 text-yellow-500" />}
              </Label>
              <p className="text-xs text-muted-foreground">
                Receive a summary every day (Pro plan required)
              </p>
            </div>
            <Switch
              checked={isPro && dailyEmail}
              onCheckedChange={(checked) => {
                if (isPro) {
                  setDailyEmail(checked)
                } else {
                  handleProFeatureClick()
                }
              }}
              disabled={!isPro}
            />
          </div>
        </div>

        {/* Discord Settings - Pro only */}
        <div className={`space-y-2 relative ${!isPro ? 'opacity-75' : ''}`}>
          {!isPro && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] rounded-lg z-10" />
          )}
          <Label htmlFor="discord" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Discord Webhook URL
            {isPro && <Crown className="h-3 w-3 text-yellow-500" />}
            {!isPro && <Lock className="h-3 w-3 text-muted-foreground" />}
          </Label>
          <Input
            id="discord"
            type="url"
            placeholder="https://discord.com/api/webhooks/..."
            value={discordWebhook}
            onChange={(e) => setDiscordWebhook(e.target.value)}
            disabled={!isPro}
          />
          <p className="text-xs text-muted-foreground">
            Optional: Get notifications in your Discord server
            {!isPro && <span className="text-orange-600 dark:text-orange-400"> (Pro only)</span>}
          </p>
        </div>

        {/* Pro Upgrade CTA */}
        {!isPro && (
          <div className="mt-4 p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-2">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold mb-1">Unlock Pro Features</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Get daily email reports, Discord alerts, and advanced analytics insights
                </p>
                <Button 
                  size="sm" 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                  onClick={() => {
                    window.parent.postMessage({ type: 'close-modal' }, '*')
                    setTimeout(() => {
                      window.location.href = '/dashboard'
                    }, 100)
                  }}
                >
                  <Sparkles className="h-3 w-3 mr-2" />
                  Upgrade to Pro
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          disabled={saving}
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
