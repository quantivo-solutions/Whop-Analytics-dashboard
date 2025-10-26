/**
 * Login Page - Whop OAuth
 * Users click "Login with Whop" to authenticate
 */

'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, ExternalLink } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const handleLogin = () => {
    // Redirect to Whop OAuth
    const whopAppId = process.env.NEXT_PUBLIC_WHOP_APP_ID
    if (!whopAppId) {
      alert('Whop App ID not configured')
      return
    }

    // Build OAuth URL
    const redirectUri = `${window.location.origin}/api/auth/callback`
    const state = Math.random().toString(36).substring(7)
    
    // Store state in sessionStorage for verification
    sessionStorage.setItem('oauth_state', state)

    const authUrl = `https://whop.com/oauth?client_id=${whopAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`
    
    window.location.href = authUrl
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to Analytics Dashboard</CardTitle>
          <CardDescription>
            Login with your Whop account to view your analytics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-950 p-3 text-sm text-red-800 dark:text-red-200">
              {error === 'access_denied' && 'You denied access to your Whop account.'}
              {error === 'invalid_state' && 'Invalid authentication state. Please try again.'}
              {error === 'no_company' && 'No company found for your account.'}
              {!['access_denied', 'invalid_state', 'no_company'].includes(error) && 'Authentication failed. Please try again.'}
            </div>
          )}
          
          <Button onClick={handleLogin} className="w-full gap-2" size="lg">
            <ExternalLink className="h-5 w-5" />
            Login with Whop
          </Button>
          
          <p className="text-center text-xs text-muted-foreground">
            By logging in, you agree to access your Whop company data
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center">
        <p>Loading...</p>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}

