'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

interface SessionRefresherProps {
  companyId: string
  userId?: string | null
  username?: string | null
}

/**
 * Client component that refreshes the session cookie
 * Called when installation exists but cookie isn't accessible
 * Also checks for logout flag in sessionStorage to prevent auto-login
 */
export function SessionRefresher({ companyId, userId, username }: SessionRefresherProps) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // First, check if user explicitly logged out (via sessionStorage)
    // If so, redirect to login without auto-login
    const loggedOut = sessionStorage.getItem('whop_logged_out')
    const logoutTime = sessionStorage.getItem('whop_logout_time')
    
    if (loggedOut === 'true' && logoutTime) {
      // Check if logout was recent (within last 5 minutes)
      // This prevents stale logout flags from causing issues
      const timeSinceLogout = Date.now() - parseInt(logoutTime, 10)
      const fiveMinutes = 5 * 60 * 1000
      
      if (timeSinceLogout < fiveMinutes) {
        console.log('[SessionRefresher] Logout flag detected in sessionStorage - redirecting to login')
        // Extract experienceId from pathname if present
        const pathMatch = pathname.match(/\/experiences\/(exp_[^\/]+)/)
        const loginUrl = pathMatch 
          ? `/login?experienceId=${pathMatch[1]}`
          : '/login'
        
        // Clear logout flag after redirect (user will need to explicitly login)
        sessionStorage.removeItem('whop_logged_out')
        sessionStorage.removeItem('whop_logout_time')
        
        router.push(loginUrl)
        return // Don't refresh session
      } else {
        // Stale logout flag - clear it
        console.log('[SessionRefresher] Stale logout flag detected, clearing it')
        sessionStorage.removeItem('whop_logged_out')
        sessionStorage.removeItem('whop_logout_time')
      }
    }
    
    // No logout flag - proceed with session refresh
    async function refreshSession() {
      try {
        const response = await fetch(`/api/auth/refresh?companyId=${encodeURIComponent(companyId)}`, {
          method: 'POST',
          credentials: 'include',
        })
        
        if (response.ok) {
          console.log('[SessionRefresher] Session cookie refreshed successfully')
          // Clear any logout flags after successful refresh (user is logged in now)
          sessionStorage.removeItem('whop_logged_out')
          sessionStorage.removeItem('whop_logout_time')
        } else {
          console.warn('[SessionRefresher] Failed to refresh session cookie')
        }
      } catch (error) {
        console.error('[SessionRefresher] Error refreshing session:', error)
      }
    }

    refreshSession()
  }, [companyId, userId, username, router, pathname])

  return null // This component doesn't render anything
}

