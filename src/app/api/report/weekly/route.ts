import { NextRequest, NextResponse } from 'next/server'
import { sendWeeklySummaryEmail } from '@/lib/email'
import { prisma } from '@/lib/prisma'
import { postToDiscord, formatWeeklySummary } from '@/lib/discord'

export const runtime = 'nodejs'

/**
 * API route for automated weekly report sending
 * 
 * This endpoint is designed to be called by a cron job (e.g., Vercel Cron, GitHub Actions)
 * and is protected by a secret query parameter.
 * 
 * Usage:
 *   GET /api/report/weekly?secret=YOUR_CRON_SECRET
 * 
 * Environment variables required:
 *   - CRON_SECRET: Secret key to authorize cron requests
 *   - REPORT_EMAIL: Email address(es) to send the report to (comma-separated)
 *   - RESEND_API_KEY: Resend API key for sending emails
 */
export async function GET(request: NextRequest) {
  try {
    // Extract secret from query parameters
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    
    // Verify secret
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret) {
      console.error('CRON_SECRET is not configured')
      return NextResponse.json(
        { 
          error: 'Server configuration error',
          message: 'CRON_SECRET environment variable is not set'
        },
        { status: 500 }
      )
    }
    
    if (!secret || secret !== cronSecret) {
      console.warn('Unauthorized weekly report request - invalid or missing secret')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get recipient email(s)
    const reportEmail = process.env.REPORT_EMAIL
    
    if (!reportEmail) {
      console.error('REPORT_EMAIL is not configured')
      return NextResponse.json(
        { 
          error: 'Configuration error',
          message: 'REPORT_EMAIL environment variable is not set. Please configure recipient email address(es).'
        },
        { status: 500 }
      )
    }
    
    // Parse recipients (comma-separated)
    const recipients = reportEmail.split(',').map(email => email.trim()).filter(Boolean)
    
    if (recipients.length === 0) {
      return NextResponse.json(
        { 
          error: 'Configuration error',
          message: 'No valid email addresses found in REPORT_EMAIL'
        },
        { status: 500 }
      )
    }
    
    console.log(`📧 Sending weekly report to ${recipients.length} recipient(s)...`)
    
    // Send the email
    const result = await sendWeeklySummaryEmail(recipients)
    
    if (result.error) {
      console.error('Failed to send weekly report:', result.error)
      return NextResponse.json(
        { 
          error: 'Failed to send email',
          details: result.error.message
        },
        { status: 500 }
      )
    }
    
    console.log('✅ Weekly report sent successfully:', result.data?.id)
    
    // Check for Discord webhook in settings
    const settings = await prisma.workspaceSettings.findFirst()
    
    if (settings?.discordWebhook && result.kpis) {
      console.log('📤 Posting to Discord...')
      const discordMessage = formatWeeklySummary(result.kpis)
      const discordResult = await postToDiscord(settings.discordWebhook, discordMessage)
      
      if (!discordResult.success) {
        console.warn('Discord notification failed, but email was sent successfully')
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Weekly report sent successfully',
      emailId: result.data?.id,
      recipients: recipients.length,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error in weekly report endpoint:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * POST endpoint (alternative method)
 * Allows sending to custom recipients via request body
 */
export async function POST(request: NextRequest) {
  try {
    // Extract secret from query parameters
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    
    // Verify secret
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }
    
    if (!secret || secret !== cronSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Parse request body
    const body = await request.json()
    const { to } = body
    
    if (!to) {
      return NextResponse.json(
        { error: 'Missing "to" parameter in request body' },
        { status: 400 }
      )
    }
    
    // Send the email
    const result = await sendWeeklySummaryEmail(to)
    
    if (result.error) {
      return NextResponse.json(
        { 
          error: 'Failed to send email',
          details: result.error.message
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Weekly report sent successfully',
      emailId: result.data?.id,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error in weekly report POST endpoint:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

