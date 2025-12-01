import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'

export const runtime = 'nodejs'

/**
 * POST /api/test/bootstrap-simulation?companyId=TEST&secret=CRON_SECRET
 * 
 * End-to-end simulation helper for testing bootstrap functionality
 * This endpoint:
 * 1. Triggers bootstrap for a test company
 * 2. Validates data was written to MetricsDaily
 * 3. Returns validation results
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    const testCompanyId = searchParams.get('companyId') || 'TEST_BOOTSTRAP'

    // Verify secret
    if (!secret || secret !== env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`[Bootstrap Simulation] 🧪 Starting simulation for company: ${testCompanyId}`)

    // Step 1: Check if test installation exists
    const installation = await prisma.whopInstallation.findFirst({
      where: { companyId: testCompanyId },
      orderBy: { updatedAt: 'desc' },
    })

    if (!installation) {
      return NextResponse.json({
        ok: false,
        error: `No installation found for companyId: ${testCompanyId}. Please create a test installation first.`,
      }, { status: 404 })
    }

    if (!installation.accessToken) {
      return NextResponse.json({
        ok: false,
        error: `Installation missing accessToken`,
      }, { status: 400 })
    }

    // Step 2: Trigger bootstrap via internal API call
    const requestUrl = new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    const bootstrapUrl = new URL('/api/ingest/whop/bootstrap', requestUrl.origin)
    bootstrapUrl.searchParams.set('secret', env.CRON_SECRET)
    bootstrapUrl.searchParams.set('companyId', testCompanyId)
    bootstrapUrl.searchParams.set('days', '7') // Test with 7 days

    console.log(`[Bootstrap Simulation] 🚀 Triggering bootstrap: ${bootstrapUrl.toString()}`)

    const bootstrapResponse = await fetch(bootstrapUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    const bootstrapResult = await bootstrapResponse.json()
    console.log(`[Bootstrap Simulation] Bootstrap response:`, bootstrapResult)

    // Step 3: Wait a moment for bootstrap to complete
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Step 4: Validate data was written
    const metrics = await prisma.metricsDaily.findMany({
      where: { companyId: testCompanyId },
      orderBy: { date: 'desc' },
      take: 30,
    })

    const installationAfter = await prisma.whopInstallation.findFirst({
      where: { companyId: testCompanyId },
      orderBy: { updatedAt: 'desc' },
    })

    // Step 5: Return validation results
    return NextResponse.json({
      ok: true,
      simulation: {
        companyId: testCompanyId,
        bootstrapTriggered: bootstrapResponse.ok,
        bootstrapResult,
        metricsWritten: metrics.length,
        metrics: metrics.map(m => ({
          date: m.date.toISOString().split('T')[0],
          grossRevenue: m.grossRevenue.toString(),
          activeMembers: m.activeMembers,
          newMembers: m.newMembers,
        })),
        bootstrapStatus: {
          startedAt: installationAfter?.bootstrapStartedAt?.toISOString() || null,
          completedAt: installationAfter?.bootstrapCompletedAt?.toISOString() || null,
          error: installationAfter?.bootstrapError || null,
          isRunning: !!(installationAfter?.bootstrapStartedAt && !installationAfter?.bootstrapCompletedAt && !installationAfter?.bootstrapError),
        },
      },
      validation: {
        bootstrapCompleted: !!installationAfter?.bootstrapCompletedAt,
        hasMetrics: metrics.length > 0,
        allDaysHaveData: metrics.length >= 7,
        noErrors: !installationAfter?.bootstrapError,
      },
    })
  } catch (error) {
    console.error('[Bootstrap Simulation] Error:', error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/test/bootstrap-simulation?companyId=TEST&secret=CRON_SECRET
 * 
 * Check bootstrap status and metrics for a test company
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    const testCompanyId = searchParams.get('companyId') || 'TEST_BOOTSTRAP'

    if (!secret || secret !== env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const installation = await prisma.whopInstallation.findFirst({
      where: { companyId: testCompanyId },
      orderBy: { updatedAt: 'desc' },
    })

    if (!installation) {
      return NextResponse.json({
        ok: false,
        error: `No installation found for companyId: ${testCompanyId}`,
      }, { status: 404 })
    }

    const metrics = await prisma.metricsDaily.findMany({
      where: { companyId: testCompanyId },
      orderBy: { date: 'desc' },
      take: 30,
    })

    return NextResponse.json({
      ok: true,
      companyId: testCompanyId,
      bootstrapStatus: {
        startedAt: installation.bootstrapStartedAt?.toISOString() || null,
        completedAt: installation.bootstrapCompletedAt?.toISOString() || null,
        error: installation.bootstrapError || null,
        isRunning: !!(installation.bootstrapStartedAt && !installation.bootstrapCompletedAt && !installation.bootstrapError),
      },
      metrics: {
        count: metrics.length,
        oldestDate: metrics.length > 0 ? metrics[metrics.length - 1].date.toISOString().split('T')[0] : null,
        newestDate: metrics.length > 0 ? metrics[0].date.toISOString().split('T')[0] : null,
        sample: metrics.slice(0, 5).map(m => ({
          date: m.date.toISOString().split('T')[0],
          grossRevenue: m.grossRevenue.toString(),
          activeMembers: m.activeMembers,
        })),
      },
    })
  } catch (error) {
    console.error('[Bootstrap Simulation] Error:', error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

