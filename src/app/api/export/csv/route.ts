import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { getPlanForCompany, hasPro } from '@/lib/plan'
import { verifyWhopUserToken } from '@/lib/whop-auth'

export const runtime = 'nodejs'

/**
 * CSV Export API Route
 * Pro-only feature: Export dashboard data as CSV
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const days = parseInt(searchParams.get('days') || '90', 10)

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId required' },
        { status: 400 }
      )
    }

    // Auth: Check both session AND Whop iframe headers
    const session = await getSession().catch(() => null)
    
    // Check for Whop iframe auth
    let whopUserId: string | null = null
    try {
      const whopUser = await verifyWhopUserToken().catch(() => null)
      if (whopUser?.userId) {
        whopUserId = whopUser.userId
      }
    } catch (whopError) {
      // Not in iframe or no header
    }
    
    const currentUserId = whopUserId || session?.userId
    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user owns this installation
    const installation = await prisma.whopInstallation.findUnique({
      where: { companyId },
    })

    if (!installation) {
      return NextResponse.json(
        { error: 'Installation not found' },
        { status: 404 }
      )
    }

    const userOwnsInstallation =
      (session && session.companyId === companyId) ||
      (currentUserId && installation.userId === currentUserId)

    if (!userOwnsInstallation) {
      return NextResponse.json(
        { error: 'Unauthorized - user does not own this installation' },
        { status: 401 }
      )
    }

    // Check if user has Pro plan (CSV export is Pro-only)
    const plan = await getPlanForCompany(companyId)
    if (!hasPro(plan)) {
      return NextResponse.json(
        { error: 'CSV export requires Pro plan. Upgrade to unlock this feature.' },
        { status: 402 }
      )
    }

    // Fetch data
    const metrics = await prisma.metricsDaily.findMany({
      where: { companyId },
      orderBy: { date: 'asc' },
      take: Math.min(days, 365), // Max 365 days
    })

    if (metrics.length === 0) {
      return NextResponse.json(
        { error: 'No data available for export' },
        { status: 404 }
      )
    }

    // Generate CSV
    const headers = ['Date', 'Gross Revenue', 'Active Members', 'New Members', 'Cancellations', 'Trials Started', 'Trials Paid']
    const rows = metrics.map(m => [
      new Date(m.date).toISOString().split('T')[0],
      Number(m.grossRevenue).toFixed(2),
      m.activeMembers.toString(),
      m.newMembers.toString(),
      m.cancellations.toString(),
      m.trialsStarted.toString(),
      m.trialsPaid.toString(),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n')

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="whoplytics-export-${companyId}-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('[CSV Export] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate CSV export' },
      { status: 500 }
    )
  }
}

