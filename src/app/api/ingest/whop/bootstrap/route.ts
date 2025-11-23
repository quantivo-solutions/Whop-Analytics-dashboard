import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { performBackfill } from '@/lib/backfill'
import { env } from '@/lib/env'

export const runtime = 'nodejs'

/**
 * POST /api/ingest/whop/bootstrap?secret=CRON_SECRET&companyId=xyz&days=30
 * 
 * Bootstrap/backfill historical Whop metrics for a specific company
 * This is triggered automatically on installation to fetch historical data
 * Protected endpoint - requires CRON_SECRET
 */
export async function POST(request: Request) {
  try {
    // Check secret authentication
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')

    if (!secret || secret !== env.CRON_SECRET) {
      console.warn('[Whoplytics] Unauthorized bootstrap request - invalid or missing secret')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const daysParam = searchParams.get('days')
    const daysToBackfill = daysParam ? parseInt(daysParam, 10) : 30

    if (isNaN(daysToBackfill) || daysToBackfill <= 0 || daysToBackfill > 365) {
      return NextResponse.json(
        { error: 'Invalid "days" parameter. Must be a number between 1 and 365.' },
        { status: 400 }
      )
    }

    // Get companyId from query param (required)
    const companyIdParam = searchParams.get('companyId')
    if (!companyIdParam) {
      return NextResponse.json(
        { error: 'Missing required "companyId" parameter' },
        { status: 400 }
      )
    }

    // Find installation for this company
    const whopInstallation = await prisma.whopInstallation.findFirst({
      where: { companyId: companyIdParam },
      orderBy: { updatedAt: 'desc' },
    })

    if (!whopInstallation) {
      console.warn(`[Whoplytics] No Whop installation found for companyId: ${companyIdParam}`)
      return NextResponse.json(
        { ok: false, message: `No Whop installation found for companyId: ${companyIdParam}` },
        { status: 404 }
      )
    }

    if (!whopInstallation.accessToken) {
      console.warn(`[Whoplytics] Installation ${companyIdParam} missing accessToken`)
      return NextResponse.json(
        { ok: false, message: `Installation missing accessToken` },
        { status: 400 }
      )
    }

    const companyId = whopInstallation.companyId
    const accessToken = whopInstallation.accessToken

    console.log(`[Whoplytics] 🚀 Starting bootstrap backfill for company ${companyId} for the last ${daysToBackfill} days...`)

    // Use the shared backfill function
    const result = await performBackfill(companyId, accessToken, daysToBackfill)

    console.log(`[Whoplytics] ✅ Bootstrap complete for company ${companyId}. Wrote ${result.daysWritten} out of ${result.totalDays} days.`)

    return NextResponse.json({
      ok: true,
      companyId,
      daysWritten: result.daysWritten,
      totalDays: result.totalDays,
      message: `Bootstrap backfilled ${result.daysWritten} out of ${result.totalDays} days for company ${companyId}`,
    })
  } catch (error) {
    console.error('[Whoplytics] Error during Whop bootstrap:', error)
    return NextResponse.json(
      {
        error: 'Failed to bootstrap Whop data',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ingest/whop/bootstrap?secret=CRON_SECRET&companyId=xyz
 * 
 * Check bootstrap status for a specific company
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

    // Get metrics count for this company
    const metricsCount = await prisma.metricsDaily.count({
      where: { companyId: companyIdParam },
    })

    const oldestMetric = await prisma.metricsDaily.findFirst({
      where: { companyId: companyIdParam },
      orderBy: { date: 'asc' },
    })

    const newestMetric = await prisma.metricsDaily.findFirst({
      where: { companyId: companyIdParam },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json({
      ok: true,
      companyId: companyIdParam,
      message: 'Bootstrap status',
      data: {
        totalRecords: metricsCount,
        oldestDate: oldestMetric?.date.toISOString().split('T')[0] || null,
        newestDate: newestMetric?.date.toISOString().split('T')[0] || null,
      },
    })
  } catch (error) {
    console.error('[Whoplytics] Error checking bootstrap status:', error)
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 })
  }
}

