import { NextResponse } from 'next/server'

/**
 * Debug endpoint to check environment variables
 * Protected by secret parameter
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')

    if (!secret || secret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all WHOP-related env vars
    const whopVars = Object.keys(process.env)
      .filter(key => key.includes('WHOP'))
      .reduce((acc, key) => {
        const value = process.env[key]
        acc[key] = value ? `${value.substring(0, 10)}...` : 'undefined'
        return acc
      }, {} as Record<string, string>)

    // Check specific vars
    const checks = {
      WHOP_API_KEY: {
        exists: !!process.env.WHOP_API_KEY,
        length: process.env.WHOP_API_KEY?.length || 0,
        preview: process.env.WHOP_API_KEY?.substring(0, 10) || 'N/A'
      },
      WHOP_SK: {
        exists: !!process.env.WHOP_SK,
        length: process.env.WHOP_SK?.length || 0,
        preview: process.env.WHOP_SK?.substring(0, 10) || 'N/A'
      },
      NEXT_PUBLIC_WHOP_APP_ID: {
        exists: !!process.env.NEXT_PUBLIC_WHOP_APP_ID,
        value: process.env.NEXT_PUBLIC_WHOP_APP_ID || 'N/A'
      }
    }

    return NextResponse.json({
      ok: true,
      message: 'Environment variable debug info',
      whopRelatedVars: whopVars,
      specificChecks: checks,
      totalEnvVars: Object.keys(process.env).length,
      envVarNames: Object.keys(process.env).sort()
    })
  } catch (error) {
    console.error('Error in debug endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to check environment' },
      { status: 500 }
    )
  }
}

