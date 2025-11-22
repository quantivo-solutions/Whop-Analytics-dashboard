import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getUserPlan } from '@/lib/plan'
import { verifyWhopUserToken } from '@/lib/whop-auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/plan/current
 * 
 * Returns the current plan for the authenticated user from the database.
 * This is a lightweight endpoint for polling to detect plan changes.
 * 
 * Uses multiple methods to get userId:
 * 1. Session (primary)
 * 2. Whop user token (fallback for iframe)
 */
export async function GET(request: Request) {
  try {
    let userId: string | null = null
    
    // Method 1: Try session first
    try {
      const session = await getSession()
      userId = session?.userId || null
      console.log('[Plan Current] Session userId:', userId || 'none')
    } catch (sessionError) {
      console.warn('[Plan Current] Session error:', sessionError)
    }
    
    // Method 2: Fallback to Whop token if session fails (iframe context)
    if (!userId) {
      try {
        const whopUser = await verifyWhopUserToken()
        userId = whopUser?.userId || null
        console.log('[Plan Current] Whop token userId:', userId || 'none')
      } catch (whopError) {
        console.warn('[Plan Current] Whop token error:', whopError)
      }
    }
    
    if (!userId) {
      console.error('[Plan Current] No userId found from session or Whop token')
      return NextResponse.json(
        { error: 'No userId in session or Whop token' },
        { status: 401 }
      )
    }
    
    // Get current plan from our database
    const currentPlan = await getUserPlan(userId)
    
    // Also get the updatedAt timestamp from UserPlan to detect changes
    let planUpdatedAt: string | null = null
    try {
      const userPlan = await prisma.userPlan.findUnique({
        where: { userId },
        select: { updatedAt: true },
      })
      planUpdatedAt = userPlan?.updatedAt?.toISOString() || null
    } catch (error) {
      console.warn('[Plan Current] Could not fetch plan timestamp:', error)
    }
    
    console.log('[Plan Current] Returning plan:', currentPlan, 'updatedAt:', planUpdatedAt)
    
    return NextResponse.json({
      success: true,
      plan: currentPlan,
      currentPlan, // Also return as currentPlan for consistency
      planUpdatedAt, // Include timestamp to detect changes
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('[Plan Current] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get plan', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

