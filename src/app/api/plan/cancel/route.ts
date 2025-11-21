import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getUserPlan, setUserPlan } from '@/lib/plan'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/plan/cancel
 * 
 * Manually cancel/downgrade the user's plan to 'free'.
 * This is useful for testing cancellation flow or as a fallback if webhooks fail.
 */
export async function POST(request: Request) {
  try {
    console.log('[Plan Cancel] ===== MANUAL CANCELLATION REQUEST =====')
    
    // Get session to find userId
    const session = await getSession()
    
    if (!session?.userId) {
      console.error('[Plan Cancel] No userId in session')
      return NextResponse.json(
        { error: 'No userId in session' },
        { status: 401 }
      )
    }
    
    const userId = session.userId
    console.log('[Plan Cancel] User ID:', userId)
    
    // Get current plan
    const currentPlan = await getUserPlan(userId)
    console.log('[Plan Cancel] Current plan:', currentPlan)
    
    if (currentPlan === 'free') {
      return NextResponse.json({
        success: true,
        message: 'User already has free plan',
        userId,
        currentPlan: 'free',
      })
    }
    
    // Downgrade to free
    console.log('[Plan Cancel] Downgrading user plan from', currentPlan, 'to free')
    await setUserPlan(userId, 'free')
    console.log('[Plan Cancel] ✅ User plan downgraded to free')
    
    // Update all installations for this user
    try {
      const installations = await prisma.whopInstallation.findMany({
        where: { userId },
      })
      
      const { setCompanyPrefs } = await import('@/lib/company')
      for (const inst of installations) {
        // Reset onboarding (user cancelled, may want to re-onboard)
        await setCompanyPrefs(inst.companyId, { completedAt: null })
        
        // Update installation timestamp
        await prisma.whopInstallation.update({
          where: {
            companyId_userId: {
              companyId: inst.companyId,
              userId: inst.userId,
            },
          },
          data: {
            updatedAt: new Date(),
          },
        })
      }
      console.log('[Plan Cancel] ✅ Updated', installations.length, 'installation(s)')
    } catch (updateError) {
      console.error('[Plan Cancel] Error updating installations:', updateError)
      // Don't fail if this fails
    }
    
    return NextResponse.json({
      success: true,
      message: 'User plan downgraded to free',
      userId,
      previousPlan: currentPlan,
      newPlan: 'free',
    })
  } catch (error) {
    console.error('[Plan Cancel] Error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel plan', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

