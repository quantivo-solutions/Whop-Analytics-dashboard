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
    console.log('[Plan Sync] Request URL:', request.url)
    console.log('[Plan Sync] Request headers:', Object.fromEntries(request.headers.entries()))
    
    // Check if plan is specified in query params (for manual downgrade)
    const { searchParams } = new URL(request.url)
    const requestedPlan = searchParams.get('plan') as 'free' | 'pro' | 'business' | null
    
    console.log('[Plan Sync] Requested plan from query:', requestedPlan)
    
    // Get session to find userId (reads from cookies)
    const session = await getSession()
    
    console.log('[Plan Sync] Session data:', {
      hasSession: !!session,
      userId: session?.userId,
      companyId: session?.companyId,
    })
    
    if (!session?.userId) {
      console.error('[Plan Sync] ❌ No userId in session')
      console.error('[Plan Sync] Session object:', session)
      return NextResponse.json(
        { 
          error: 'No userId in session',
          details: 'Session cookie may be missing or invalid. Make sure credentials: "include" is set in fetch call.',
        },
        { status: 401 }
      )
    }
    
    const userId = session.userId
    console.log('[Plan Sync] User ID:', userId)
    
    // Get current user-level plan
    const currentPlan = await getUserPlan(userId)
    console.log('[Plan Sync] Current user plan:', currentPlan)
    
    // Determine target plan - if purchase was successful, upgrade to pro
    // If plan is explicitly requested via query param, use that
    const targetPlan = requestedPlan || (currentPlan !== 'pro' ? 'pro' : currentPlan)
    
    console.log('[Plan Sync] Target plan:', targetPlan)
    
    // If plan is specified via query param and different from current, update it
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
    
    // Default behavior: upgrade to pro if not already pro (called after successful purchase)
    if (currentPlan !== 'pro' && !requestedPlan) {
      console.log('[Plan Sync] Updating user plan from', currentPlan, 'to pro (after purchase)')
      
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
    } else if (currentPlan === 'pro' && !requestedPlan) {
      console.log('[Plan Sync] User plan is already pro, no update needed')
      return NextResponse.json({
        success: true,
        message: 'User plan already pro',
        userId,
        currentPlan: 'pro',
      })
    } else {
      // This shouldn't happen, but handle it
      console.log('[Plan Sync] No action needed. Current plan:', currentPlan, 'Requested:', requestedPlan)
      return NextResponse.json({
        success: true,
        message: `No update needed. Current plan: ${currentPlan}`,
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

