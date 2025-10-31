import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export const runtime = 'nodejs'

// GET - Fetch current settings (supports optional companyId query param)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const queryCompanyId = searchParams.get('companyId')
    
    // Get session (optional for iframe context)
    const session = await getSession()
    
    // SECURITY: If companyId is provided in query, verify it matches session
    // Prevent users from accessing other companies' settings
    let companyId: string
    
    if (queryCompanyId) {
      // If companyId is provided in query, verify it matches the session
      if (session?.companyId && session.companyId !== queryCompanyId) {
        console.warn('[Settings GET] Security: Attempt to access different companyId blocked', {
          sessionCompanyId: session.companyId,
          requestedCompanyId: queryCompanyId,
        })
        return NextResponse.json(
          { error: 'Unauthorized: Cannot access settings for different company' },
          { status: 403 }
        )
      }
      companyId = queryCompanyId
    } else {
      // No companyId in query, use session
      companyId = session?.companyId || ''
    }
    
    if (!companyId) {
      return NextResponse.json(
        { error: 'Not authenticated and no companyId provided' },
        { status: 401 }
      )
    }

    console.log('[Settings GET] Request details:', {
      queryCompanyId,
      sessionCompanyId: session?.companyId,
      targetCompanyId: companyId,
    })

    // Get installation with settings
    const installation = await prisma.whopInstallation.findUnique({
      where: { companyId },
    })

    console.log('[Settings GET] Installation found:', {
      found: !!installation,
      companyId: installation?.companyId,
      reportEmail: installation?.reportEmail,
      plan: installation?.plan,
    })

    if (!installation) {
      return NextResponse.json(
        { error: 'Installation not found' },
        { status: 404 }
      )
    }

    // Return settings from installation (per-company)
    const response = {
      reportEmail: installation.reportEmail || '',
      weeklyEmail: installation.weeklyEmail ?? true,
      dailyEmail: installation.dailyEmail ?? false,
      discordWebhook: installation.discordWebhook || '',
      plan: installation.plan || 'free',
      companyId: installation.companyId,
    }

    console.log('[Settings GET] Returning:', response)

    return NextResponse.json(response)
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
    const body = await request.json()
    const { reportEmail, weeklyEmail, dailyEmail, discordWebhook, companyId: requestCompanyId } = body

    // Get session (optional for iframe context)
    const session = await getSession()

    // SECURITY: Only allow companyId from request body if session matches
    // Prevent users from modifying other companies' settings
    let targetCompanyId: string
    
    if (requestCompanyId) {
      // If companyId is provided in body, verify it matches the session
      if (session?.companyId && session.companyId !== requestCompanyId) {
        console.warn('[Settings POST] Security: Attempt to modify different companyId blocked', {
          sessionCompanyId: session.companyId,
          requestedCompanyId: requestCompanyId,
        })
        return NextResponse.json(
          { error: 'Unauthorized: Cannot modify settings for different company' },
          { status: 403 }
        )
      }
      targetCompanyId = requestCompanyId
    } else {
      // No companyId in body, use session
      targetCompanyId = session?.companyId || ''
    }
    
    if (!targetCompanyId) {
      return NextResponse.json(
        { error: 'Not authenticated and no companyId provided' },
        { status: 401 }
      )
    }

    console.log('[Settings POST] Request details:', {
      requestCompanyId,
      sessionCompanyId: session?.companyId,
      targetCompanyId,
      reportEmail,
      bodyKeys: Object.keys(body),
    })

    // Get user's installation to check plan
    const installation = await prisma.whopInstallation.findUnique({
      where: { companyId: targetCompanyId },
    })

    console.log('[Settings POST] Installation found:', {
      found: !!installation,
      companyId: installation?.companyId,
      currentEmail: installation?.reportEmail,
      plan: installation?.plan,
    })

    if (!installation) {
      return NextResponse.json(
        { error: 'Installation not found' },
        { status: 404 }
      )
    }

    const userPlan = installation.plan || 'free'
    const isPro = userPlan === 'pro' || userPlan === 'business'

    // Enforce Pro-only features
    const sanitizedDailyEmail = isPro ? (dailyEmail ?? false) : false
    const sanitizedDiscordWebhook = isPro ? (discordWebhook || null) : null

    // Update installation with settings (per-company)
    console.log('[Settings POST] About to update with:', {
      companyId: targetCompanyId,
      reportEmail: reportEmail || null,
      weeklyEmail: weeklyEmail ?? true,
      dailyEmail: sanitizedDailyEmail,
      discordWebhook: sanitizedDiscordWebhook ? 'SET' : 'null',
    })

    const updatedInstallation = await prisma.whopInstallation.update({
      where: { companyId: targetCompanyId },
      data: {
        reportEmail: reportEmail || null,
        weeklyEmail: weeklyEmail ?? true,
        dailyEmail: sanitizedDailyEmail,
        discordWebhook: sanitizedDiscordWebhook,
      },
    })

    console.log(`[Settings POST] ✅ Successfully saved for ${targetCompanyId}:`, {
      savedEmail: updatedInstallation.reportEmail,
      weekly: updatedInstallation.weeklyEmail,
      daily: updatedInstallation.dailyEmail,
      discord: updatedInstallation.discordWebhook ? 'set' : 'none',
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

