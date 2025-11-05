/**
 * Diagnostic endpoint to check installation status for a specific company
 * GET /api/debug/check-installation?companyId=biz_jjFeUmtshsC1pr
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    
    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId parameter is required' },
        { status: 400 }
      )
    }
    
    console.log(`[Debug] Checking installation for companyId: ${companyId}`)
    
    // Check if installation exists
    const installation = await prisma.whopInstallation.findUnique({
      where: { companyId },
    })
    
    // Check for any installations with conflicting experienceId
    const allInstallations = await prisma.whopInstallation.findMany({
      select: {
        companyId: true,
        experienceId: true,
        userId: true,
        plan: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    })
    
    // Check for potential conflicts
    const conflicts = allInstallations.filter(
      (inst) => inst.experienceId && inst.companyId !== companyId
    )
    
    // Check CompanyPrefs
    const prefs = await prisma.companyPrefs.findUnique({
      where: { companyId },
    })
    
    // Check for data
    const dataCount = await prisma.metricsDaily.count({
      where: { companyId },
    })
    
    return NextResponse.json({
      companyId,
      installation: installation || null,
      prefs: prefs || null,
      dataCount,
      potentialConflicts: conflicts.length,
      recentInstallations: allInstallations.slice(0, 10),
      diagnostics: {
        installationExists: !!installation,
        prefsExist: !!prefs,
        hasData: dataCount > 0,
        installationPlan: installation?.plan || 'none',
        installationExperienceId: installation?.experienceId || 'none',
        installationUserId: installation?.userId || 'none',
      },
    })
  } catch (error: any) {
    console.error('[Debug] Error checking installation:', error)
    return NextResponse.json(
      {
        error: 'Failed to check installation',
        details: error.message,
        stack: error.stack,
      },
      { status: 500 }
    )
  }
}

