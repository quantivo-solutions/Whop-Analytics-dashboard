import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { whopGET } from '@/lib/whop-rest'
import { env } from '@/lib/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Debug endpoint to test membership fetching
 * GET /api/debug/test-memberships?companyId=biz_xxx&secret=CRON_SECRET
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    const companyId = searchParams.get('companyId')
    
    if (!secret || secret !== env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (!companyId) {
      return NextResponse.json({ error: 'Missing companyId' }, { status: 400 })
    }
    
    // Get installation
    const installation = await prisma.whopInstallation.findFirst({
      where: { companyId },
      orderBy: { updatedAt: 'desc' },
    })
    
    if (!installation || !installation.accessToken) {
      return NextResponse.json({ error: 'No installation found' }, { status: 404 })
    }
    
    const accessToken = installation.accessToken
    
    // Test 1: Fetch memberships WITHOUT company_id filter
    console.log('[Debug] Test 1: Fetching memberships WITHOUT company_id filter...')
    let response1
    try {
      response1 = await whopGET<{ data?: any[] }>('/memberships', {
        limit: 10,
        page: 1,
      }, accessToken)
      console.log('[Debug] Test 1 Result:', {
        count: response1.data?.length || 0,
        sample: response1.data?.[0] || null,
      })
    } catch (error: any) {
      console.error('[Debug] Test 1 Error:', error.message)
      response1 = { error: error.message }
    }
    
    // Test 2: Fetch memberships WITH company_id filter
    console.log('[Debug] Test 2: Fetching memberships WITH company_id filter...')
    let response2
    try {
      response2 = await whopGET<{ data?: any[] }>('/memberships', {
        company_id: companyId,
        limit: 10,
        page: 1,
      }, accessToken)
      console.log('[Debug] Test 2 Result:', {
        count: response2.data?.length || 0,
        sample: response2.data?.[0] || null,
      })
    } catch (error: any) {
      console.error('[Debug] Test 2 Error:', error.message)
      response2 = { error: error.message }
    }
    
    // Test 3: Fetch memberships for last 30 days WITHOUT company_id
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const startTime = thirtyDaysAgo.toISOString()
    
    console.log('[Debug] Test 3: Fetching memberships (last 30 days) WITHOUT company_id filter...')
    let response3
    try {
      response3 = await whopGET<{ data?: any[] }>('/memberships', {
        created_after: startTime,
        limit: 10,
        page: 1,
      }, accessToken)
      console.log('[Debug] Test 3 Result:', {
        count: response3.data?.length || 0,
        sample: response3.data?.[0] || null,
      })
    } catch (error: any) {
      console.error('[Debug] Test 3 Error:', error.message)
      response3 = { error: error.message }
    }
    
    // Test 4: Fetch memberships for last 30 days WITH company_id
    console.log('[Debug] Test 4: Fetching memberships (last 30 days) WITH company_id filter...')
    let response4
    try {
      response4 = await whopGET<{ data?: any[] }>('/memberships', {
        created_after: startTime,
        company_id: companyId,
        limit: 10,
        page: 1,
      }, accessToken)
      console.log('[Debug] Test 4 Result:', {
        count: response4.data?.length || 0,
        sample: response4.data?.[0] || null,
      })
    } catch (error: any) {
      console.error('[Debug] Test 4 Error:', error.message)
      response4 = { error: error.message }
    }
    
    return NextResponse.json({
      companyId,
      installation: {
        companyId: installation.companyId,
        experienceId: installation.experienceId,
        userId: installation.userId,
      },
      tests: {
        test1_noCompanyFilter: response1,
        test2_withCompanyFilter: response2,
        test3_last30Days_noCompanyFilter: response3,
        test4_last30Days_withCompanyFilter: response4,
      },
    })
  } catch (error: any) {
    console.error('[Debug] Error:', error)
    return NextResponse.json(
      { error: 'Failed', details: error.message },
      { status: 500 }
    )
  }
}

