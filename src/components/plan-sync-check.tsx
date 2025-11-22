'use client'

import { useEffect, useRef } from 'react'

/**
 * PlanSyncCheck Component
 * 
 * Automatically detects plan changes from webhooks by polling the database.
 * When a plan change is detected, automatically reloads the dashboard.
 * 
 * Runs silently in the background - no UI shown unless there's an error.
 * 
 * Polling interval: 5 seconds (checks for plan changes from webhooks)
 */
export function PlanSyncCheck() {
  const lastPlanRef = useRef<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isReloadingRef = useRef(false)
  
  useEffect(() => {
    // Only run on client side
    const checkPlan = async (isInitialCheck = false) => {
      // Prevent multiple reloads
      if (isReloadingRef.current) {
        return
      }
      
      try {
        // Use lightweight endpoint that just returns current plan from DB
        const response = await fetch('/api/plan/current', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store', // Always fetch fresh data
        })
        
        if (response.ok) {
          const data = await response.json()
          const currentPlan = data.plan || data.currentPlan || 'free'
          
          // On initial check, just store the plan
          if (isInitialCheck) {
            lastPlanRef.current = currentPlan
            console.log('[PlanSyncCheck] ✅ Initial plan check:', currentPlan)
            return
          }
          
          // On subsequent checks, compare with last known plan
          if (lastPlanRef.current !== null && lastPlanRef.current !== currentPlan) {
            console.log(`[PlanSyncCheck] 🔄 Plan changed from ${lastPlanRef.current} to ${currentPlan} - reloading...`)
            isReloadingRef.current = true
            // Plan changed - reload to reflect new plan
            window.location.reload()
            return
          }
          
          // Update last known plan
          lastPlanRef.current = currentPlan
        } else {
          console.warn('[PlanSyncCheck] Plan check failed:', response.status)
          // Don't reload on error - keep current state
        }
      } catch (error) {
        console.error('[PlanSyncCheck] Error checking plan:', error)
        // Don't show error to user - this is a background sync
      }
    }
    
    // Initial check after a short delay to ensure page is loaded
    const initialTimeoutId = setTimeout(() => {
      checkPlan(true)
    }, 1000) // Check after 1 second
    
    // Set up periodic polling every 5 seconds to detect webhook-triggered plan changes
    intervalRef.current = setInterval(() => {
      checkPlan(false)
    }, 5000) // Check every 5 seconds for faster detection
    
    return () => {
      clearTimeout(initialTimeoutId)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])
  
  return null // No UI
}

