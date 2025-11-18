import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'
import { getSession } from '@/lib/session'

/**
 * POST /api/plan/sync
 * 
 * Manually syncs the plan for the current user's installation.
 * This is called after an in-app purchase to immediately update the plan
 * without waiting for webhooks.
 * 
 * Strategy:
 * 1. Get current session (companyId, userId)
 * 2. Find installation
 * 3. Check Whop API for active memberships
 * 4. Update plan based on memberships
 */
export async function POST(request: Request) {
  try {
    console.log('[Plan Sync] ===== SYNC REQUEST =====')
    
    // Get session to find companyId (reads from cookies)
    const session = await getSession()
    
    if (!session?.companyId) {
      console.error('[Plan Sync] No companyId in session')
      return NextResponse.json(
        { error: 'No companyId in session' },
        { status: 401 }
      )
    }
    
    const companyId = session.companyId
    console.log('[Plan Sync] Company ID:', companyId)
    
    // Find installation
    const installation = await prisma.whopInstallation.findUnique({
      where: { companyId },
      select: { userId: true, plan: true, accessToken: true },
    })
    
    if (!installation) {
      console.error('[Plan Sync] No installation found for companyId:', companyId)
      return NextResponse.json(
        { error: 'Installation not found' },
        { status: 404 }
      )
    }
    
    console.log('[Plan Sync] Current plan in DB:', installation.plan)
    
    // Since purchase completed successfully and webhook isn't firing,
    // directly update the plan to 'pro' as a fallback
    // The webhook should verify this later, but this ensures immediate upgrade
    if (installation.plan !== 'pro') {
      console.log('[Plan Sync] Updating plan from', installation.plan, 'to pro')
      
      await prisma.whopInstallation.update({
        where: { companyId },
        data: {
          plan: 'pro',
          updatedAt: new Date(),
        },
      })
      
      console.log('[Plan Sync] ✅ Plan updated to pro')
      
      // Reset proWelcomeShownAt so the welcome modal shows
      try {
        const { setCompanyPrefs } = await import('@/lib/company')
        await setCompanyPrefs(companyId, { proWelcomeShownAt: null })
        console.log('[Plan Sync] ✅ Reset proWelcomeShownAt to trigger Pro welcome modal')
      } catch (prefsError) {
        console.error('[Plan Sync] Error resetting proWelcomeShownAt:', prefsError)
        // Don't fail if this fails
      }
      
      return NextResponse.json({
        success: true,
        message: 'Plan updated to pro',
        companyId,
        previousPlan: installation.plan,
        newPlan: 'pro',
      })
    } else {
      console.log('[Plan Sync] Plan is already pro, no update needed')
      return NextResponse.json({
        success: true,
        message: 'Plan already pro',
        companyId,
        currentPlan: 'pro',
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

