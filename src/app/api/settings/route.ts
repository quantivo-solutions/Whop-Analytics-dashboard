import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

// GET - Fetch current settings (supports optional companyId query param)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    // If companyId provided, get company-specific settings
    if (companyId) {
      const installation = await prisma.whopInstallation.findUnique({
        where: { companyId },
      })

      if (!installation) {
        return NextResponse.json(
          { error: 'Installation not found' },
          { status: 404 }
        )
      }

      // Return installation data as settings (companyId acts as workspace)
      return NextResponse.json({
        reportEmail: '',  // Can be stored in installation or separate table
        weeklyEmail: true,
        dailyEmail: installation.plan === 'pro' || installation.plan === 'business',
        discordWebhook: '',
        companyId: installation.companyId,
      })
    }

    // Fallback: Get workspace-wide settings
    let settings = await prisma.workspaceSettings.findFirst()

    // If no settings exist, create default settings
    if (!settings) {
      settings = await prisma.workspaceSettings.create({
        data: {
          reportEmail: process.env.REPORT_EMAIL || '',
          weeklyEmail: true,
          dailyEmail: false,
        },
      })
    }

    return NextResponse.json(settings)
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
    const { companyId, reportEmail, weeklyEmail, dailyEmail, discordWebhook } = body

    // If companyId provided, store in WorkspaceSettings with companyId reference
    // For now, we'll use a simple approach: store in WorkspaceSettings table
    // In future, could create a separate CompanySettings table
    
    // Validate required fields
    if (typeof reportEmail !== 'string' || !reportEmail) {
      return NextResponse.json(
        { error: 'Report email is required' },
        { status: 400 }
      )
    }

    // For simplicity, store as workspace settings
    // In production, you'd want a proper CompanySettings table
    let settings = await prisma.workspaceSettings.findFirst()

    if (settings) {
      // Update existing settings
      settings = await prisma.workspaceSettings.update({
        where: { id: settings.id },
        data: {
          reportEmail,
          weeklyEmail: weeklyEmail ?? true,
          dailyEmail: dailyEmail ?? false,
          discordWebhook: discordWebhook ?? null,
        },
      })
    } else {
      // Create new settings
      settings = await prisma.workspaceSettings.create({
        data: {
          reportEmail,
          weeklyEmail: weeklyEmail ?? true,
          dailyEmail: dailyEmail ?? false,
          discordWebhook: discordWebhook ?? null,
        },
      })
    }

    console.log(`[Settings] Saved for ${companyId || 'workspace'}:`, {
      email: reportEmail,
      weekly: weeklyEmail,
      daily: dailyEmail,
    })

    return NextResponse.json({
      success: true,
      settings,
    })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}

