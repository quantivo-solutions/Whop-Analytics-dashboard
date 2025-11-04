import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendDailyReportEmail } from '@/lib/email'
import { postToDiscord, formatDailySummary } from '@/lib/discord'
import { getPlanForCompany, isPro } from '@/lib/plan'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    // Extract secret from query params
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')

    // Validate secret
    if (!secret || secret !== process.env.CRON_SECRET) {
      console.log('[Whoplytics] Unauthorized daily report request - invalid or missing secret')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get yesterday's date
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Find all Pro installations that have daily email enabled
    // Only send to Pro/Business plans (Free plan gets weekly only)
    const proInstallations = await prisma.whopInstallation.findMany({
      where: {
        plan: { in: ['pro', 'business'] },
        dailyEmail: true,
        reportEmail: { not: null },
      },
    })
    
    // Double-check plan status for each installation
    const validInstallations = []
    for (const installation of proInstallations) {
      const plan = await getPlanForCompany(installation.companyId)
      if (isPro(plan)) {
        validInstallations.push(installation)
      }
    }

    console.log(`[Whoplytics] Found ${validInstallations.length} Pro installation(s) with daily email enabled (out of ${proInstallations.length} total)`)

    if (validInstallations.length === 0) {
      console.log('[Whoplytics] ℹ️  No Pro installations with daily email enabled')
      return NextResponse.json({
        ok: true,
        message: 'No Pro installations with daily email enabled',
        sent: 0,
      })
    }

    const results = []

    // Send daily report to each Pro installation
    for (const installation of validInstallations) {
      try {
        // Get yesterday's metrics for this company
        let metric = await prisma.metricsDaily.findFirst({
          where: {
            companyId: installation.companyId,
            date: {
              gte: yesterday,
              lt: today,
            },
          },
          orderBy: { date: 'desc' },
        })

        // Fallback to last available row if yesterday's data doesn't exist
        if (!metric) {
          metric = await prisma.metricsDaily.findFirst({
            where: { companyId: installation.companyId },
            orderBy: { date: 'desc' },
          })
        }

        if (!metric) {
          console.log(`[Whoplytics] ⚠️  No metrics data available for ${installation.companyId}`)
          results.push({
            companyId: installation.companyId,
            success: false,
            message: 'No metrics data available',
          })
          continue
        }

        // Send the daily report email
        if (installation.reportEmail) {
          console.log(`📧 Sending daily report to ${installation.reportEmail} for company ${installation.companyId}`)
          const result = await sendDailyReportEmail(installation.reportEmail, metric)

          if (result.success) {
            console.log(`[Whoplytics] ✅ Daily report sent successfully to ${installation.reportEmail}`)
            
            // Post to Discord if webhook is configured
            if (installation.discordWebhook) {
              console.log(`📤 Posting to Discord for company ${installation.companyId}...`)
              const discordMessage = formatDailySummary({
                ...metric,
                grossRevenue: Number(metric.grossRevenue)
              })
              const discordResult = await postToDiscord(installation.discordWebhook, discordMessage)
              
              if (!discordResult.success) {
                console.warn(`Discord notification failed for ${installation.companyId}, but email was sent successfully`)
              }
            }
            
            results.push({
              companyId: installation.companyId,
              success: true,
              emailId: result.data?.id,
              email: installation.reportEmail,
            })
          } else {
            console.error(`❌ Failed to send daily report to ${installation.reportEmail}:`, result.error)
            results.push({
              companyId: installation.companyId,
              success: false,
              error: result.error,
            })
          }
        }
      } catch (error) {
        console.error(`❌ Error sending daily report for ${installation.companyId}:`, error)
        results.push({
          companyId: installation.companyId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    const successCount = results.filter(r => r.success).length

    return NextResponse.json({
      ok: true,
      message: `Daily reports sent to ${successCount} of ${proInstallations.length} Pro installation(s)`,
      sent: successCount,
      total: proInstallations.length,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error in daily report endpoint:', error)
    return NextResponse.json(
      {
        ok: false,
        message: 'Internal server error',
        error: (error as Error).message,
      },
      { status: 500 }
    )
  }
}

