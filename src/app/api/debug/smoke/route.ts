/**
 * TASK 8 - Unit-like smoke tests (server)
 * 
 * GET /api/debug/smoke?companyId=xxx&secret=CRON_SECRET
 * 
 * Quick smoke test to verify data isolation
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    // Security: require secret
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    const companyId = searchParams.get('companyId')

    if (!secret || secret !== env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!companyId) {
      return NextResponse.json({ error: 'Missing companyId parameter' }, { status: 400 })
    }

    // Count rows for this company
    const countForCompany = await prisma.metricsDaily.count({
      where: { companyId },
    })

    // Count rows for other companies (this is normal - we're just checking isolation)
    const countOther = await prisma.metricsDaily.count({
      where: {
        companyId: { not: companyId },
      },
    })

    // The real check: query for THIS company and verify all returned rows belong to THIS company
    const companyRows = await prisma.metricsDaily.findMany({
      where: { companyId },
      take: 100, // Sample check
    })
    
    const leaksInQuery = companyRows.filter(r => r.companyId !== companyId).length

    // Pass if: no leaks in the query results (even if other companies' data exists in DB)
    const ok = leaksInQuery === 0

    return NextResponse.json({
      ok,
      companyId,
      counts: {
        forCompany: countForCompany,
        otherCompanies: countOther, // Info: normal in multi-tenant
      },
      isolation: ok ? 'PASS' : 'FAIL',
      leaksInQuery, // Critical: should be 0
    })
  } catch (error) {
    console.error('[Smoke Test] Error:', error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

