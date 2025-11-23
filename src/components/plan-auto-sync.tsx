'use client'

import { useEffect, useRef } from 'react'

/**
 * PlanAutoSync Component
 * 
 * Lightweight client-side component that periodically checks plan status
 * and automatically reloads the page if a cancellation is detected.
 * 
 * Only runs for Pro users to avoid unnecessary API calls.
 * Uses a reasonable polling interval (15 seconds) to balance responsiveness
 * with server load.
 */
interface PlanAutoSyncProps {
  currentPlan: 'free' | 'pro' | 'business'
  userId: string
  companyId: string
}

export function PlanAutoSync({ currentPlan, userId, companyId }: PlanAutoSyncProps) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isCheckingRef = useRef(false)

  useEffect(() => {
    // Only check for Pro/Business users (Free users don't need monitoring)
    if (currentPlan !== 'pro' && currentPlan !== 'business') {
      return
    }

    // Don't run in development to avoid noise
    if (process.env.NODE_ENV === 'development') {
      return
    }

    console.log('[PlanAutoSync] Starting plan monitoring for Pro user:', userId)

    const checkPlanStatus = async () => {
      // Prevent concurrent checks
      if (isCheckingRef.current) {
        return
      }

      isCheckingRef.current = true

      try {
        // Call a lightweight API endpoint to check current plan
        const response = await fetch(`/api/plan/current?userId=${userId}&t=${Date.now()}`, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        })

        if (!response.ok) {
          console.warn('[PlanAutoSync] Failed to check plan status:', response.status)
          isCheckingRef.current = false
          return
        }

        const data = await response.json()
        const serverPlan = data.plan || 'free'

        console.log('[PlanAutoSync] Plan check:', {
          currentPlan,
          serverPlan,
          userId,
        })

        // If server shows Free but we're showing Pro, cancellation detected
        if (serverPlan === 'free' && (currentPlan === 'pro' || currentPlan === 'business')) {
          console.log('[PlanAutoSync] 🚨 Cancellation detected! Reloading page...')
          // Reload page to show Free plan
          window.location.reload()
        }
      } catch (error) {
        console.error('[PlanAutoSync] Error checking plan status:', error)
      } finally {
        isCheckingRef.current = false
      }
    }

    // Check immediately on mount (in case cancellation happened while page was open)
    checkPlanStatus()

    // Then check every 15 seconds
    intervalRef.current = setInterval(checkPlanStatus, 15000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [currentPlan, userId, companyId])

  // This component doesn't render anything
  return null
}

