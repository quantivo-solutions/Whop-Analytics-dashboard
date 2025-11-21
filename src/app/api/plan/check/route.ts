import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getUserPlan } from '@/lib/plan'
import { verifyWhopUserToken } from '@/lib/whop-auth'

/**
 * GET /api/plan/check
 * 
 * Check if the current user already has Pro plan (user-level entitlement)
 * Used by UpsellModal to prevent duplicate purchases
 */
export async function GET() {
  try {
    // Get userId from session or Whop iframe auth
    const session = await getSession().catch(() => null)
    const whopUser = await verifyWhopUserToken().catch(() => null)
    
    const userId = whopUser?.userId || session?.userId
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    // Get user-level plan
    const plan = await getUserPlan(userId)
    const hasPro = plan === 'pro' || plan === 'business'
    
    return NextResponse.json({
      userId,
      plan,
      hasPro,
    })
  } catch (error) {
    console.error('[Plan Check] Error:', error)
    return NextResponse.json(
      { error: 'Failed to check plan', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

