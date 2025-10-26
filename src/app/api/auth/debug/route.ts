/**
 * Debug endpoint to check OAuth configuration
 * Remove this in production!
 */

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({
    hasAppId: !!process.env.NEXT_PUBLIC_WHOP_APP_ID,
    appId: process.env.NEXT_PUBLIC_WHOP_APP_ID?.substring(0, 8) + '...',
    hasServerKey: !!process.env.WHOP_APP_SERVER_KEY,
    serverKeyLength: process.env.WHOP_APP_SERVER_KEY?.length || 0,
    nodeEnv: process.env.NODE_ENV,
  })
}

