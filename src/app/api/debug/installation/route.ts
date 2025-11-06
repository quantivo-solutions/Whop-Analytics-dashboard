/**
 * Debug endpoint to inspect all installations
 * GET /api/debug/installation
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Fetch all installations
    const allInstallations = await prisma.whopInstallation.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    // Get database stats
    const totalInstallations = await prisma.whopInstallation.count()
    const withExperienceId = await prisma.whopInstallation.count({
      where: { experienceId: { not: null } }
    })
    const withoutExperienceId = await prisma.whopInstallation.count({
      where: { experienceId: null }
    })

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      stats: {
        total: totalInstallations,
        withExperienceId,
        withoutExperienceId,
      },
      recentInstallations: allInstallations,
      schema: {
        note: "Check for unique constraints and indexes",
        fields: allInstallations.length > 0 ? Object.keys(allInstallations[0]) : [],
      }
    }, { status: 200 })
  } catch (error) {
    console.error('[Debug Installation] ❌ Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch debug data',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

