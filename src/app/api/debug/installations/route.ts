import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

// GET /api/debug/installations?show=true
// Shows all WhopInstallation records
export async function GET(req: Request) {
  // Simple protection
  const secret = req.url.includes('?show=true')
  
  if (!secret) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  }

  try {
    const installations = await prisma.whopInstallation.findMany({
      select: {
        id: true,
        companyId: true,
        experienceId: true,
        plan: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const metricsCount = await prisma.metricsDaily.groupBy({
      by: ['companyId'],
      _count: {
        id: true,
      },
    })

    return NextResponse.json({
      ok: true,
      totalInstallations: installations.length,
      installations,
      metricsPerCompany: metricsCount,
    })
  } catch (error) {
    console.error('Error fetching installations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch installations', details: String(error) },
      { status: 500 }
    )
  }
}

