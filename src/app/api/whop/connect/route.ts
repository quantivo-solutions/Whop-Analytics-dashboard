import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/whop/connect
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { accessToken } = body

    if (!accessToken || typeof accessToken !== 'string') {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 400 }
      )
    }

    // Get or create workspace settings
    let settings = await prisma.workspaceSettings.findFirst()

    if (!settings) {
      settings = await prisma.workspaceSettings.create({
        data: {
          reportEmail: process.env.REPORT_EMAIL || '',
          weeklyEmail: true,
          dailyEmail: false,
        },
      })
    }

    // Check if WhopAccount already exists
    const existingWhopAccount = await prisma.whopAccount.findUnique({
      where: { workspaceSettingsId: settings.id },
    })

    let whopAccount

    if (existingWhopAccount) {
      // Update existing account
      whopAccount = await prisma.whopAccount.update({
        where: { id: existingWhopAccount.id },
        data: {
          accessToken,
          updatedAt: new Date(),
        },
      })
    } else {
      // Create new account
      whopAccount = await prisma.whopAccount.create({
        data: {
          workspaceSettingsId: settings.id,
          accessToken,
        },
      })
    }

    return NextResponse.json({
      success: true,
      connected: true,
      connectedAt: whopAccount.connectedAt,
    })
  } catch (error) {
    console.error('Error connecting Whop account:', error)
    return NextResponse.json(
      { error: 'Failed to connect Whop account' },
      { status: 500 }
    )
  }
}

// GET /api/whop/connect - Check connection status
export async function GET() {
  try {
    const settings = await prisma.workspaceSettings.findFirst({
      include: {
        whopAccount: true,
      },
    })

    if (!settings || !settings.whopAccount) {
      return NextResponse.json({
        connected: false,
      })
    }

    return NextResponse.json({
      connected: true,
      connectedAt: settings.whopAccount.connectedAt,
    })
  } catch (error) {
    console.error('Error checking Whop connection:', error)
    return NextResponse.json(
      { error: 'Failed to check connection status' },
      { status: 500 }
    )
  }
}

// DELETE /api/whop/connect - Disconnect Whop account
export async function DELETE() {
  try {
    const settings = await prisma.workspaceSettings.findFirst({
      include: {
        whopAccount: true,
      },
    })

    if (!settings || !settings.whopAccount) {
      return NextResponse.json({
        success: true,
        message: 'No Whop account connected',
      })
    }

    await prisma.whopAccount.delete({
      where: { id: settings.whopAccount.id },
    })

    return NextResponse.json({
      success: true,
      message: 'Whop account disconnected',
    })
  } catch (error) {
    console.error('Error disconnecting Whop account:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect Whop account' },
      { status: 500 }
    )
  }
}

