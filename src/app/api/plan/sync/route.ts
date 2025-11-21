import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'
import { getSession } from '@/lib/session'
import { getUserPlan, setUserPlan } from '@/lib/plan'

/**
 * POST /api/plan/sync
 * 
 * Manually syncs the plan for the current user (USER-LEVEL entitlement).
 * This is called after an in-app purchase to immediately update the plan
 * without waiting for webhooks.
 * 
 * Can also be used to downgrade to 'free' by passing ?plan=free
 * 
 * Strategy:
 * 1. Get current session (userId)
 * 2. Update UserPlan table (user-level plan)
 * 3. Plan applies to ALL companies for this user
 */
export async function POST(request: Request) {
  try {
    console.log('[Plan Sync] ===== SYNC REQUEST =====')
    
    // Check if plan is specified in query params (for manual downgrade)
    const { searchParams } = new URL(request.url)
    const requestedPlan = searchParams.get('plan') as 'free' | 'pro' | 'business' | null
    
    // Get session to find userId (reads from cookies)
    const session = await getSession()
    
    if (!session?.userId) {
      console.error('[Plan Sync] No userId in session')
      return NextResponse.json(
        { error: 'No userId in session' },
        { status: 401 }
      )
    }
    
    const userId = session.userId
    console.log('[Plan Sync] User ID:', userId)
    
    // Get current user-level plan
    const currentPlan = await getUserPlan(userId)
    console.log('[Plan Sync] Current user plan:', currentPlan)
    
    // Determine target plan
    const targetPlan = requestedPlan || (currentPlan !== 'pro' ? 'pro' : 'pro')
    
    // If plan is specified and different from current, update it
    if (requestedPlan && requestedPlan !== currentPlan) {
      console.log('[Plan Sync] Updating user plan from', currentPlan, 'to', requestedPlan)
      await setUserPlan(userId, requestedPlan)
      console.log(`[Plan Sync] ✅ User plan updated to ${requestedPlan} (applies to all companies)`)
      
      // Reset proWelcomeShownAt if upgrading to Pro
      if (requestedPlan === 'pro' || requestedPlan === 'business') {
        try {
          const installations = await prisma.whopInstallation.findMany({
            where: { userId },
            select: { companyId: true },
          })
          
          const { setCompanyPrefs } = await import('@/lib/company')
          for (const inst of installations) {
            await setCompanyPrefs(inst.companyId, { proWelcomeShownAt: null })
          }
          console.log('[Plan Sync] ✅ Reset proWelcomeShownAt for', installations.length, 'installations')
        } catch (prefsError) {
          console.error('[Plan Sync] Error resetting proWelcomeShownAt:', prefsError)
        }
      }
      
      return NextResponse.json({
        success: true,
        message: `User plan updated to ${requestedPlan} (applies to all companies)`,
        userId,
        previousPlan: currentPlan,
        newPlan: requestedPlan,
      })
    }
    
    // Default behavior: upgrade to pro if not already pro
    if (currentPlan !== 'pro' && !requestedPlan) {
      console.log('[Plan Sync] Updating user plan from', currentPlan, 'to pro')
      
      await setUserPlan(userId, 'pro')
      
      console.log('[Plan Sync] ✅ User plan updated to pro (applies to all companies)')
      
      // Reset proWelcomeShownAt for all installations of this user
      try {
        const installations = await prisma.whopInstallation.findMany({
          where: { userId },
          select: { companyId: true },
        })
        
        const { setCompanyPrefs } = await import('@/lib/company')
        for (const inst of installations) {
          await setCompanyPrefs(inst.companyId, { proWelcomeShownAt: null })
        }
        console.log('[Plan Sync] ✅ Reset proWelcomeShownAt for', installations.length, 'installations')
      } catch (prefsError) {
        console.error('[Plan Sync] Error resetting proWelcomeShownAt:', prefsError)
        // Don't fail if this fails
      }
      
      return NextResponse.json({
        success: true,
        message: 'User plan updated to pro (applies to all companies)',
        userId,
        previousPlan: currentPlan,
        newPlan: 'pro',
      })
    } else {
      console.log('[Plan Sync] User plan is already', currentPlan, ', no update needed')
      return NextResponse.json({
        success: true,
        message: `User plan already ${currentPlan}`,
        userId,
        currentPlan,
      })
    }
  } catch (error) {
    console.error('[Plan Sync] Error:', error)
    return NextResponse.json(
      { error: 'Failed to sync plan', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

