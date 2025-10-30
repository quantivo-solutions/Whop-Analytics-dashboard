'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, ExternalLink } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

export function LoginForm() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const experienceId = searchParams.get('experienceId')
  const companyId = searchParams.get('companyId') || searchParams.get('company_id')

  console.log('[LoginForm] Component loaded, experienceId:', experienceId || 'none', 'companyId:', companyId || 'none')

  const handleLogin = async () => {
    console.log('[LoginForm] Login button clicked, experienceId:', experienceId || 'none')
    try {
      // Call our API route to generate OAuth URL
      // The server will automatically determine the correct redirect URI based on the request origin
      // Pass experienceId and companyId if present (from Whop iframe context)
      const params = new URLSearchParams()
      if (experienceId) params.set('experienceId', experienceId)
      if (companyId) params.set('companyId', companyId)
      
      console.log('[LoginForm] OAuth params:', params.toString() || 'none')
      
      const apiUrl = params.toString() 
        ? `/api/auth/init?${params.toString()}`
        : `/api/auth/init`
      const response = await fetch(apiUrl)
      
      if (!response.ok) {
        alert('Failed to initialize OAuth. Please try again.')
        return
      }

      const { url: oauthUrl, state } = await response.json()
      
      // Store state in sessionStorage for verification (optional)
      sessionStorage.setItem('oauth_state', state)

      // Redirect to Whop OAuth page
      window.location.href = oauthUrl
    } catch (error) {
      console.error('Login error:', error)
      alert('Failed to start login process. Please try again.')
    }
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

