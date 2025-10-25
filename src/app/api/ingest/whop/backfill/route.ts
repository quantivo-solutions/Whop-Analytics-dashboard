import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { performBackfill } from '@/lib/backfill'
import { env } from '@/lib/env'

export const runtime = 'nodejs'

/**
 * POST /api/ingest/whop/backfill?secret=CRON_SECRET&days=30&companyId=xyz
 * 
 * Backfill historical Whop metrics for the last N days
 * Protected endpoint - requires CRON_SECRET
 */
export async function POST(request: Request) {
  try {
    // Check secret authentication
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')

    if (!secret || secret !== env.CRON_SECRET) {
      console.warn('Unauthorized backfill request - invalid or missing secret')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const daysParam = searchParams.get('days')
    const daysToBackfill = daysParam ? parseInt(daysParam, 10) : 30

    if (isNaN(daysToBackfill) || daysToBackfill <= 0 || daysToBackfill > 365) {
      return NextResponse.json({ error: 'Invalid "days" parameter. Must be a number between 1 and 365.' }, { status: 400 })
    }

    // Get companyId from query param or use the first installation
    const companyIdParam = searchParams.get('companyId')
    let whopInstallation

    if (companyIdParam) {
      whopInstallation = await prisma.whopInstallation.findUnique({
        where: { companyId: companyIdParam },
      })
      if (!whopInstallation) {
        console.warn(`No Whop installation found for companyId: ${companyIdParam}`)
        return NextResponse.json({ ok: false, message: `No Whop installation found for companyId: ${companyIdParam}` }, { status: 404 })
      }
    } else {
      whopInstallation = await prisma.whopInstallation.findFirst()
      if (!whopInstallation) {
        console.warn('No Whop installation found. Skipping backfill.')
        return NextResponse.json({ ok: false, message: 'No Whop installation found' }, { status: 404 })
      }
    }

    const companyId = whopInstallation.companyId
    const accessToken = whopInstallation.accessToken

    // Use the shared backfill function
    const result = await performBackfill(companyId, accessToken, daysToBackfill)

    return NextResponse.json({
      ok: true,
      daysWritten: result.daysWritten,
      totalDays: result.totalDays,
      message: `Backfilled ${result.daysWritten} out of ${result.totalDays} days`
    })
  } catch (error) {
    console.error('Error during Whop backfill:', error)
    return NextResponse.json(
      { error: 'Failed to backfill Whop data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ingest/whop/backfill?secret=CRON_SECRET
 * 
 * Check backfill status and provide instructions
 */
export async function GET(request: Request) {
  try {
    // Check secret authentication
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')

    if (!secret || secret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get metrics count
    const metricsCount = await prisma.metricsDaily.count()
    const oldestMetric = await prisma.metricsDaily.findFirst({
      orderBy: { date: 'asc' },
    })
    const newestMetric = await prisma.metricsDaily.findFirst({
      orderBy: { date: 'desc' },
    })

    return NextResponse.json({
      ok: true,
      message: 'Whop backfill endpoint ready',
      usage: 'POST /api/ingest/whop/backfill?secret=CRON_SECRET&days=30',
      currentData: {
        totalRecords: metricsCount,
        oldestDate: oldestMetric?.date.toISOString().split('T')[0] || null,
        newestDate: newestMetric?.date.toISOString().split('T')[0] || null,
      },
    })
  } catch (error) {
    console.error('Error checking backfill status:', error)
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    )
  }
}

