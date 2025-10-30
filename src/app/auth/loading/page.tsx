'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

/**
 * Loading page shown after OAuth callback
 * Gives the database time to sync, then redirects to dashboard
 */
export default function AuthLoadingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'

  useEffect(() => {
    // Wait 500ms to ensure database operations complete
    const timer = setTimeout(() => {
      console.log('[Auth Loading] Redirecting to:', redirectTo)
      router.push(redirectTo)
      // Force a hard refresh to ensure fresh data
      setTimeout(() => {
        window.location.href = redirectTo
      }, 100)
    }, 500)

    return () => clearTimeout(timer)
  }, [redirectTo, router])

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

