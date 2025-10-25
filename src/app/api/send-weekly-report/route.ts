import { NextRequest, NextResponse } from 'next/server'
import { sendWeeklySummaryEmail } from '@/lib/email'

/**
 * API route to manually trigger weekly summary email
 * POST /api/send-weekly-report
 * Body: { "to": "email@example.com" } or { "to": ["email1@example.com", "email2@example.com"] }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { to } = body

    // Validate email parameter
    if (!to) {
      return NextResponse.json(
        { error: 'Missing "to" parameter. Please provide an email address.' },
        { status: 400 }
      )
    }

    // Send the email
    const result = await sendWeeklySummaryEmail(to)

    return NextResponse.json({
      success: true,
      message: 'Weekly summary email sent successfully',
      result
    })
  } catch (error) {
    console.error('Error sending weekly summary email:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to send weekly summary email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint for health check
 */
export async function GET() {
  return NextResponse.json({
    message: 'Weekly report endpoint is ready. Use POST with {"to": "email@example.com"} to send a report.'
  })
}

