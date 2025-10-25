import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendDailyReportEmail } from '@/lib/email'
import { postToDiscord, formatDailySummary } from '@/lib/discord'

export async function GET(request: Request) {
  try {
    // Extract secret from query params
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')

    // Validate secret
    if (!secret || secret !== process.env.CRON_SECRET) {
      console.log('Unauthorized daily report request - invalid or missing secret')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get workspace settings
    const settings = await prisma.workspaceSettings.findFirst()

    // Check if daily email is enabled
    if (!settings) {
      console.log('⚠️  No workspace settings found')
      return NextResponse.json(
        { ok: false, message: 'No workspace settings configured' },
        { status: 200 }
      )
    }

    if (!settings.dailyEmail) {
      console.log('ℹ️  Daily email is disabled in settings')
      return NextResponse.json(
        { ok: false, message: 'Daily email reports are disabled' },
        { status: 200 }
      )
    }

    if (!settings.reportEmail) {
      console.log('⚠️  No report email configured')
      return NextResponse.json(
        { ok: false, message: 'No report email address configured' },
        { status: 200 }
      )
    }

    // Get yesterday's date
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Try to get yesterday's metrics
    let metric = await prisma.metricsDaily.findFirst({
      where: {
        date: {
          gte: yesterday,
          lt: today,
        },
      },
      orderBy: { date: 'desc' },
    })

    // Fallback to last available row if yesterday's data doesn't exist
    if (!metric) {
      console.log('ℹ️  No data for yesterday, using latest available')
      metric = await prisma.metricsDaily.findFirst({
        orderBy: { date: 'desc' },
      })
    }

    if (!metric) {
      console.log('⚠️  No metrics data available')
      return NextResponse.json(
        { ok: false, message: 'No metrics data available' },
        { status: 200 }
      )
    }

    // Send the daily report email
    console.log(`📧 Sending daily report to: ${settings.reportEmail}`)
    const result = await sendDailyReportEmail(settings.reportEmail, metric)

    if (result.success) {
      console.log(`✅ Daily report sent successfully: ${result.data?.id}`)
      
      // Post to Discord if webhook is configured
      if (settings.discordWebhook) {
        console.log('📤 Posting to Discord...')
        const discordMessage = formatDailySummary(metric)
        const discordResult = await postToDiscord(settings.discordWebhook, discordMessage)
        
        if (!discordResult.success) {
          console.warn('Discord notification failed, but email was sent successfully')
        }
      }
      
      return NextResponse.json({
        ok: true,
        message: 'Daily report sent successfully',
        emailId: result.data?.id,
        date: metric.date,
        timestamp: new Date().toISOString(),
      })
    } else {
      console.error('❌ Failed to send daily report:', result.error)
      return NextResponse.json(
        {
          ok: false,
          message: 'Failed to send daily report',
          error: result.error,
        },
        { status: 500 }
      )
    }
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

