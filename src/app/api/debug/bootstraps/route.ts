import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'

export const runtime = 'nodejs'

/**
 * GET /api/debug/bootstraps?secret=CRON_SECRET&companyId=xyz&startDate=2025-01-01&endDate=2025-01-31
 * 
 * Debug endpoint to inspect bootstrap/backfill data for a specific company
 * Returns metricsDaily rows for the specified date range
 */
export async function GET(request: Request) {
  try {
    // Check secret authentication
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')

    if (!secret || secret !== env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const companyIdParam = searchParams.get('companyId')
    if (!companyIdParam) {
      return NextResponse.json(
        { error: 'Missing required "companyId" parameter' },
        { status: 400 }
      )
    }

    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    // Build where clause
    const where: any = {
      companyId: companyIdParam,
    }

    if (startDateParam || endDateParam) {
      where.date = {}
      if (startDateParam) {
        where.date.gte = new Date(startDateParam)
      }
      if (endDateParam) {
        where.date.lte = new Date(endDateParam)
      }
    }

    // Get metrics for this company
    const metrics = await prisma.metricsDaily.findMany({
      where,
      orderBy: { date: 'asc' },
    })

    // Get summary stats
    const totalRecords = metrics.length
    const totalRevenue = metrics.reduce((sum, m) => sum + Number(m.grossRevenue), 0)
    const maxActiveMembers = Math.max(...metrics.map((m) => m.activeMembers), 0)
    const totalNewMembers = metrics.reduce((sum, m) => sum + m.newMembers, 0)
    const totalCancellations = metrics.reduce((sum, m) => sum + m.cancellations, 0)

    return NextResponse.json({
      ok: true,
      companyId: companyIdParam,
      dateRange: {
        startDate: startDateParam || 'all',
        endDate: endDateParam || 'all',
      },
      summary: {
        totalRecords,
        totalRevenue: totalRevenue.toFixed(2),
        maxActiveMembers,
        totalNewMembers,
        totalCancellations,
      },
      metrics: metrics.map((m) => ({
        date: m.date.toISOString().split('T')[0],
        grossRevenue: Number(m.grossRevenue),
        activeMembers: m.activeMembers,
        newMembers: m.newMembers,
        cancellations: m.cancellations,
        trialsStarted: m.trialsStarted,
        trialsPaid: m.trialsPaid,
      })),
    })
  } catch (error) {
    console.error('[Whoplytics] Error fetching bootstrap debug data:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch bootstrap data',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

