'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save, Mail, Bell, MessageSquare, Link as LinkIcon } from 'lucide-react'

interface Settings {
  reportEmail: string
  weeklyEmail: boolean
  dailyEmail: boolean
  discordWebhook: string
}

interface WhopConnection {
  connected: boolean
  connectedAt?: string
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
  
  // Whop connection state
  const [whopConnection, setWhopConnection] = useState<WhopConnection>({ connected: false })
  const [whopApiKey, setWhopApiKey] = useState('')
  const [connectingWhop, setConnectingWhop] = useState(false)

  // Fetch settings and Whop connection on mount
  useEffect(() => {
    fetchSettings()
    fetchWhopConnection()
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

  const fetchWhopConnection = async () => {
    try {
      const response = await fetch('/api/whop/connect')
      if (!response.ok) throw new Error('Failed to fetch Whop connection')
      const data = await response.json()
      setWhopConnection(data)
    } catch (error) {
      console.error('Error fetching Whop connection:', error)
    }
  }

  const handleWhopConnect = async () => {
    if (!whopApiKey.trim()) {
      toast.error('Please enter a Whop API key')
      return
    }

    setConnectingWhop(true)
    try {
      const response = await fetch('/api/whop/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessToken: whopApiKey }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle specific error messages from the API
        if (data.error === 'Invalid Whop API Key') {
          const message = data.details ? `Invalid Whop API key (${data.details})` : 'Invalid Whop API key'
          toast.error(message)
          console.error('Whop connection failed:', data)
        } else if (data.error?.includes('Verification timed out')) {
          toast.error('Verification timed out. Please try again.')
          console.error('Whop connection timeout:', data)
        } else {
          const message = data.details ? `${data.error}: ${data.details}` : (data.error || 'Failed to connect Whop account')
          toast.error(message)
          console.error('Whop connection error:', data)
        }
        return
      }

      // Success!
      setWhopConnection(data)
      setWhopApiKey('') // Clear the input
      toast.success('Whop connected successfully')
    } catch (error) {
      console.error('Error connecting Whop:', error)
      toast.error('Failed to connect Whop account')
    } finally {
      setConnectingWhop(false)
    }
  }

  const handleWhopDisconnect = async () => {
    setConnectingWhop(true)
    try {
      const response = await fetch('/api/whop/connect', {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to disconnect Whop')

      setWhopConnection({ connected: false })
      toast.success('Whop account disconnected')
    } catch (error) {
      console.error('Error disconnecting Whop:', error)
      toast.error('Failed to disconnect Whop account')
    } finally {
      setConnectingWhop(false)
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

          {/* Whop Connection Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                Whop Connection
              </CardTitle>
              <CardDescription>
                Connect your Whop account to sync data and analytics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {whopConnection.connected ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                    <div>
                      <p className="font-medium text-green-900 dark:text-green-100">
                        ✓ Connected
                      </p>
                      {whopConnection.connectedAt && (
                        <p className="text-sm text-green-700 dark:text-green-300">
                          Connected on {new Date(whopConnection.connectedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleWhopDisconnect}
                      disabled={connectingWhop}
                    >
                      Disconnect
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Not connected
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whopApiKey">Whop API Key</Label>
                    <Input
                      id="whopApiKey"
                      type="password"
                      placeholder="whop_••••••••••••••••"
                      value={whopApiKey}
                      onChange={(e) => setWhopApiKey(e.target.value)}
                      disabled={connectingWhop}
                    />
                    <p className="text-xs text-muted-foreground">
                      Your API key will be encrypted and stored securely
                    </p>
                  </div>
                  <Button
                    onClick={handleWhopConnect}
                    disabled={connectingWhop || !whopApiKey.trim()}
                  >
                    {connectingWhop ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <LinkIcon className="mr-2 h-4 w-4" />
                        Connect Whop
                      </>
                    )}
                  </Button>
                </div>
              )}
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

