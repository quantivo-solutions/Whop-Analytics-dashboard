import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchDailySummary } from '@/lib/whop'
import { sendDailyReportEmail } from '@/lib/email'
import { postToDiscord, formatDailySummary } from '@/lib/discord'
import { env } from '@/lib/env'
import { getWhopToken } from '@/lib/whop-installation'

export const runtime = 'nodejs'

/**
 * POST /api/ingest/whop?secret=CRON_SECRET
 * 
 * Ingest yesterday's Whop metrics into the database
 * Then automatically send daily report if enabled
 * Protected endpoint - requires CRON_SECRET
 */
export async function POST(request: Request) {
  try {
    // Check secret authentication
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')

    if (!secret || secret !== env.CRON_SECRET) {
      console.warn('Unauthorized ingestion request - invalid or missing secret')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For now, assume a default company ID or fetch the first one
    const whopInstallation = await prisma.whopInstallation.findFirst()
    if (!whopInstallation) {
      console.warn('No Whop installation found. Skipping daily ingest.')
      return NextResponse.json({ ok: false, message: 'No Whop installation found' }, { status: 404 })
    }

    const companyId = whopInstallation.companyId
    const accessToken = whopInstallation.accessToken

    // Determine yesterday's date in UTC (YYYY-MM-DD)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayUTC = yesterday.toISOString().split('T')[0]

    console.log(`🚀 Starting daily Whop data ingestion for company ${companyId} for date: ${yesterdayUTC}`)

    // Fetch daily summary from Whop
    const summary = await fetchDailySummary(yesterdayUTC, accessToken)

    // Upsert into MetricsDaily
    const metric = await prisma.metricsDaily.upsert({
      where: {
        companyId_date: {
          companyId: companyId,
          date: new Date(yesterdayUTC),
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
        date: new Date(yesterdayUTC),
        grossRevenue: summary.grossRevenue,
        activeMembers: summary.activeMembers,
        newMembers: summary.newMembers,
        cancellations: summary.cancellations,
        trialsStarted: summary.trialsStarted,
        trialsPaid: summary.trialsPaid,
      },
    })

    console.log(`✅ Successfully ingested data for ${yesterdayUTC} for company ${companyId}.`)

    // --- Post-ingestion actions (Daily Report) ---

    // After ingesting data, automatically send daily report if enabled
    let emailSent = false
    let discordSent = false

    try {
      const settings = await prisma.workspaceSettings.findFirst()

      if (settings && settings.dailyEmail && settings.reportEmail) {
        console.log('📧 Sending daily report email...')
        const emailResult = await sendDailyReportEmail(settings.reportEmail, metric)
        
        if (emailResult.error) {
          console.error('Failed to send daily report email:', emailResult.error)
        } else {
          console.log('✅ Daily report email sent successfully')
          emailSent = true
        }

        // Send to Discord if webhook is configured
        if (settings.discordWebhook) {
          console.log('📢 Posting daily summary to Discord...')
          const discordMessage = formatDailySummary({
            ...metric,
            grossRevenue: Number(metric.grossRevenue)
          })
          const discordResult = await postToDiscord(settings.discordWebhook, discordMessage)
          
          if (discordResult.success) {
            console.log('✅ Posted to Discord successfully')
            discordSent = true
          } else {
            console.error('Failed to post to Discord:', discordResult.error)
          }
        }
      }
    } catch (reportError) {
      console.error('Error sending daily report:', reportError)
      // Don't fail the ingestion if report fails
    }

    return NextResponse.json({
      ok: true,
      wrote: true,
      date: yesterdayUTC,
      summary: {
        grossRevenue: summary.grossRevenue,
        activeMembers: summary.activeMembers,
        newMembers: summary.newMembers,
        cancellations: summary.cancellations,
        trialsStarted: summary.trialsStarted,
        trialsPaid: summary.trialsPaid,
      },
      report: {
        emailSent,
        discordSent,
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

