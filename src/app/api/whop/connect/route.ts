import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/whop/connect
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { accessToken } = body

    if (!accessToken || typeof accessToken !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Access token is required' },
        { status: 400 }
      )
    }

    // Verify the API key before saving
    console.log('Verifying Whop API key...')
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // Increased to 5 seconds for production

    try {
      const verifyResponse = await fetch('https://api.whop.com/api/v2/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!verifyResponse.ok) {
        const errorText = await verifyResponse.text().catch(() => 'No error body')
        console.error(`Whop API key verification failed: ${verifyResponse.status} ${verifyResponse.statusText}`)
        console.error(`Response body: ${errorText}`)
        return NextResponse.json(
          { ok: false, error: 'Invalid Whop API Key', details: `Status: ${verifyResponse.status}` },
          { status: 400 }
        )
      }

      console.log('✅ Whop API key verified successfully')
    } catch (verifyError) {
      clearTimeout(timeoutId)
      const errorMessage = verifyError instanceof Error ? verifyError.message : String(verifyError)
      console.error('Error verifying Whop API key:', errorMessage)
      
      if (verifyError instanceof Error && verifyError.name === 'AbortError') {
        console.error('Verification timed out after 5 seconds')
        return NextResponse.json(
          { ok: false, error: 'Verification timed out (5s)' },
          { status: 408 }
        )
      }
      
      return NextResponse.json(
        { ok: false, error: 'Failed to verify API key', details: errorMessage },
        { status: 503 }
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
      ok: true,
      success: true,
      connected: true,
      connectedAt: whopAccount.connectedAt,
    })
  } catch (error) {
    console.error('Error connecting Whop account:', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to connect Whop account' },
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

