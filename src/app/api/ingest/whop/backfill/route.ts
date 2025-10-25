import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchDailySummary } from '@/lib/whop'

export const runtime = 'nodejs'

/**
 * POST /api/ingest/whop/backfill?secret=CRON_SECRET&days=30
 * 
 * Backfill historical Whop metrics for the last N days
 * Protected endpoint - requires CRON_SECRET
 */
export async function POST(request: Request) {
  try {
    // Check secret authentication
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')

    if (!secret || secret !== process.env.CRON_SECRET) {
      console.error('Unauthorized Whop backfill request - invalid or missing secret')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get number of days to backfill (default 30, max 90)
    const daysParam = searchParams.get('days')
    let days = daysParam ? parseInt(daysParam, 10) : 30
    
    // Validate days parameter
    if (isNaN(days) || days < 1) {
      days = 30
    }
    if (days > 90) {
      days = 90
    }

    console.log(`📥 Starting Whop backfill for last ${days} days...`)

    let daysWritten = 0

    // Loop through each day and upsert
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setUTCDate(date.getUTCDate() - i)
      date.setUTCHours(0, 0, 0, 0)
      const dateString = date.toISOString().split('T')[0]

      try {
        console.log(`  Processing ${dateString}...`)

        // Fetch data from Whop using fetchDailySummary
        const summary = await fetchDailySummary(dateString)

        // Always upsert into database, even if all zeros
        await prisma.metricsDaily.upsert({
          where: {
            date: date,
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
            date: date,
            grossRevenue: summary.grossRevenue,
            activeMembers: summary.activeMembers,
            newMembers: summary.newMembers,
            cancellations: summary.cancellations,
            trialsStarted: summary.trialsStarted,
            trialsPaid: summary.trialsPaid,
          },
        })

        daysWritten++
        console.log(`  ✅ ${dateString}: $${summary.grossRevenue.toFixed(2)}, ${summary.activeMembers} active, ${summary.newMembers} new`)

        // Small delay to avoid rate limiting (100ms between requests)
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`  ❌ Error processing ${dateString}:`, error)
        // Continue processing remaining days even if one fails
      }
    }

    console.log(`✅ Backfill complete: ${daysWritten}/${days} days written`)

    return NextResponse.json({
      ok: true,
      daysWritten,
      totalDays: days,
      message: `Backfilled ${daysWritten} out of ${days} days`,
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

