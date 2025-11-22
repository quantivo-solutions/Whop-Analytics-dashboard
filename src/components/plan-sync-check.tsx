'use client'

import { useEffect, useRef } from 'react'

/**
 * PlanSyncCheck Component
 * 
 * Automatically verifies and syncs plan status when dashboard loads and periodically.
 * This serves as a fallback if webhooks fail to update the plan, and also detects
 * plan changes from webhooks in real-time (within polling interval).
 * 
 * Runs silently in the background - no UI shown unless there's an error.
 * 
 * Polling interval: 15 seconds (checks for plan changes from webhooks)
 */
export function PlanSyncCheck() {
  const lastPlanRef = useRef<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  
  useEffect(() => {
    // Only run on client side
    const verifyPlan = async (isInitialCheck = false) => {
      try {
        if (isInitialCheck) {
          console.log('[PlanSyncCheck] Initial plan verification...')
        } else {
          console.log('[PlanSyncCheck] Periodic plan check...')
        }
        
        const response = await fetch('/api/plan/verify', {
          method: 'POST',
          credentials: 'include',
        })
        
        if (response.ok) {
          const data = await response.json()
          
          // Check if plan changed
          const currentPlan = data.currentPlan || data.plan || 'free'
          if (lastPlanRef.current !== null && lastPlanRef.current !== currentPlan) {
            console.log(`[PlanSyncCheck] 🔄 Plan changed from ${lastPlanRef.current} to ${currentPlan} - reloading...`)
            // Plan changed - reload to reflect new plan
            window.location.reload()
            return
          }
          
          lastPlanRef.current = currentPlan
          
          if (data.synced) {
            console.log('[PlanSyncCheck] ✅ Plan was out of sync and has been updated:', data)
            // Reload page to reflect updated plan
            window.location.reload()
          } else if (data.apiVerificationFailed) {
            if (isInitialCheck) {
              console.log('[PlanSyncCheck] ⚠️ API verification unavailable - keeping current plan')
            }
            // Don't reload if API verification failed - we're keeping the current plan
          } else {
            if (isInitialCheck) {
              console.log('[PlanSyncCheck] ✅ Plan is in sync:', currentPlan)
            }
          }
        } else {
          console.warn('[PlanSyncCheck] Plan verification failed:', response.status)
          // Don't reload on error - keep current state
        }
      } catch (error) {
        console.error('[PlanSyncCheck] Error verifying plan:', error)
        // Don't show error to user - this is a background sync
      }
    }
    
    // Initial check after a short delay to ensure page is loaded
    const initialTimeoutId = setTimeout(() => {
      verifyPlan(true)
    }, 2000)
    
    // Set up periodic polling every 15 seconds to detect webhook-triggered plan changes
    intervalRef.current = setInterval(() => {
      verifyPlan(false)
    }, 15000) // Check every 15 seconds
    
    return () => {
      clearTimeout(initialTimeoutId)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])
  
  return null // No UI
}

