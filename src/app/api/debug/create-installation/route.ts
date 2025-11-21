import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

// GET /api/debug/create-installation?experienceId=exp_xxx&companyId=biz_xxx&userId=user_xxx&plan=free&secret=CRON_SECRET
// Manually create a WhopInstallation record via GET
// NOTE: userId is now REQUIRED for installations
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const experienceId = searchParams.get('experienceId')
    const companyId = searchParams.get('companyId')
    const userId = searchParams.get('userId') || 'debug_user_' + Date.now() // Fallback for debug
    const plan = searchParams.get('plan') || 'free'
    const secret = searchParams.get('secret')
    
    // Require secret for security
    const requiredSecret = process.env.CRON_SECRET
    if (requiredSecret && secret !== requiredSecret) {
      return NextResponse.json(
        { error: 'Unauthorized - secret required' },
        { status: 401 }
      )
    }

    if (!experienceId && !companyId) {
      return NextResponse.json(
        { error: 'Either experienceId or companyId is required' },
        { status: 400 }
      )
    }

    const finalCompanyId = companyId || experienceId || ''
    const finalAccessToken = process.env.WHOP_APP_SERVER_KEY || 'manual_token'

    console.log(`[Debug Create Installation] Creating installation for companyId: ${finalCompanyId}`)

    // Check if installation already exists (use composite key)
    const existing = await prisma.whopInstallation.findUnique({
      where: {
        companyId_userId: {
          companyId: finalCompanyId,
          userId: userId,
        },
      },
    })

    if (existing) {
      // Update it
      const updated = await prisma.whopInstallation.update({
        where: {
          companyId_userId: {
            companyId: finalCompanyId,
            userId: userId,
          },
        },
        data: {
          experienceId: experienceId || existing.experienceId, // Only update if provided
          accessToken: finalAccessToken,
          plan,
          updatedAt: new Date(),
        },
      })

      // Ensure CompanyPrefs exists
      try {
        const { getCompanyPrefs } = await import('@/lib/company')
        await getCompanyPrefs(finalCompanyId)
      } catch (prefsError) {
        console.error('[Debug Create Installation] Failed to ensure CompanyPrefs:', prefsError)
      }

      return NextResponse.json({
        ok: true,
        action: 'updated',
        installation: updated,
        message: 'Installation updated successfully',
      })
    } else {
      // Check for experienceId conflicts before creating
      let finalExperienceId = experienceId
      if (experienceId) {
        const conflict = await prisma.whopInstallation.findUnique({
          where: { experienceId },
        })
        if (conflict) {
          console.warn(`[Debug Create Installation] ExperienceId ${experienceId} already taken by ${conflict.companyId}, setting to null`)
          finalExperienceId = null
        }
      }

      // Create new (userId is required)
      const created = await prisma.whopInstallation.create({
        data: {
          companyId: finalCompanyId,
          userId: userId, // REQUIRED
          experienceId: finalExperienceId || null,
          accessToken: finalAccessToken,
          plan,
        },
      })

      // Ensure CompanyPrefs exists
      try {
        const { getCompanyPrefs } = await import('@/lib/company')
        await getCompanyPrefs(finalCompanyId)
      } catch (prefsError) {
        console.error('[Debug Create Installation] Failed to ensure CompanyPrefs:', prefsError)
      }

      return NextResponse.json({
        ok: true,
        action: 'created',
        installation: created,
        message: 'Installation created successfully',
      })
    }
  } catch (error: any) {
    console.error('[Debug Create Installation] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create installation', 
        details: error.message,
        code: error.code,
        meta: error.meta,
      },
      { status: 500 }
    )
  }
}

// POST /api/debug/create-installation
// Manually create a WhopInstallation record
// Body: { experienceId: "exp_xxx", companyId: "biz_xxx", userId: "user_xxx", accessToken?: "token", plan?: "free" }
// NOTE: userId is now REQUIRED
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { experienceId, companyId, userId, accessToken, plan } = body
    
    // userId is required, use fallback for debug
    const finalUserId = userId || 'debug_user_' + Date.now()

    if (!experienceId && !companyId) {
      return NextResponse.json(
        { error: 'Either experienceId or companyId is required' },
        { status: 400 }
      )
    }

    // Use companyId or derive from experienceId
    const finalCompanyId = companyId || experienceId
    const finalAccessToken = accessToken || process.env.WHOP_APP_SERVER_KEY || 'manual_token'
    const finalPlan = plan || 'free'

    // Check if installation already exists (use composite key)
    const existing = await prisma.whopInstallation.findUnique({
      where: {
        companyId_userId: {
          companyId: finalCompanyId,
          userId: finalUserId,
        },
      },
    })

    if (existing) {
      // Update it
      const updated = await prisma.whopInstallation.update({
        where: {
          companyId_userId: {
            companyId: finalCompanyId,
            userId: finalUserId,
          },
        },
        data: {
          experienceId,
          accessToken: finalAccessToken,
          plan: finalPlan,
        },
      })

      return NextResponse.json({
        ok: true,
        action: 'updated',
        installation: updated,
      })
    } else {
      // Create new (userId is required)
      const created = await prisma.whopInstallation.create({
        data: {
          companyId: finalCompanyId,
          userId: finalUserId, // REQUIRED
          experienceId,
          accessToken: finalAccessToken,
          plan: finalPlan,
        },
      })

      return NextResponse.json({
        ok: true,
        action: 'created',
        installation: created,
      })
    }
  } catch (error) {
    console.error('Error creating installation:', error)
    return NextResponse.json(
      { error: 'Failed to create installation', details: String(error) },
      { status: 500 }
    )
  }
}

