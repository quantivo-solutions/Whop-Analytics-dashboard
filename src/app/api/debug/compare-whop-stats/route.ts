import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { whopGET } from '@/lib/whop-rest'
import { env } from '@/lib/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Debug endpoint to compare our stats with Whop's dashboard
 * GET /api/debug/compare-whop-stats?companyId=biz_xxx&secret=CRON_SECRET
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
      return NextResponse.json({ error: 'Installation not found' }, { status: 404 })
    }

    const accessToken = installation.accessToken

    // Test 1: Fetch ALL active memberships (no date filter, no company_id filter)
    console.log('[DEBUG] Test 1: Fetching ALL active memberships (no filters)...')
    let allActiveMemberships: any[] = []
    let page = 1
    let hasMorePages = true
    
    while (hasMorePages) {
      const response = await whopGET<{ 
        data?: any[]
        pagination?: { 
          current_page?: number
          total_pages?: number
          next?: string | null
          total?: number
        }
      }>('/app/memberships', {
        valid: true, // Match Whop's definition: valid=true means active
        limit: 100,
        page,
      }, accessToken)
      
      if (response.data) {
        allActiveMemberships = allActiveMemberships.concat(response.data)
      }
      
      if (response.pagination?.total !== undefined) {
        console.log(`[DEBUG] API reports total: ${response.pagination.total}`)
      }
      
      if (response.pagination?.next) {
        page++
      } else {
        hasMorePages = false
      }
      
      if (page > 10) break // Safety limit
    }
    
    // Filter by companyId client-side
    const filteredByCompany = allActiveMemberships.filter(m => {
      const mCompanyId = m.company_id || m.companyId || m.company?.id || m.product?.company_id || m.product?.companyId
      return mCompanyId === companyId
    })
    
    // Test 2: Fetch with company_id filter
    console.log('[DEBUG] Test 2: Fetching active memberships WITH company_id filter...')
    let filteredActiveMemberships: any[] = []
    page = 1
    hasMorePages = true
    
    while (hasMorePages) {
      const response = await whopGET<{ 
        data?: any[]
        pagination?: { 
          current_page?: number
          total_pages?: number
          next?: string | null
          total?: number
        }
      }>('/app/memberships', {
        valid: true, // Match Whop's definition: valid=true means active
        company_id: companyId,
        limit: 100,
        page,
      }, accessToken)
      
      if (response.data) {
        filteredActiveMemberships = filteredActiveMemberships.concat(response.data)
      }
      
      if (response.pagination?.total !== undefined) {
        console.log(`[DEBUG] API reports total with company_id filter: ${response.pagination.total}`)
      }
      
      if (response.pagination?.next) {
        page++
      } else {
        hasMorePages = false
      }
      
      if (page > 10) break // Safety limit
    }
    
    // Test 2b: Fetch ALL memberships (no valid filter) with company_id filter
    console.log('[DEBUG] Test 2b: Fetching ALL memberships WITH company_id filter (no valid filter)...')
    let allMembershipsWithCompany: any[] = []
    page = 1
    hasMorePages = true
    
    while (hasMorePages) {
      const response = await whopGET<{ 
        data?: any[]
        pagination?: { 
          current_page?: number
          total_pages?: number
          next?: string | null
          total?: number
        }
      }>('/app/memberships', {
        company_id: companyId, // No valid filter - get ALL memberships
        limit: 100,
        page,
      }, accessToken)
      
      if (response.data) {
        allMembershipsWithCompany = allMembershipsWithCompany.concat(response.data)
      }
      
      if (response.pagination?.total !== undefined) {
        console.log(`[DEBUG] API reports total with company_id filter (all memberships): ${response.pagination.total}`)
      }
      
      if (response.pagination?.next) {
        page++
      } else {
        hasMorePages = false
      }
      
      if (page > 10) break // Safety limit
    }
    
    // Analyze the differences
    const validCount = filteredActiveMemberships.filter(m => m.valid === true).length
    const invalidCount = allMembershipsWithCompany.filter(m => m.valid === false || !m.valid).length
    const statusBreakdown = allMembershipsWithCompany.reduce((acc: any, m: any) => {
      const status = m.status || 'unknown'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})
    
    // Test 3: Get our database stats
    const latestMetric = await prisma.metricsDaily.findFirst({
      where: { companyId },
      orderBy: { date: 'desc' },
    })
    
    // Test 4: Check membership structure
    const sampleMembership = filteredActiveMemberships[0] || allActiveMemberships[0]
    
    return NextResponse.json({
      companyId,
      comparison: {
        whopAllActive: allActiveMemberships.length,
        whopFilteredByCompany: filteredByCompany.length,
        whopCompanyIdFilterActive: filteredActiveMemberships.length, // valid=true only
        whopCompanyIdFilterAll: allMembershipsWithCompany.length, // ALL memberships
        validCount,
        invalidCount,
        statusBreakdown,
        ourDatabaseActive: latestMetric?.activeMembers ?? 0,
        ourDatabaseNewMembers: latestMetric?.newMembers ?? 0,
        ourDatabaseCancellations: latestMetric?.cancellations ?? 0,
      },
      sampleMembership: sampleMembership ? {
        id: sampleMembership.id,
        company_id: sampleMembership.company_id,
        companyId: sampleMembership.companyId,
        company: sampleMembership.company,
        product: sampleMembership.product,
        status: sampleMembership.status,
        valid: sampleMembership.valid,
        created_at: sampleMembership.created_at,
        allKeys: Object.keys(sampleMembership),
      } : null,
      activeMemberships: filteredActiveMemberships.map(m => ({
        id: m.id,
        status: m.status,
        valid: m.valid,
      })),
      allMemberships: allMembershipsWithCompany.map(m => ({
        id: m.id,
        status: m.status,
        valid: m.valid,
      })),
    })
  } catch (error: any) {
    console.error('[DEBUG] Error in compare-whop-stats endpoint:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

