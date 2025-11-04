/**
 * TASK 6 - Integrity debug route (admin-only)
 * 
 * GET /api/debug/integrity?companyId=xxx&secret=CRON_SECRET
 * 
 * Returns comprehensive integrity check for a given company
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'
import { getInstallationByCompany } from '@/lib/company'

export const runtime = 'nodejs'

// Known seed/demo data patterns
const SEED_PATTERNS = [
  { revenue: 1737.92, members: 95 }, // Example seed values
  { revenue: 1000, members: 50 },
]

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

    const notes: string[] = []
    let ok = true

    // Check installation
    const installation = await getInstallationByCompany(companyId)
    const installFound = !!installation

    if (!installFound) {
      ok = false
      notes.push('Installation not found')
    }

    // Check tokens
    const hasAccessToken = !!installation?.accessToken

    if (!hasAccessToken) {
      ok = false
      notes.push('Installation missing accessToken')
    }

    // Check metrics
    const metrics = await prisma.metricsDaily.findMany({
      where: { companyId },
      orderBy: { date: 'asc' },
    })

    const totalRows = metrics.length
    const oldestDate = metrics.length > 0 ? metrics[0].date.toISOString().split('T')[0] : null
    const newestDate = metrics.length > 0 ? metrics[metrics.length - 1].date.toISOString().split('T')[0] : null

    // Check for gaps in last 14 days
    const gaps: string[] = []
    if (newestDate) {
      const latest = new Date(newestDate)
      const fourteenDaysAgo = new Date()
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

      for (let d = new Date(fourteenDaysAgo); d <= latest; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0]
        const hasData = metrics.some(m => m.date.toISOString().split('T')[0] === dateStr)
        if (!hasData) {
          gaps.push(dateStr)
        }
      }
    }

    // Check for cross-tenant leaks
    const otherCompaniesCount = await prisma.metricsDaily.count({
      where: {
        companyId: { not: companyId },
      },
    })

    const crossTenantLeaks = otherCompaniesCount
    if (crossTenantLeaks > 0) {
      ok = false
      notes.push(`Found ${crossTenantLeaks} rows for other companies (should be 0 in query context)`)
    }

    // Check for hardcoded/seed data
    let hardcodedDataDetected = false
    for (const metric of metrics) {
      for (const pattern of SEED_PATTERNS) {
        if (
          Number(metric.grossRevenue) === pattern.revenue &&
          metric.activeMembers === pattern.members
        ) {
          hardcodedDataDetected = true
          notes.push(`Potential seed data detected: revenue=${pattern.revenue}, members=${pattern.members}`)
          break
        }
      }
    }

    // Latest computation source (simplified - would need audit table for full implementation)
    const latestComputation = {
      source: 'unknown' as 'webhook' | 'ingest' | 'manual' | 'unknown',
      lastSyncAt: newestDate ? new Date(newestDate).toISOString() : null,
    }

    // Final check
    if (!installFound || !hasAccessToken || crossTenantLeaks > 0) {
      ok = false
    }

    return NextResponse.json({
      ok,
      companyId,
      installFound,
      tokens: {
        hasAccessToken,
      },
      metrics: {
        totalRows,
        oldestDate,
        newestDate,
        gaps,
      },
      crossTenantLeaks: {
        rowsForOtherCompanies: crossTenantLeaks,
      },
      latestComputation,
      hardcodedDataDetected,
      notes,
    })
  } catch (error) {
    console.error('[Integrity Debug] Error:', error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

