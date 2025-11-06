/**
 * Debug endpoint to log and retrieve installation attempts
 * POST /api/debug/log-install-attempt - Log an attempt
 * GET /api/debug/log-install-attempt - Get recent attempts
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const attempt = await prisma.installationAttempt.create({
      data: {
        companyId: body.companyId || null,
        experienceId: body.experienceId || null,
        userId: body.userId || null,
        success: body.success || false,
        errorMessage: body.errorMessage || null,
        metadata: body.metadata || {},
      },
    })
    
    console.log('[Debug] ✅ Logged installation attempt:', {
      id: attempt.id,
      companyId: attempt.companyId,
      success: attempt.success,
    })
    
    return NextResponse.json({ success: true, attempt })
  } catch (error) {
    console.error('[Debug] ❌ Failed to log installation attempt:', error)
    return NextResponse.json(
      { 
        error: 'Failed to log attempt',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const attempts = await prisma.installationAttempt.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    
    return NextResponse.json({
      total: attempts.length,
      attempts,
    })
  } catch (error) {
    console.error('[Debug] ❌ Failed to fetch attempts:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch attempts',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

