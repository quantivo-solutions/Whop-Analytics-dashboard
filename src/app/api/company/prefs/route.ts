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

    // Auth: require valid session - check if user owns this companyId
    const session = await getSession().catch(() => null)
    if (!session || !session.userId) {
      return NextResponse.json(
        { error: 'Unauthorized - no session or userId' },
        { status: 401 }
      )
    }

    // Check if user owns this installation (by companyId or userId)
    const { prisma } = await import('@/lib/prisma')
    const installation = await prisma.whopInstallation.findUnique({
      where: { companyId },
    })

    if (!installation) {
      // Installation not found - this might be during onboarding for a new companyId
      // Check if user has ANY installation with matching userId (for fresh installs)
      if (session.userId) {
        const userInstallations = await prisma.whopInstallation.findMany({
          where: { userId: session.userId },
        })
        
        if (userInstallations.length > 0) {
          // User has installations - allow access during onboarding
          // This handles cases where onboarding is for a different companyId than session
          console.log('[Company Prefs API] Allowing access - user has installations, may be onboarding for new companyId')
        } else {
          return NextResponse.json(
            { error: 'Installation not found' },
            { status: 404 }
          )
        }
      } else {
        return NextResponse.json(
          { error: 'Installation not found' },
          { status: 404 }
        )
      }
    } else {
      // Installation exists - check ownership
      // Allow if session.companyId matches OR session.userId matches installation.userId
      const userOwnsInstallation =
        session.companyId === companyId ||
        (session.userId && installation.userId === session.userId)

      if (!userOwnsInstallation) {
        console.log('[Company Prefs API] Ownership check failed:', {
          sessionCompanyId: session.companyId,
          targetCompanyId: companyId,
          sessionUserId: session.userId,
          installationUserId: installation.userId
        })
        return NextResponse.json(
          { error: 'Unauthorized - user does not own this installation' },
          { status: 401 }
        )
      }
    }

    // Validate patch (only goalAmount and completedAt for onboarding)
    const validPatch: {
      goalAmount?: number | null
      completedAt?: Date | null
    } = {}

    if (patch.goalAmount !== undefined) {
      validPatch.goalAmount = patch.goalAmount !== null ? Number(patch.goalAmount) : null
    }
    if (patch.completedAt !== undefined) {
      validPatch.completedAt = patch.completedAt ? new Date(patch.completedAt) : null
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

