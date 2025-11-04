/**
 * Company Preferences API
 * 
 * GET: Fetch company preferences
 * POST: Update company preferences
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCompanyPrefs, setCompanyPrefs } from '@/lib/company'
import { getSession } from '@/lib/session'
import { env } from '@/lib/env'

export const runtime = 'nodejs'

// GET: Fetch company preferences
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const secret = searchParams.get('secret')

    // Auth: require secret for cron OR valid session with matching companyId
    if (secret !== env.CRON_SECRET) {
      const session = await getSession().catch(() => null)
      if (!session || (companyId && session.companyId !== companyId)) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    const session = await getSession().catch(() => null)
    const targetCompanyId = companyId || session?.companyId

    if (!targetCompanyId) {
      return NextResponse.json(
        { error: 'companyId required' },
        { status: 400 }
      )
    }

    const prefs = await getCompanyPrefs(targetCompanyId)

    return NextResponse.json({
      companyId: prefs.companyId,
      goalAmount: prefs.goalAmount ? Number(prefs.goalAmount) : null,
      wantsDailyMail: prefs.wantsDailyMail,
      wantsDiscord: prefs.wantsDiscord,
      completedAt: prefs.completedAt?.toISOString() || null,
      createdAt: prefs.createdAt.toISOString(),
      updatedAt: prefs.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('[Company Prefs API] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    )
  }
}

// POST: Update company preferences
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId, patch } = body

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId required' },
        { status: 400 }
      )
    }

    // Auth: Check both session AND current Whop iframe headers
    // Priority: Whop iframe headers (current user) > Session (might be stale)
    const session = await getSession().catch(() => null)
    
    // Check for Whop iframe auth (most reliable for current user)
    let whopUserId: string | null = null
    try {
      const { verifyWhopUserToken } = await import('@/lib/whop-auth')
      const whopUser = await verifyWhopUserToken().catch(() => null)
      if (whopUser?.userId) {
        whopUserId = whopUser.userId
        console.log('[Company Prefs API] ✅ Whop iframe auth found, userId:', whopUserId)
      }
    } catch (whopError) {
      console.log('[Company Prefs API] No Whop iframe auth (not in iframe or no header)')
    }
    
    // Use Whop userId if available, otherwise fall back to session userId
    const currentUserId = whopUserId || session?.userId
    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Unauthorized - no valid authentication' },
        { status: 401 }
      )
    }

    // Check if user owns this installation (by companyId or userId)
    const { prisma } = await import('@/lib/prisma')
    const installation = await prisma.whopInstallation.findUnique({
      where: { companyId },
    })

    if (!installation) {
      // Installation not found - check if user has ANY installation with matching userId
      const userInstallations = await prisma.whopInstallation.findMany({
        where: { userId: currentUserId },
      })
      
      if (userInstallations.length > 0) {
        // User has installations - allow access during onboarding
        // This handles cases where onboarding is for a different companyId than session
        console.log('[Company Prefs API] Allowing access - user has installations, may be onboarding for new companyId', {
          currentUserId,
          targetCompanyId: companyId,
          userInstallationsCount: userInstallations.length
        })
      } else {
        return NextResponse.json(
          { error: 'Installation not found and user has no installations' },
          { status: 404 }
        )
      }
    } else {
      // Installation exists - check ownership
      // Allow if:
      // 1. Session companyId matches (if session exists)
      // 2. Current userId (from Whop or session) matches installation.userId
      const userOwnsInstallation =
        (session && session.companyId === companyId) ||
        (currentUserId && installation.userId === currentUserId)

      if (!userOwnsInstallation) {
        console.log('[Company Prefs API] Ownership check failed:', {
          currentUserId,
          sessionCompanyId: session?.companyId,
          targetCompanyId: companyId,
          installationUserId: installation.userId,
          hasWhopAuth: !!whopUserId,
          hasSession: !!session
        })
        return NextResponse.json(
          { error: 'Unauthorized - user does not own this installation' },
          { status: 401 }
        )
      }
      
      console.log('[Company Prefs API] ✅ Ownership verified:', {
        currentUserId,
        installationUserId: installation.userId,
        companyId,
        authSource: whopUserId ? 'whop-iframe' : 'session'
      })
    }

    // Validate patch (goalAmount, completedAt, and proWelcomeShownAt)
    const validPatch: {
      goalAmount?: number | null
      completedAt?: Date | null
      proWelcomeShownAt?: Date | null
    } = {}

    if (patch.goalAmount !== undefined) {
      validPatch.goalAmount = patch.goalAmount !== null ? Number(patch.goalAmount) : null
    }
    if (patch.completedAt !== undefined) {
      validPatch.completedAt = patch.completedAt ? new Date(patch.completedAt) : null
    }
    if (patch.proWelcomeShownAt !== undefined) {
      validPatch.proWelcomeShownAt = patch.proWelcomeShownAt ? new Date(patch.proWelcomeShownAt) : null
    }

    await setCompanyPrefs(companyId, validPatch)

    const updatedPrefs = await getCompanyPrefs(companyId)

    return NextResponse.json({
      success: true,
      prefs: {
        companyId: updatedPrefs.companyId,
        goalAmount: updatedPrefs.goalAmount ? Number(updatedPrefs.goalAmount) : null,
        wantsDailyMail: updatedPrefs.wantsDailyMail,
        wantsDiscord: updatedPrefs.wantsDiscord,
        completedAt: updatedPrefs.completedAt?.toISOString() || null,
        proWelcomeShownAt: updatedPrefs.proWelcomeShownAt?.toISOString() || null,
      },
    })
  } catch (error) {
    console.error('[Company Prefs API] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}

