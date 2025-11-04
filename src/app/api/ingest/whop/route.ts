import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchDailySummary } from '@/lib/whop'
import { sendDailyReportEmail } from '@/lib/email'
import { postToDiscord, formatDailySummary } from '@/lib/discord'
import { getPlanForCompany, hasPro } from '@/lib/plan'
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

    // TASK 3 - Ingestion: Iterate through all installations and use each installation's accessToken and companyId
    // INTEGRITY: Never use hardcoded or first installation - process all installations
    const allInstallations = await prisma.whopInstallation.findMany({
      where: {
        accessToken: { not: '' } // Only installations with valid tokens
      }
    })

    if (allInstallations.length === 0) {
      console.warn('No Whop installations found. Skipping daily ingest.')
      return NextResponse.json({ ok: false, message: 'No Whop installations found' }, { status: 404 })
    }

    // Determine yesterday's date in UTC (YYYY-MM-DD)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayUTC = yesterday.toISOString().split('T')[0]

    const results = []

    // Process each installation separately
    for (const installation of allInstallations) {
      const companyId = installation.companyId
      const accessToken = installation.accessToken

      // INTEGRITY: Runtime assert - companyId and token must be present
      if (!companyId) {
        console.error(`[Whoplytics] INTEGRITY ERROR: Installation missing companyId, skipping`)
        continue
      }
      if (!accessToken) {
        console.error(`[Whoplytics] INTEGRITY ERROR: Installation ${companyId} missing accessToken, skipping`)
        continue
      }

      console.log(`[Whoplytics] fetch`, { path: 'daily-summary', companyId, startISO: yesterdayUTC, endISO: yesterdayUTC })
      console.log(`🚀 Starting daily Whop data ingestion for company ${companyId} for date: ${yesterdayUTC}`)

      try {
        // Fetch daily summary from Whop using THIS installation's token
        const summary = await fetchDailySummary(yesterdayUTC, accessToken, companyId)

        // INTEGRITY: Always include companyId in upsert
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
            companyId: companyId, // INTEGRITY: Always include companyId
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

        // After ingesting data, automatically send daily report if enabled for this company
        let emailSent = false
        let discordSent = false

        try {
          // Check if this installation has Pro plan and daily email enabled
          const plan = await getPlanForCompany(companyId)
          const hasProPlan = hasPro(plan)

          if (hasProPlan && installation.dailyEmail && installation.reportEmail) {
            console.log(`📧 Sending daily report email to ${installation.reportEmail} for company ${companyId}...`)
            const emailResult = await sendDailyReportEmail(installation.reportEmail, metric)
            
            if (emailResult.error) {
              console.error('Failed to send daily report email:', emailResult.error)
            } else {
              console.log('✅ Daily report email sent successfully')
              emailSent = true
            }

            // Send to Discord if webhook is configured
            if (installation.discordWebhook) {
              console.log(`📢 Posting daily summary to Discord for company ${companyId}...`)
              const discordMessage = formatDailySummary({
                ...metric,
                grossRevenue: Number(metric.grossRevenue)
              })
              const discordResult = await postToDiscord(installation.discordWebhook, discordMessage)
              
              if (discordResult.success) {
                console.log('✅ Posted to Discord successfully')
                discordSent = true
              } else {
                console.error('Failed to post to Discord:', discordResult.error)
              }
            }
          } else {
            console.log(`ℹ️  Skipping daily report for ${companyId}: plan=${plan}, dailyEmail=${installation.dailyEmail}, reportEmail=${!!installation.reportEmail}`)
          }
        } catch (reportError) {
          console.error('Error sending daily report:', reportError)
          // Don't fail the ingestion if report fails
        }

        results.push({
          companyId,
          date: yesterdayUTC,
          success: true,
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
        console.error(`[Whoplytics] Error ingesting data for company ${companyId}:`, error)
        results.push({
          companyId,
          date: yesterdayUTC,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return NextResponse.json({
      ok: true,
      wrote: true,
      date: yesterdayUTC,
      processed: results.length,
      results,
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

