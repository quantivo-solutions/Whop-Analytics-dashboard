import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchDailySummary } from '@/lib/whop'
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

    console.log(`🚀 Starting Whop data backfill for company ${companyId} for the last ${daysToBackfill} days...`)

    let daysWritten = 0
    const today = new Date()

    for (let i = daysToBackfill - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD

      try {
        console.log(`  Processing ${dateStr}...`)
        const summary = await fetchDailySummary(dateStr, accessToken)

        await prisma.metricsDaily.upsert({
          where: {
            companyId_date: {
              companyId: companyId,
              date: new Date(dateStr),
            },
          },
          update: {
            grossRevenue: summary.grossRevenue,
            activeMembers: summary.activeMembers,
            newMembers: summary.newMembers,
            cancellations: summary.cancellations,
            trialsStarted: summary.trialsStarted,
            trialsPaid: summary.trialsPaid,
          },
          create: {
            companyId: companyId,
            date: new Date(dateStr),
            grossRevenue: summary.grossRevenue,
            activeMembers: summary.activeMembers,
            newMembers: summary.newMembers,
            cancellations: summary.cancellations,
            trialsStarted: summary.trialsStarted,
            trialsPaid: summary.trialsPaid,
          },
        })

        daysWritten++
        console.log(`  ✅ ${dateStr}: $${summary.grossRevenue.toFixed(2)}, ${summary.activeMembers} active, ${summary.newMembers} new`)

        // Small delay to avoid rate limiting (100ms between requests)
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`  ❌ Error processing ${dateStr}:`, error)
        // Continue processing remaining days even if one fails
      }
    }

    console.log(`🎉 Backfill complete for company ${companyId}. Wrote ${daysWritten} out of ${daysToBackfill} days.`)
    return NextResponse.json({ ok: true, daysWritten, totalDays: daysToBackfill, message: `Backfilled ${daysWritten} out of ${daysToBackfill} days` })
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

