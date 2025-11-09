import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'
import { getExperienceById } from '@/lib/whop-rest'
import { linkExperienceToCompany } from '@/lib/company'
import { verifyWhopUserToken } from '@/lib/whop-auth'

export const runtime = 'nodejs'

async function resolveCompanyId(experienceId: string): Promise<string | null> {
  const whopUser = await verifyWhopUserToken().catch(() => null)

  const existingBizByUser = whopUser?.userId
    ? await prisma.whopInstallation.findFirst({
        where: {
          userId: whopUser.userId,
          companyId: { startsWith: 'biz_' },
        },
        orderBy: { updatedAt: 'desc' },
      })
    : null

  if (existingBizByUser?.companyId?.startsWith('biz_')) {
    return existingBizByUser.companyId
  }

  const installation = await prisma.whopInstallation.findUnique({
    where: { experienceId },
  }).catch(() => null)

  if (installation?.companyId?.startsWith('biz_')) {
    return installation.companyId
  }

  try {
    const exp = await getExperienceById(experienceId)
    const resolved = exp?.company?.id || exp?.company_id || null
    if (resolved?.startsWith('biz_')) {
      await linkExperienceToCompany({ experienceId, companyId: resolved })
      return resolved
    }
  } catch (error) {
    console.warn('[Experience Redirect] Failed to fetch experience info:', error)
  }

  if (installation?.companyId) {
    return installation.companyId
  }

  return null
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ experienceId: string }> }
) {
  const { experienceId } = await context.params

  try {
    const companyId = await resolveCompanyId(experienceId)

    if (companyId?.startsWith('biz_') && env.NEXT_PUBLIC_WHOP_APP_ID) {
      const target = `https://whop.com/dashboard/${companyId}/apps/${env.NEXT_PUBLIC_WHOP_APP_ID}`
      console.log('[Experience Redirect] Redirecting to Whop dashboard:', target)
      return NextResponse.redirect(target, { status: 302 })
    }

    if (companyId) {
      const fallback = new URL(`/dashboard/${companyId}`, request.nextUrl.origin)
      console.log('[Experience Redirect] Falling back to internal dashboard:', fallback.toString())
      return NextResponse.redirect(fallback, { status: 302 })
    }

    console.warn('[Experience Redirect] No companyId resolved, returning to experience page')
    return NextResponse.redirect(new URL(`/experiences/${experienceId}`, request.nextUrl.origin), {
      status: 302,
    })
  } catch (error) {
    console.error('[Experience Redirect] Unexpected error:', error)
    return NextResponse.redirect(new URL(`/experiences/${experienceId}`, request.nextUrl.origin), {
      status: 302,
    })
  }
}

