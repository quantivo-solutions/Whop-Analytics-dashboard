import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch current settings
export async function GET() {
  try {
    // Get the first (and only) settings row
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

// POST - Update settings
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { reportEmail, weeklyEmail, dailyEmail, discordWebhook } = body

    // Validate required fields
    if (typeof reportEmail !== 'string') {
      return NextResponse.json(
        { error: 'Report email is required' },
        { status: 400 }
      )
    }

    // Get existing settings
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

