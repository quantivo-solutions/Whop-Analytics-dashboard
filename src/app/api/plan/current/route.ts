import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getUserPlan } from '@/lib/plan'

/**
 * GET /api/plan/current
 * 
 * Returns the current plan for the authenticated user from the database.
 * This is a lightweight endpoint for polling to detect plan changes.
 */
export async function GET(request: Request) {
  try {
    // Get session to find userId
    const session = await getSession()
    
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'No userId in session' },
        { status: 401 }
      )
    }
    
    const userId = session.userId
    
    // Get current plan from our database
    const currentPlan = await getUserPlan(userId)
    
    return NextResponse.json({
      success: true,
      plan: currentPlan,
      currentPlan, // Also return as currentPlan for consistency
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Plan Current] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get plan', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

