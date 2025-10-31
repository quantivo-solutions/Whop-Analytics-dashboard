'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

/**
 * Inner component that uses useSearchParams
 */
function LoadingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'
  const sessionToken = searchParams.get('token') // Get token from URL if passed

  useEffect(() => {
    console.log('[Auth Loading] Starting redirect process to:', redirectTo)
    
    // Clear logout flags after successful OAuth login
    // User has successfully authenticated, so logout flags are no longer needed
    sessionStorage.removeItem('whop_logged_out')
    sessionStorage.removeItem('whop_logout_time')
    console.log('[Auth Loading] Cleared logout flags after successful login')
    
    // Wait 2000ms to ensure:
    // 1. Database operations complete (Prisma write)
    // 2. Session cookie is properly set and accessible in iframe context
    // 3. Cookie propagation completes across redirects
    const timer = setTimeout(() => {
      console.log('[Auth Loading] Performing redirect to:', redirectTo)
      console.log('[Auth Loading] Session token present:', sessionToken ? 'yes' : 'no')
      console.log('[Auth Loading] Session token length:', sessionToken?.length || 0)
      
      // Build final URL - always include token if we have it
      // The token is critical for iframe cookie issues
      let finalUrl = redirectTo
      
      // If redirectTo is just a pathname, we need to add the token
      if (redirectTo.startsWith('/')) {
        // Check if redirectTo already has query params
        const hasQuery = redirectTo.includes('?')
        
        if (sessionToken) {
          if (hasQuery) {
            finalUrl = `${redirectTo}&token=${encodeURIComponent(sessionToken)}`
          } else {
            finalUrl = `${redirectTo}?token=${encodeURIComponent(sessionToken)}`
          }
        }
      } else {
        // Full URL - parse and add token
        try {
          const redirectUrl = new URL(redirectTo, window.location.origin)
          redirectUrl.searchParams.delete('loggedOut') // Clean unwanted params
          
          if (sessionToken && !redirectUrl.searchParams.has('token')) {
            redirectUrl.searchParams.set('token', sessionToken)
          }
          
          finalUrl = redirectUrl.pathname + redirectUrl.search
        } catch (error) {
          console.error('[Auth Loading] Failed to parse redirectTo URL:', error)
          // Fallback: just append token
          finalUrl = `${redirectTo}${redirectTo.includes('?') ? '&' : '?'}token=${encodeURIComponent(sessionToken || '')}`
        }
      }
      
      console.log('[Auth Loading] Final redirect URL with token:', finalUrl)
      
      // Use window.location.replace() for a clean redirect (removes from history)
      // This ensures cookies are read correctly
      window.location.replace(finalUrl)
    }, 2000)

    return () => clearTimeout(timer)
  }, [redirectTo, router, sessionToken])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 rounded-full border-4 border-primary/30"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin"></div>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Setting up your dashboard...</h2>
          <p className="text-sm text-muted-foreground">This will only take a moment</p>
        </div>
      </div>
    </div>
  )
}

/**
 * Loading page shown after OAuth callback
 * Gives the database time to sync, then redirects to dashboard
 */
export default function AuthLoadingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-primary/30"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin"></div>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">Loading...</h2>
          </div>
        </div>
      </div>
    }>
      <LoadingContent />
    </Suspense>
  )
}

