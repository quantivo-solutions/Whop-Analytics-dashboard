import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'
import { getExperienceById, getCompaniesForUser } from '@/lib/whop-rest'
import { linkExperienceToCompany } from '@/lib/company'
import { verifyWhopUserToken } from '@/lib/whop-auth'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

async function parseSessionCompany(expectedExperienceId: string): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('whop_session')
    if (!sessionCookie?.value) return null
    const decoded = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString())
    const sessionExperienceId = decoded?.experienceId

    if (sessionExperienceId && sessionExperienceId !== expectedExperienceId) {
      console.log('[Experience Redirect] Ignoring session companyId - experience mismatch', {
        sessionCompanyId: decoded?.companyId,
        sessionExperienceId,
        expectedExperienceId,
      })
      return null
    }

    if (!sessionExperienceId) {
      console.log('[Experience Redirect] Session token missing experienceId, ignoring companyId fallback')
      return null
    }

    const sessionCompanyId = decoded?.companyId
    if (typeof sessionCompanyId === 'string' && sessionCompanyId.startsWith('biz_')) {
      console.log('[Experience Redirect] Session companyId found:', sessionCompanyId)
      return sessionCompanyId
    }
  } catch (error) {
    console.warn('[Experience Redirect] Failed to parse session cookie:', error)
  }
  return null
}

type ResolveResult = {
  companyId: string | null
  installUrl?: string | null
}

async function resolveCompanyId(experienceId: string): Promise<ResolveResult> {
  const installation = await prisma.whopInstallation.findUnique({
    where: { experienceId },
  }).catch(() => null)

  const whopUser = await verifyWhopUserToken().catch(() => null)
  const sessionCompanyId = await parseSessionCompany(experienceId)

  if (whopUser?.companyId?.startsWith('biz_')) {
    try {
      await linkExperienceToCompany({ experienceId, companyId: whopUser.companyId })
    } catch (error) {
      console.warn('[Experience Redirect] Failed to link via whopUser companyId:', error)
    }
    return { companyId: whopUser.companyId }
  }

  if (installation?.companyId?.startsWith('biz_')) {
    return { companyId: installation.companyId }
  }

  if (!installation) {
    console.warn('[Experience Redirect] No installation found; redirecting back to experience page', {
      experienceId,
      whopUserCompany: whopUser?.companyId || null,
      sessionCompanyId,
    })
    if (env.NEXT_PUBLIC_WHOP_APP_ID) {
      const installUrl = `https://whop.com/apps/${env.NEXT_PUBLIC_WHOP_APP_ID}/install/`
      console.log('[Experience Redirect] Forwarding to Whop install flow:', installUrl)
      return { companyId: null, installUrl }
    }
    return { companyId: null }
  }

  if (sessionCompanyId && installation && installation.companyId !== sessionCompanyId) {
    try {
      await linkExperienceToCompany({
        experienceId,
        companyId: sessionCompanyId,
      })
    } catch (error) {
      console.warn('[Experience Redirect] Failed to sync existing biz installation:', error)
    }
  }

  if (whopUser?.userId) {
    try {
      const companies = await getCompaniesForUser(whopUser.userId, {
        accessToken: installation?.accessToken || undefined,
      })

      const bizCandidate = companies.find((company: any) => {
        if (!company) return false
        if (typeof company.id === 'string' && company.id.startsWith('biz_')) return true
        if (typeof company.company_id === 'string' && company.company_id.startsWith('biz_')) return true
        return false
      })

      const resolvedBizId = bizCandidate?.id || bizCandidate?.company_id
      if (resolvedBizId?.startsWith('biz_')) {
        await linkExperienceToCompany({ experienceId, companyId: resolvedBizId })
        return { companyId: resolvedBizId }
      }
    } catch (error) {
      console.warn('[Experience Redirect] Failed to resolve via whopUser companies:', error)
    }
  }

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
    if (installation && installation.companyId !== existingBizByUser.companyId) {
      try {
        await linkExperienceToCompany({
          experienceId,
          companyId: existingBizByUser.companyId,
        })
      } catch (error) {
        console.warn('[Experience Redirect] Failed to sync existing biz installation:', error)
      }
    }
    return { companyId: existingBizByUser.companyId }
  }

  if (installation?.userId) {
    try {
      const companies = await getCompaniesForUser(installation.userId, {
        accessToken: installation.accessToken || undefined,
      })

      const bizCandidate = companies.find((company: any) => {
        if (!company) return false
        if (typeof company.id === 'string' && company.id.startsWith('biz_')) return true
        if (typeof company.company_id === 'string' && company.company_id.startsWith('biz_')) return true
        return false
      })

      const resolvedBizId = bizCandidate?.id || bizCandidate?.company_id
      if (resolvedBizId?.startsWith('biz_')) {
        await linkExperienceToCompany({ experienceId, companyId: resolvedBizId })
        return { companyId: resolvedBizId }
      }
    } catch (error) {
      console.warn('[Experience Redirect] Failed to resolve via installation user companies:', error)
    }
  }

  try {
    const exp = await getExperienceById(experienceId)
    if (!exp) {
      console.warn('[Experience Redirect] getExperienceById returned null for', experienceId)
    } else {
      console.log('[Experience Redirect] Experience payload keys:', Object.keys(exp || {}))
    }
    const resolved =
      exp?.company?.id ||
      exp?.company_id ||
      exp?.companyId ||
      exp?.company?.company_id ||
      null
    if (resolved?.startsWith('biz_')) {
      await linkExperienceToCompany({ experienceId, companyId: resolved })
      return { companyId: resolved }
    }
  } catch (error) {
    console.warn('[Experience Redirect] Failed to fetch experience info:', error)
  }

  return { companyId: null }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ experienceId: string }> }
) {
  const { experienceId } = await context.params

  try {
    const resolveResult = await resolveCompanyId(experienceId)

    if (resolveResult.installUrl) {
      const response = NextResponse.redirect(resolveResult.installUrl, { status: 302 })
      response.cookies.delete('whop_session')
      return response
    }

    const companyId = resolveResult.companyId

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

