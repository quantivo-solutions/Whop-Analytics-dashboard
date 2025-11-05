/**
 * OAuth Callback Health Check Endpoint
 * This helps verify that the callback route is accessible
 */

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const healthCheck = searchParams.get('health')
  
  if (healthCheck === 'true') {
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      route: '/api/auth/callback',
      message: 'OAuth callback endpoint is accessible',
    })
  }
  
  // If no health check, proceed with normal OAuth flow
  // (This will be handled by the actual callback handler)
  return NextResponse.json({
    status: 'ok',
    message: 'OAuth callback endpoint ready',
  })
}

