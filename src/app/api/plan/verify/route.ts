import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getUserPlan, setUserPlan } from '@/lib/plan'
import { verifyWhopUserToken } from '@/lib/whop-auth'
import { env } from '@/lib/env'

/**
 * POST /api/plan/verify
 * 
 * Verifies the user's plan status by checking Whop API directly
 * and syncing with our UserPlan table.
 * 
 * This is useful as a fallback if webhooks fail or for manual verification.
 */
export async function POST(request: Request) {
  try {
    console.log('[Plan Verify] ===== VERIFY REQUEST =====')
    
    // Get session to find userId
    const session = await getSession()
    
    if (!session?.userId) {
      console.error('[Plan Verify] No userId in session')
      return NextResponse.json(
        { error: 'No userId in session' },
        { status: 401 }
      )
    }
    
    const userId = session.userId
    console.log('[Plan Verify] User ID:', userId)
    
    // Get current plan from our database
    const currentPlan = await getUserPlan(userId)
    console.log('[Plan Verify] Current plan in DB:', currentPlan)
    
    // Verify with Whop API by checking user's active memberships
    try {
      // Get Whop user token for API calls
      const whopUser = await verifyWhopUserToken()
      if (!whopUser?.userId || whopUser.userId !== userId) {
        console.warn('[Plan Verify] Whop user token verification failed or userId mismatch')
        return NextResponse.json({
          success: false,
          message: 'Could not verify Whop user',
          currentPlan,
        })
      }
      
      // Check user's active memberships/products via Whop API
      // This checks if user has an active Pro subscription
      // Note: We check for any active membership - if user has active membership, they're Pro
      // The specific product/plan ID check can be added if needed
      const membershipsResponse = await fetch(`https://api.whop.com/api/v2/memberships?user_id=${userId}&status=active`, {
        headers: {
          'Authorization': `Bearer ${env.WHOP_APP_SERVER_KEY}`,
        },
      })
      
      let hasActiveProMembership = false
      let apiVerificationFailed = false
      
      if (membershipsResponse.ok) {
        const membershipsData = await membershipsResponse.json()
        console.log('[Plan Verify] Active memberships response:', {
          status: membershipsResponse.status,
          dataLength: membershipsData.data?.length || 0,
        })
        
        // If user has any active memberships, they likely have Pro
        // This is a simplified check - can be refined with specific product/plan ID if needed
        if (membershipsData.data && Array.isArray(membershipsData.data) && membershipsData.data.length > 0) {
          hasActiveProMembership = true
          console.log('[Plan Verify] User has active memberships:', membershipsData.data.length)
        }
      } else {
        const errorText = await membershipsResponse.text().catch(() => '')
        console.warn('[Plan Verify] Failed to fetch memberships:', membershipsResponse.status, errorText)
        apiVerificationFailed = true
        
        // If API verification fails (401, 403, etc.), don't downgrade!
        // Only trust webhooks and manual sync for downgrades
        // This prevents false downgrades when API permissions are missing
        console.warn('[Plan Verify] ⚠️ API verification failed - NOT downgrading plan (trusting webhooks instead)')
      }
      
      // Determine correct plan based on Whop API
      // CRITICAL: Only downgrade if API verification SUCCEEDED and confirmed no membership
      // If API verification failed, keep current plan (don't downgrade)
      const correctPlan = hasActiveProMembership ? 'pro' : (apiVerificationFailed ? currentPlan : 'free')
      
      console.log('[Plan Verify] Plan status from Whop API:', {
        hasActiveProMembership,
        apiVerificationFailed,
        correctPlan,
        currentPlanInDB: currentPlan,
      })
      
      // Sync if there's a mismatch AND we successfully verified with API
      // Don't downgrade if API verification failed
      if (currentPlan !== correctPlan && !apiVerificationFailed) {
        console.log(`[Plan Verify] ⚠️ Plan mismatch detected! Updating from ${currentPlan} to ${correctPlan}`)
        await setUserPlan(userId, correctPlan)
        
        return NextResponse.json({
          success: true,
          message: `Plan synced: ${currentPlan} → ${correctPlan}`,
          previousPlan: currentPlan,
          newPlan: correctPlan,
          currentPlan: correctPlan,
          plan: correctPlan, // Also return as 'plan' for consistency
          synced: true,
        })
      } else if (apiVerificationFailed) {
        console.log('[Plan Verify] ⚠️ API verification failed - keeping current plan:', currentPlan)
        return NextResponse.json({
          success: true,
          message: 'API verification unavailable - keeping current plan',
          currentPlan,
          plan: currentPlan, // Also return as 'plan' for consistency
          synced: false,
          apiVerificationFailed: true,
        })
      } else {
        console.log('[Plan Verify] ✅ Plan is in sync')
        return NextResponse.json({
          success: true,
          message: 'Plan is correct',
          currentPlan,
          plan: currentPlan, // Also return as 'plan' for consistency
          synced: false,
        })
      }
    } catch (whopError) {
      console.error('[Plan Verify] Error verifying with Whop API:', whopError)
      return NextResponse.json({
        success: false,
        message: 'Could not verify with Whop API',
        currentPlan,
        error: whopError instanceof Error ? whopError.message : String(whopError),
      }, { status: 500 })
    }
  } catch (error) {
    console.error('[Plan Verify] Error:', error)
    return NextResponse.json(
      { error: 'Failed to verify plan', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

