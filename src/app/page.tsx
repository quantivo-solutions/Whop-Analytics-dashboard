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
  searchParams: {
    experienceId?: string
    companyId?: string
    company_id?: string
  }
}

export default async function Home({ searchParams }: PageProps) {
  // Check if we're in Whop iframe context (has experienceId or companyId)
  const experienceId = searchParams.experienceId
  const companyId = searchParams.companyId || searchParams.company_id
  
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
  
  // No Whop context, check normal session
  const session = await getSession()
  
  if (session) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
