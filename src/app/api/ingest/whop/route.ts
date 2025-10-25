import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchDailySummary } from '@/lib/whop'

/**
 * POST /api/ingest/whop?secret=CRON_SECRET
 * 
 * Ingest yesterday's Whop metrics into the database
 * Protected endpoint - requires CRON_SECRET
 */
export async function POST(request: Request) {
  try {
    // Check secret authentication
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')

    if (!secret || secret !== process.env.CRON_SECRET) {
      console.error('Unauthorized Whop ingest request - invalid or missing secret')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Calculate yesterday's date in UTC
    const yesterday = new Date()
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    yesterday.setUTCHours(0, 0, 0, 0)
    const dateString = yesterday.toISOString().split('T')[0] // YYYY-MM-DD

    console.log(`📥 Starting Whop data ingestion for ${dateString}...`)

    // Fetch data from Whop
    const summary = await fetchDailySummary(dateString)

    if (!summary) {
      console.error('Failed to fetch data from Whop')
      return NextResponse.json(
        { error: 'Failed to fetch data from Whop' },
        { status: 500 }
      )
    }

    // Upsert into database
    const metric = await prisma.metricsDaily.upsert({
      where: {
        date: yesterday,
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
        date: yesterday,
        grossRevenue: summary.grossRevenue,
        activeMembers: summary.activeMembers,
        newMembers: summary.newMembers,
        cancellations: summary.cancellations,
        trialsStarted: summary.trialsStarted,
        trialsPaid: summary.trialsPaid,
      },
    })

    console.log(`✅ Successfully ingested Whop data for ${dateString}`)
    console.log(`   Revenue: $${summary.grossRevenue}, Members: ${summary.activeMembers}, New: ${summary.newMembers}`)

    return NextResponse.json({
      ok: true,
      date: dateString,
      data: {
        grossRevenue: metric.grossRevenue,
        activeMembers: metric.activeMembers,
        newMembers: metric.newMembers,
        cancellations: metric.cancellations,
        trialsStarted: metric.trialsStarted,
        trialsPaid: metric.trialsPaid,
      },
    })
  } catch (error) {
    console.error('Error ingesting Whop data:', error)
    return NextResponse.json(
      { error: 'Failed to ingest Whop data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ingest/whop?secret=CRON_SECRET
 * 
 * Check status of Whop ingestion
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

    // Get the latest ingested metric
    const latestMetric = await prisma.metricsDaily.findFirst({
      orderBy: { date: 'desc' },
    })

    if (!latestMetric) {
      return NextResponse.json({
        ok: true,
        message: 'No data ingested yet',
        latestDate: null,
      })
    }

    return NextResponse.json({
      ok: true,
      message: 'Whop ingestion is active',
      latestDate: latestMetric.date.toISOString().split('T')[0],
      latestData: {
        grossRevenue: latestMetric.grossRevenue,
        activeMembers: latestMetric.activeMembers,
        newMembers: latestMetric.newMembers,
      },
    })
  } catch (error) {
    console.error('Error checking Whop ingestion status:', error)
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    )
  }
}

