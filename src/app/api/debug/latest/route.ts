import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

/**
 * Debug endpoint to check latest data
 * GET /api/debug/latest?secret=debug
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')

    if (secret !== 'debug') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get latest row
    const latest = await prisma.metricsDaily.findFirst({
      orderBy: { date: 'desc' },
    })

    // Get all installations
    const installations = await prisma.whopInstallation.findMany()

    // Calculate freshness
    const now = new Date()
    const latestDate = latest ? new Date(latest.date) : null
    const hoursSinceLastSync = latestDate
      ? (now.getTime() - latestDate.getTime()) / (1000 * 60 * 60)
      : null
    const isDataFresh = hoursSinceLastSync !== null && hoursSinceLastSync <= 24

    return NextResponse.json({
      now: now.toISOString(),
      latest: latest
        ? {
            id: latest.id,
            companyId: latest.companyId,
            date: latest.date.toISOString(),
            grossRevenue: Number(latest.grossRevenue),
            activeMembers: latest.activeMembers,
            newMembers: latest.newMembers,
            cancellations: latest.cancellations,
            createdAt: latest.createdAt.toISOString(),
          }
        : null,
      freshness: {
        latestDate: latestDate?.toISOString(),
        hoursSinceLastSync,
        isDataFresh,
        threshold: '24 hours',
      },
      installations: installations.map((i) => ({
        companyId: i.companyId,
        plan: i.plan,
        createdAt: i.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch debug data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

