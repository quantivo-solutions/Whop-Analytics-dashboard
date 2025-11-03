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

    const targetCompanyId = companyId || (await getSession()).companyId

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

    // Auth: require valid session with matching companyId
    const session = await getSession().catch(() => null)
    if (!session || session.companyId !== companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Validate patch
    const validPatch: {
      goalAmount?: number | null
      wantsDailyMail?: boolean
      wantsDiscord?: boolean
      completedAt?: Date | null
    } = {}

    if (patch.goalAmount !== undefined) {
      validPatch.goalAmount = patch.goalAmount !== null ? Number(patch.goalAmount) : null
    }
    if (patch.wantsDailyMail !== undefined) {
      validPatch.wantsDailyMail = Boolean(patch.wantsDailyMail)
    }
    if (patch.wantsDiscord !== undefined) {
      validPatch.wantsDiscord = Boolean(patch.wantsDiscord)
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

