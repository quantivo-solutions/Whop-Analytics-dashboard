/**
 * Home Page
 * Handles Whop iframe context and redirects appropriately
 * 
 * CRITICAL: During app installation, Whop loads this URL to verify the app works.
 * We must return a valid page, not redirect immediately, to allow installation to proceed.
 */

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'

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
  
  // Check for Whop iframe headers (these indicate we're in a Whop context)
  const headersList = await headers()
  const whopUserToken = headersList.get('x-whop-user-token')
  const referer = headersList.get('referer') || ''
  const isWhopContext = !!whopUserToken || referer.includes('whop.com')
  
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
  
  // If we're in a Whop context (iframe headers) but no params, show a simple install page
  // This handles the case where Whop is validating the app URL during installation
  if (isWhopContext) {
    console.log('[Home] Whop context detected (headers), showing install page')
    return (
      <html>
        <head>
          <title>Whoplytics - Installing...</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        <body style={{ 
          margin: 0, 
          padding: 0, 
          fontFamily: 'system-ui, -apple-system, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(to bottom, #f0f0f0, #ffffff)'
        }}>
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            maxWidth: '600px'
          }}>
            <h1 style={{ 
              fontSize: '2rem', 
              marginBottom: '1rem',
              color: '#333'
            }}>
              Whoplytics
            </h1>
            <p style={{ 
              fontSize: '1.1rem', 
              color: '#666',
              marginBottom: '2rem'
            }}>
              Your analytics dashboard is being set up...
            </p>
            <div style={{
              display: 'inline-block',
              padding: '1rem 2rem',
              background: '#0070f3',
              color: 'white',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '500'
            }}>
              Please wait
            </div>
          </div>
        </body>
      </html>
    )
  }
  
  // No Whop context - show discover page
  // This is for direct access (not from Whop)
  redirect('/discover')
}
