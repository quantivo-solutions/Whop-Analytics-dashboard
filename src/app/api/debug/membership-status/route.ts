import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { verifyWhopUserToken } from '@/lib/whop-auth'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'
import { getUserPlan } from '@/lib/plan'

/**
 * GET /api/debug/membership-status
 * 
 * Debug endpoint to check actual membership status from Whop API
 * Shows what the API actually returns so we can fix the membership check
 */
export async function GET(request: Request) {
  try {
    console.log('[Debug Membership] ===== MEMBERSHIP STATUS CHECK =====')
    
    // Get session
    const session = await getSession()
    const whopUser = await verifyWhopUserToken().catch(() => null)
    
    const userId = whopUser?.userId || session?.userId
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No userId found' },
        { status: 401 }
      )
    }
    
    console.log('[Debug Membership] User ID:', userId)
    
    // Get current plan from DB
    const currentPlan = await getUserPlan(userId)
    console.log('[Debug Membership] Current plan in DB:', currentPlan)
    
    // Get installation to use access token
    const installation = await prisma.whopInstallation.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    })
    
    console.log('[Debug Membership] Installation:', {
      companyId: installation?.companyId,
      hasAccessToken: !!installation?.accessToken,
    })
    
    // Try multiple endpoints and tokens
    const results: any[] = []
    
    const tokens = [
      { token: installation?.accessToken, label: 'installation.accessToken' },
      { token: env.WHOP_APP_SERVER_KEY, label: 'WHOP_APP_SERVER_KEY' },
    ]
    
    const endpoints = [
      `/api/v5/users/${userId}/memberships`,
      `/api/v5/me/memberships`,
      `/api/v2/memberships?user_id=${userId}`,
    ]
    
    for (const tokenInfo of tokens) {
      if (!tokenInfo.token) continue
      
      for (const endpoint of endpoints) {
        try {
          const url = endpoint.startsWith('http') 
            ? endpoint 
            : `https://api.whop.com${endpoint}`
          
          console.log(`[Debug Membership] Trying: ${url} with ${tokenInfo.label}`)
          
          const response = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${tokenInfo.token}`,
            },
            cache: 'no-store',
          })
          
          const responseText = await response.text()
          let responseData: any = null
          
          try {
            responseData = JSON.parse(responseText)
          } catch {
            responseData = { raw: responseText }
          }
          
          results.push({
            endpoint,
            token: tokenInfo.label,
            status: response.status,
            ok: response.ok,
            data: responseData,
            dataKeys: responseData ? Object.keys(responseData) : [],
            isArray: Array.isArray(responseData),
            hasDataArray: Array.isArray(responseData?.data),
            membershipsCount: Array.isArray(responseData) 
              ? responseData.length 
              : Array.isArray(responseData?.data) 
                ? responseData.data.length 
                : 0,
          })
          
          if (response.ok) {
            console.log(`[Debug Membership] ✅ Success with ${endpoint} using ${tokenInfo.label}`)
            console.log(`[Debug Membership] Response structure:`, {
              isArray: Array.isArray(responseData),
              hasData: !!responseData?.data,
              keys: Object.keys(responseData || {}),
            })
          }
        } catch (error) {
          results.push({
            endpoint,
            token: tokenInfo.label,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    }
    
    // Analyze memberships if found
    let analyzedMemberships: any[] = []
    for (const result of results) {
      if (result.ok && result.data) {
        const memberships = Array.isArray(result.data) 
          ? result.data 
          : Array.isArray(result.data?.data) 
            ? result.data.data 
            : []
        
        for (const m of memberships) {
          analyzedMemberships.push({
            id: m.id,
            status: m.status || m.state || m.membership_status || m.access_status,
            productId: m.product?.id || m.access_pass?.id || m.product_id || m.plan?.id || m.plan_id,
            productName: m.product?.name || m.access_pass?.name,
            planId: m.plan?.id || m.plan_id,
            allKeys: Object.keys(m),
            fullData: m,
          })
        }
      }
    }
    
    return NextResponse.json({
      userId,
      currentPlanInDB: currentPlan,
      installation: {
        companyId: installation?.companyId,
        hasAccessToken: !!installation?.accessToken,
      },
      apiResults: results,
      analyzedMemberships,
      planId: process.env.NEXT_PUBLIC_WHOP_PRO_PLAN_ID,
    })
  } catch (error) {
    console.error('[Debug Membership] Error:', error)
    return NextResponse.json(
      { error: 'Failed to check membership', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

