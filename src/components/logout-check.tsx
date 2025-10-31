'use client'

import { useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

interface LogoutCheckProps {
  experienceId: string
  children: ReactNode
}

/**
 * Client component that checks sessionStorage for logout flag
 * Redirects to login if user explicitly logged out
 * Only renders children after confirming user is not logged out
 */
export function LogoutCheck({ experienceId, children }: LogoutCheckProps) {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const [shouldShowContent, setShouldShowContent] = useState(false)

  useEffect(() => {
    // Check if user explicitly logged out (via sessionStorage)
    const loggedOut = sessionStorage.getItem('whop_logged_out')
    const logoutTime = sessionStorage.getItem('whop_logout_time')
    
    if (loggedOut === 'true' && logoutTime) {
      // Check if logout was recent (within last 5 minutes)
      const timeSinceLogout = Date.now() - parseInt(logoutTime, 10)
      const fiveMinutes = 5 * 60 * 1000
      
      if (timeSinceLogout < fiveMinutes) {
        console.log('[LogoutCheck] Logout flag detected - redirecting to login')
        // Clear logout flag
        sessionStorage.removeItem('whop_logged_out')
        sessionStorage.removeItem('whop_logout_time')
        
        // Redirect to login immediately
        const loginUrl = `/login?experienceId=${experienceId}`
        window.location.href = loginUrl // Use window.location for immediate redirect
        return
      } else {
        // Stale logout flag - clear it
        console.log('[LogoutCheck] Stale logout flag detected, clearing it')
        sessionStorage.removeItem('whop_logged_out')
        sessionStorage.removeItem('whop_logout_time')
      }
    }
    
    // No logout flag or stale flag - user is authenticated
    console.log('[LogoutCheck] No logout flag - user is authenticated')
    setIsChecking(false)
    setShouldShowContent(true)
  }, [experienceId, router])

  // Show loading state while checking
  if (isChecking || !shouldShowContent) {
    return (
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
    )
  }

  // Show dashboard content only after confirming no logout flag
  return <>{children}</>
}

