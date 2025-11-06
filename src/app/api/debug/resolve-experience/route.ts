/**
 * Debug endpoint to resolve experienceId to companyId
 * GET /api/debug/resolve-experience?experienceId=exp_xxx&secret=CRON_SECRET
 */

import { NextResponse } from 'next/server'
import { getExperienceById } from '@/lib/whop-rest'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  const experienceId = searchParams.get('experienceId')

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  if (!experienceId) {
    return NextResponse.json({ error: 'missing experienceId' }, { status: 400 })
  }

  try {
    const exp = await getExperienceById(experienceId)
    const companyId = exp?.company_id || exp?.company?.id || exp?.companyId || null

    return NextResponse.json({
      ok: true,
      experienceId,
      companyId,
      isValidBizCompany: companyId?.startsWith('biz_') || false,
    })
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: String(e),
        experienceId,
      },
      { status: 500 }
    )
  }
}

