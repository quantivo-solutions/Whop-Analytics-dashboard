'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Switch } from './ui/switch'
import { Mail, MessageSquare, Save, Check, Lock, Crown, Sparkles, Bell, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { useIframeSdk } from '@whop/react'
import { Badge } from './ui/badge'

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
  const [upgrading, setUpgrading] = useState(false)
  const [isSdkReady, setIsSdkReady] = useState(false)

  const isPro = plan === 'pro' || plan === 'business'
  const iframeSdk = useIframeSdk()

  // Check if SDK is ready
  useEffect(() => {
    const checkSdkReady = () => {
      if (iframeSdk && typeof iframeSdk.inAppPurchase === 'function') {
        setIsSdkReady(true)
        console.log('[Settings] SDK is ready')
      } else {
        setIsSdkReady(false)
        // Retry after a short delay if not ready
        setTimeout(checkSdkReady, 100)
      }
    }

    checkSdkReady()
  }, [iframeSdk])

  const waitForSdk = async (maxWait = 3000): Promise<boolean> => {
    const startTime = Date.now()
    while (Date.now() - startTime < maxWait) {
      if (iframeSdk && typeof iframeSdk.inAppPurchase === 'function') {
        return true
      }
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    return false
  }

  // Load settings function
  const loadSettings = async () => {
    setLoading(true)
    try {
      console.log('[Settings Component] Loading settings for companyId:', companyId)
      const response = await fetch(`/api/settings?companyId=${companyId}`)
      console.log('[Settings Component] Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('[Settings Component] Loaded data:', data)
        setEmail(data.reportEmail || '')
        setDiscordWebhook(data.discordWebhook || '')
        setWeeklyEmail(data.weeklyEmail !== false)
        setDailyEmail(data.dailyEmail || false)
        setPlan(data.plan || 'free')
      } else {
        const errorText = await response.text()
        console.error('[Settings Component] Failed to load:', response.status, errorText)
        toast.error('Failed to load settings')
      }
    } catch (error) {
      console.error('[Settings Component] Error loading settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  // Load settings on mount and when companyId changes
  useEffect(() => {
    loadSettings()
  }, [companyId])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    
    try {
      console.log('[Settings Component] Saving settings:', {
        companyId,
        reportEmail: email,
        weeklyEmail,
        dailyEmail,
        discordWebhook: discordWebhook ? 'SET' : 'empty',
      })

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

      console.log('[Settings Component] Save response status:', response.status)

      if (response.ok) {
        const result = await response.json()
        console.log('[Settings Component] Save result:', result)
        
        setSaved(true)
        toast.success('Settings saved successfully!')
        
        // Reload settings to confirm save
        await loadSettings()
        
        setTimeout(() => setSaved(false), 3000)
      } else {
        const errorText = await response.text()
        console.error('[Settings Component] Save failed:', response.status, errorText)
        toast.error('Failed to save settings')
      }
    } catch (error) {
      console.error('[Settings Component] Error saving settings:', error)
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

  const handleUpgrade = async () => {
    setUpgrading(true)
    try {
      const planId = process.env.NEXT_PUBLIC_WHOP_PRO_PLAN_ID
      if (!planId) {
        toast.error('Upgrade is not configured. Please contact support.')
        console.error('[Upgrade] NEXT_PUBLIC_WHOP_PRO_PLAN_ID not set!')
        setUpgrading(false)
        return
      }

      console.log('[Upgrade] Starting upgrade flow from settings...')
      console.log('[Upgrade] Plan ID:', planId)
      console.log('[Upgrade] iframeSdk available:', !!iframeSdk)
      console.log('[Upgrade] inAppPurchase method available:', typeof iframeSdk?.inAppPurchase === 'function')
      
      // Wait for SDK to be ready (with timeout)
      const sdkReady = await waitForSdk()
      if (!sdkReady) {
        toast.error('SDK is not ready. Please wait a moment and try again.')
        console.error('[Upgrade] SDK not ready after waiting')
        setUpgrading(false)
        return
      }

      console.log('[Upgrade] SDK ready, calling inAppPurchase...')
      
      const result = await iframeSdk.inAppPurchase({ planId: planId })
      console.log('[Upgrade] Purchase result:', result)
      
      if (result.status === 'ok') {
        toast.success('Successfully upgraded to Pro! 🎉')
        console.log('[Upgrade] Receipt ID:', result.data?.receiptId)
        
        // Wait a moment for webhook to process, then reload settings
        setTimeout(async () => {
          await loadSettings()
          toast.success('Settings updated with Pro features!')
        }, 2000)
      } else {
        console.error('[Upgrade] Purchase failed:', result.error)
        toast.error(result.error || 'Purchase failed. Please try again.')
      }
    } catch (error) {
      console.error('[Upgrade] Error during purchase:', error)
      toast.error('Failed to start upgrade process. Please try again.')
    } finally {
      setUpgrading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Plan Badge */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div>
          <h3 className="text-lg font-semibold">Notification Settings</h3>
          <p className="text-sm text-muted-foreground">Manage your email and Discord alerts</p>
        </div>
        <Badge 
          variant={isPro ? "default" : "secondary"} 
          className={isPro ? "bg-gradient-to-r from-purple-500 to-pink-500 border-0" : ""}
        >
          {isPro ? (
            <>
              <Crown className="h-3 w-3 mr-1" />
              Pro Plan
            </>
          ) : (
            'Free Plan'
          )}
        </Badge>
      </div>

      {/* Email Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <Mail className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h4 className="font-medium text-sm">Email Notifications</h4>
            <p className="text-xs text-muted-foreground">Get reports delivered to your inbox</p>
          </div>
        </div>

        <div className="space-y-3 pl-10">
          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="max-w-md"
            />
          </div>

          {/* Weekly Report Toggle */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Weekly Reports</Label>
                <Badge variant="secondary" className="text-xs">Free</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Every Monday at 9 AM
              </p>
            </div>
            <Switch
              checked={weeklyEmail}
              onCheckedChange={setWeeklyEmail}
            />
          </div>

          {/* Daily Report Toggle - Pro */}
          <div className={`relative flex items-center justify-between p-3 rounded-lg border transition-all ${
            isPro 
              ? 'bg-gradient-to-br from-purple-500/5 to-pink-500/5 border-purple-500/30' 
              : 'bg-muted/20 border-muted'
          }`}>
            {!isPro && (
              <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px] rounded-lg flex items-center justify-center cursor-not-allowed">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-background/90 border rounded-md px-3 py-1.5 shadow-sm">
                  <Lock className="h-3 w-3" />
                  Upgrade to Pro
                </div>
              </div>
            )}
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Daily Reports</Label>
                <Badge 
                  variant={isPro ? "default" : "secondary"} 
                  className={isPro ? "text-xs bg-gradient-to-r from-purple-500 to-pink-500" : "text-xs"}
                >
                  <Crown className="h-2.5 w-2.5 mr-1" />
                  Pro
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Every day at 9 AM
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
      </div>

      {/* Discord Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className={`rounded-lg p-2 ${isPro ? 'bg-purple-500/10' : 'bg-muted'}`}>
            <MessageSquare className={`h-4 w-4 ${isPro ? 'text-purple-500' : 'text-muted-foreground'}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm">Discord Integration</h4>
              {!isPro && (
                <Badge variant="secondary" className="text-xs">
                  <Lock className="h-2.5 w-2.5 mr-1" />
                  Pro Only
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Send alerts to your Discord server</p>
          </div>
        </div>

        <div className={`space-y-2 pl-10 relative ${!isPro ? 'pointer-events-none' : ''}`}>
          {!isPro && (
            <div className="absolute inset-0 bg-background/40 backdrop-blur-[1px] rounded-lg z-10" />
          )}
          <Label htmlFor="discord" className="text-sm">Webhook URL</Label>
          <Input
            id="discord"
            type="url"
            placeholder="https://discord.com/api/webhooks/..."
            value={discordWebhook}
            onChange={(e) => setDiscordWebhook(e.target.value)}
            disabled={!isPro}
            className="max-w-md"
          />
          <p className="text-xs text-muted-foreground">
            {isPro ? 'Paste your Discord webhook URL here' : 'Upgrade to Pro to enable Discord notifications'}
          </p>
        </div>
      </div>

      {/* Pro Upgrade CTA */}
      {!isPro && (
        <div className="relative overflow-hidden rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-purple-500/10 p-6">
          <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(white,transparent_85%)]" />
          <div className="relative flex items-start gap-4">
            <div className="rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-2.5 shadow-lg">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h4 className="font-semibold mb-1">Unlock Pro Features</h4>
                <p className="text-sm text-muted-foreground">
                  Get daily email reports, Discord integration, and advanced analytics insights
                </p>
              </div>
              <Button 
                size="sm" 
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all"
                onClick={handleUpgrade}
                disabled={upgrading || !isSdkReady}
                title={!isSdkReady ? 'Initializing...' : undefined}
              >
                <Sparkles className="h-3.5 w-3.5 mr-2" />
                {upgrading ? 'Processing...' : 'Upgrade to Pro'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="pt-4 border-t">
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full"
          size="lg"
        >
          {saving ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
              Saving...
            </>
          ) : saved ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Saved Successfully!
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
