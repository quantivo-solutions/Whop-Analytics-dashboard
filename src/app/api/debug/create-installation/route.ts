import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

// GET /api/debug/create-installation?experienceId=exp_xxx&companyId=biz_xxx&plan=free
// Manually create a WhopInstallation record via GET
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const experienceId = searchParams.get('experienceId')
    const companyId = searchParams.get('companyId')
    const plan = searchParams.get('plan') || 'free'

    if (!experienceId && !companyId) {
      return NextResponse.json(
        { error: 'Either experienceId or companyId is required' },
        { status: 400 }
      )
    }

    const finalCompanyId = companyId || experienceId || ''
    const finalAccessToken = process.env.WHOP_APP_SERVER_KEY || 'manual_token'

    // Check if installation already exists
    const existing = await prisma.whopInstallation.findUnique({
      where: { companyId: finalCompanyId },
    })

    if (existing) {
      // Update it
      const updated = await prisma.whopInstallation.update({
        where: { companyId: finalCompanyId },
        data: {
          experienceId,
          accessToken: finalAccessToken,
          plan,
        },
      })

      return NextResponse.json({
        ok: true,
        action: 'updated',
        installation: updated,
      })
    } else {
      // Create new
      const created = await prisma.whopInstallation.create({
        data: {
          companyId: finalCompanyId,
          experienceId,
          accessToken: finalAccessToken,
          plan,
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

// POST /api/debug/create-installation
// Manually create a WhopInstallation record
// Body: { experienceId: "exp_xxx", companyId: "biz_xxx", accessToken?: "token", plan?: "free" }
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { experienceId, companyId, accessToken, plan } = body

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

    // Check if installation already exists
    const existing = await prisma.whopInstallation.findUnique({
      where: { companyId: finalCompanyId },
    })

    if (existing) {
      // Update it
      const updated = await prisma.whopInstallation.update({
        where: { companyId: finalCompanyId },
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
      // Create new
      const created = await prisma.whopInstallation.create({
        data: {
          companyId: finalCompanyId,
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

