'use client'

import { useEffect, useRef } from 'react'

/**
 * PlanSyncCheck Component
 * 
 * Automatically detects plan changes from webhooks using multiple methods:
 * 1. Aggressive polling (every 2 seconds)
 * 2. Window visibility change detection
 * 3. Timestamp-based change detection
 * 
 * When a plan change is detected, automatically reloads the dashboard.
 */
export function PlanSyncCheck() {
  const lastPlanRef = useRef<string | null>(null)
  const lastTimestampRef = useRef<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isReloadingRef = useRef(false)
  const checkCountRef = useRef(0)
  
  const checkPlan = async (isInitialCheck = false, reason = '') => {
    // Prevent multiple reloads
    if (isReloadingRef.current) {
      return
    }
    
    checkCountRef.current++
    const checkNumber = checkCountRef.current
    
    try {
      // Use cache-busting URL
      const cacheBuster = `${Date.now()}_${Math.random().toString(36).substring(7)}`
      const url = `/api/plan/current?t=${cacheBuster}&_=${checkNumber}`
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        const currentPlan = data.plan || data.currentPlan || 'free'
        const planUpdatedAt = data.planUpdatedAt || null
        
        // On initial check, store both plan and timestamp
        if (isInitialCheck) {
          lastPlanRef.current = currentPlan
          lastTimestampRef.current = planUpdatedAt
          console.log(`[PlanSyncCheck] ✅ Initial check: plan="${currentPlan}", timestamp="${planUpdatedAt}"`)
          return
        }
        
        // Check for plan change
        const planChanged = lastPlanRef.current !== null && lastPlanRef.current !== currentPlan
        
        // Check for timestamp change (indicates DB update)
        const timestampChanged = planUpdatedAt && 
          lastTimestampRef.current && 
          lastTimestampRef.current !== planUpdatedAt
        
        if (planChanged || timestampChanged) {
          console.log(`[PlanSyncCheck] 🔄 ${reason} - PLAN CHANGE DETECTED!`, {
            plan: `${lastPlanRef.current} → ${currentPlan}`,
            timestamp: `${lastTimestampRef.current} → ${planUpdatedAt}`,
            checkNumber,
          })
          isReloadingRef.current = true
          
          // Reload immediately
          window.location.reload()
          return
        }
        
        // Update refs
        lastPlanRef.current = currentPlan
        if (planUpdatedAt) {
          lastTimestampRef.current = planUpdatedAt
        }
      } else {
        const errorText = await response.text().catch(() => '')
        console.warn(`[PlanSyncCheck] ⚠️ Check failed (${reason}):`, response.status, errorText.substring(0, 50))
      }
    } catch (error) {
      console.error(`[PlanSyncCheck] ❌ Error (${reason}):`, error)
    }
  }
  
  useEffect(() => {
    console.log('[PlanSyncCheck] 🚀 Starting plan monitoring')
    
    // Initial check immediately
    checkPlan(true, 'initial')
    
    // Aggressive polling every 2 seconds
    intervalRef.current = setInterval(() => {
      checkPlan(false, 'poll')
    }, 2000)
    
    // Also check when window becomes visible (user switches back to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[PlanSyncCheck] 👁️ Window visible - checking plan')
        checkPlan(false, 'visibility')
      }
    }
    
    // Also check on window focus
    const handleFocus = () => {
      console.log('[PlanSyncCheck] 🎯 Window focused - checking plan')
      checkPlan(false, 'focus')
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    
    return () => {
      console.log('[PlanSyncCheck] 🛑 Cleaning up')
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])
  
  return null // No UI
}

