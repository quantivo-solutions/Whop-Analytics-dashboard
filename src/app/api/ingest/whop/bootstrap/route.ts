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
      console.warn('[Bootstrap] Unauthorized bootstrap request - invalid or missing secret')
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const daysParam = searchParams.get('days')
    const daysToBackfill = daysParam ? parseInt(daysParam, 10) : 30

    if (isNaN(daysToBackfill) || daysToBackfill <= 0 || daysToBackfill > 365) {
      return NextResponse.json(
        { ok: false, error: 'Invalid "days" parameter. Must be a number between 1 and 365.' },
        { status: 400 }
      )
    }

    // Get companyId from query param (required)
    const companyIdParam = searchParams.get('companyId')
    if (!companyIdParam) {
      return NextResponse.json(
        { ok: false, error: 'Missing required "companyId" parameter' },
        { status: 400 }
      )
    }

    // Find installation for this company
    const whopInstallation = await prisma.whopInstallation.findFirst({
      where: { companyId: companyIdParam },
      orderBy: { updatedAt: 'desc' },
    })

    if (!whopInstallation) {
      console.warn(`[Bootstrap] No Whop installation found for companyId: ${companyIdParam}`)
      return NextResponse.json(
        { ok: false, companyId: companyIdParam, error: `No Whop installation found` },
        { status: 404 }
      )
    }

    if (!whopInstallation.accessToken) {
      console.warn(`[Bootstrap] Installation ${companyIdParam} missing accessToken`)
      return NextResponse.json(
        { ok: false, companyId: companyIdParam, error: `Installation missing accessToken` },
        { status: 400 }
      )
    }

    const companyId = whopInstallation.companyId
    const accessToken = whopInstallation.accessToken

    // Calculate date range
    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(today.getDate() - daysToBackfill)
    const endDate = new Date(today)
    endDate.setDate(today.getDate() - 1)

    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    console.log(`[Bootstrap] 🚀 Starting bootstrap for company ${companyId} for the last ${daysToBackfill} days...`)
    console.log(`[Bootstrap] Date range: ${startDateStr} to ${endDateStr}`)

    // Mark bootstrap as started
    await prisma.whopInstallation.update({
      where: { id: whopInstallation.id },
      data: {
        bootstrapStartedAt: new Date(),
        bootstrapCompletedAt: null,
        bootstrapError: null,
      },
    })

    try {
      // Use the shared backfill function
      const result = await performBackfill(companyId, accessToken, daysToBackfill)

      // Mark bootstrap as completed
      await prisma.whopInstallation.update({
        where: { id: whopInstallation.id },
        data: {
          bootstrapCompletedAt: new Date(),
          bootstrapError: null,
        },
      })

      console.log(`[Bootstrap] ✅ Bootstrap complete for company ${companyId}. Wrote ${result.daysWritten} out of ${result.totalDays} days.`)

      return NextResponse.json({
        ok: true,
        companyId,
        processedDays: result.daysWritten,
        startDate: startDateStr,
        endDate: endDateStr,
      })
    } catch (error) {
      // Mark bootstrap as failed
      const errorMessage = error instanceof Error ? error.message : String(error)
      await prisma.whopInstallation.update({
        where: { id: whopInstallation.id },
        data: {
          bootstrapError: errorMessage,
        },
      }).catch(() => {
        // Ignore update errors
      })

      console.error('[Bootstrap] ❌ Error during bootstrap:', error)
      return NextResponse.json(
        {
          ok: false,
          companyId,
          error: errorMessage,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[Bootstrap] ❌ Error during Whop bootstrap:', error)
    const { searchParams } = new URL(request.url)
    const companyIdParam = searchParams.get('companyId') || 'unknown'
    return NextResponse.json(
      {
        ok: false,
        companyId: companyIdParam,
        error: error instanceof Error ? error.message : String(error),
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

    // Get installation to check bootstrap status
    const installation = await prisma.whopInstallation.findFirst({
      where: { companyId: companyIdParam },
      orderBy: { updatedAt: 'desc' },
    })

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

    const bootstrapRunning = installation && 
      installation.bootstrapStartedAt && 
      !installation.bootstrapCompletedAt && 
      !installation.bootstrapError

    return NextResponse.json({
      ok: true,
      companyId: companyIdParam,
      message: 'Bootstrap status',
      bootstrapRunning,
      bootstrapCompleted: !!installation?.bootstrapCompletedAt,
      bootstrapError: installation?.bootstrapError || null,
      bootstrapStartedAt: installation?.bootstrapStartedAt?.toISOString() || null,
      bootstrapCompletedAt: installation?.bootstrapCompletedAt?.toISOString() || null,
      data: {
        totalRecords: metricsCount,
        oldestDate: oldestMetric?.date.toISOString().split('T')[0] || null,
        newestDate: newestMetric?.date.toISOString().split('T')[0] || null,
      },
    })
  } catch (error) {
    console.error('[Bootstrap] ❌ Error checking bootstrap status:', error)
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 })
  }
}

