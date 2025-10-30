import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export const runtime = 'nodejs'

// GET - Fetch current settings (supports optional companyId query param)
export async function GET(request: Request) {
  try {
    // Get session to determine user's company
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId') || session.companyId

    // Get installation with settings
    const installation = await prisma.whopInstallation.findUnique({
      where: { companyId },
    })

    if (!installation) {
      return NextResponse.json(
        { error: 'Installation not found' },
        { status: 404 }
      )
    }

    // Return settings from installation (per-company)
    return NextResponse.json({
      reportEmail: installation.reportEmail || '',
      weeklyEmail: installation.weeklyEmail ?? true,
      dailyEmail: installation.dailyEmail ?? false,
      discordWebhook: installation.discordWebhook || '',
      plan: installation.plan || 'free',
      companyId: installation.companyId,
    })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// POST - Update settings (supports companyId for per-company settings)
export async function POST(request: Request) {
  try {
    // Get session to verify authentication
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { reportEmail, weeklyEmail, dailyEmail, discordWebhook, plan } = body

    // Get user's installation to check plan
    const installation = await prisma.whopInstallation.findUnique({
      where: { companyId: session.companyId },
    })

    const userPlan = installation?.plan || 'free'
    const isPro = userPlan === 'pro' || userPlan === 'business'

    // Enforce Pro-only features
    const sanitizedDailyEmail = isPro ? (dailyEmail ?? false) : false
    const sanitizedDiscordWebhook = isPro ? (discordWebhook || null) : null

    // Update installation with settings (per-company)
    const updatedInstallation = await prisma.whopInstallation.update({
      where: { companyId: session.companyId },
      data: {
        reportEmail: reportEmail || '',
        weeklyEmail: weeklyEmail ?? true,
        dailyEmail: sanitizedDailyEmail,
        discordWebhook: sanitizedDiscordWebhook,
      },
    })

    console.log(`[Settings] Saved for ${session.companyId}:`, {
      email: reportEmail,
      weekly: weeklyEmail,
      daily: sanitizedDailyEmail,
      discord: sanitizedDiscordWebhook ? 'set' : 'none',
      plan: userPlan,
    })

    return NextResponse.json({
      success: true,
      settings: {
        reportEmail: updatedInstallation.reportEmail,
        weeklyEmail: updatedInstallation.weeklyEmail,
        dailyEmail: updatedInstallation.dailyEmail,
        discordWebhook: updatedInstallation.discordWebhook,
      },
    })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}

