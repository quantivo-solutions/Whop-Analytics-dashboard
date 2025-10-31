/**
 * Home Page
 * Handles Whop iframe context and redirects appropriately
 */

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{
    experienceId?: string
    companyId?: string
    company_id?: string
  }>
}

export default async function Home({ searchParams }: PageProps) {
  // Check if we're in Whop iframe context (has experienceId or companyId)
  const params = await searchParams
  const experienceId = params.experienceId
  const companyId = params.companyId || params.company_id
  
  // If opened from Whop with experienceId, redirect to experience dashboard
  if (experienceId) {
    console.log('[Home] Whop iframe detected with experienceId:', experienceId)
    redirect(`/experiences/${experienceId}`)
  }
  
  // If opened from Whop with companyId, redirect to company dashboard
  if (companyId) {
    console.log('[Home] Whop iframe detected with companyId:', companyId)
    
    // Check if installation exists for this company
    const installation = await prisma.whopInstallation.findUnique({
      where: { companyId },
    })
    
    if (installation) {
      redirect(`/dashboard/${companyId}`)
    } else {
      // No installation found, show discover page
      redirect('/discover')
    }
  }
  
  // No Whop context - redirect to login
  // Don't check session here because:
  // 1. Fresh installs should always go to login first
  // 2. If user has session, they should access via /experiences/[experienceId] with experienceId from Whop
  // 3. Preventing auto-redirect to old /dashboard route
  redirect('/login')
}
