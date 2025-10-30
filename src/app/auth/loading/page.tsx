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

  useEffect(() => {
    console.log('[Auth Loading] Starting redirect process to:', redirectTo)
    
    // Wait 1500ms to ensure database operations complete
    // This gives Prisma time to write the installation and for any DB replication lag
    const timer = setTimeout(() => {
      console.log('[Auth Loading] Performing redirect to:', redirectTo)
      // Use window.location for a clean hard refresh
      window.location.href = redirectTo
    }, 1500)

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

