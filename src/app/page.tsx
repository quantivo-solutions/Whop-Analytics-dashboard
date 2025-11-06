/**
 * Home Page
 * Handles Whop iframe context and redirects appropriately
 * 
 * CRITICAL: During app installation, Whop loads this URL to verify the app works.
 * We must return a valid page, not redirect immediately, to allow installation to proceed.
 */

import { redirect } from 'next/navigation'
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
  // CRITICAL: Wrap everything in try-catch to ensure we always return a valid response
  // This prevents Whop validation from failing due to unhandled errors
  try {
    // CRITICAL: Log immediately when root page is accessed
    const headersList = await headers()
    const whopUserToken = headersList.get('x-whop-user-token')
    const referer = headersList.get('referer') || ''
    const userAgent = headersList.get('user-agent') || 'unknown'
    
    console.log('[Home] 🚀 Root page accessed:', {
      timestamp: new Date().toISOString(),
      hasWhopToken: !!whopUserToken,
      referer: referer || 'none',
      userAgent: userAgent.substring(0, 100) || 'unknown',
    })
    
    // Check if we're in Whop iframe context (has experienceId or companyId)
    const params = await searchParams
    const experienceId = params.experienceId
    const companyId = params.companyId || params.company_id
    
    console.log('[Home] 📋 Query params:', {
      experienceId: experienceId || 'none',
      companyId: companyId || 'none',
    })
    
    // Check for Whop iframe headers (these indicate we're in a Whop context)
    const isWhopContext = !!whopUserToken || referer.includes('whop.com')
    
    console.log('[Home] 🔍 Context detection:', {
      isWhopContext,
      hasWhopToken: !!whopUserToken,
      refererIncludesWhop: referer.includes('whop.com'),
    })
    
    // If opened from Whop with experienceId, redirect to experience dashboard
    if (experienceId) {
      console.log('[Home] ✅ Redirecting to experience dashboard:', experienceId)
      redirect(`/experiences/${experienceId}`)
    }
    
    // CRITICAL: If we're in a Whop context (iframe headers) but no params, show a simple install page
    // This handles the case where Whop is validating the app URL during installation
    // We MUST return a valid HTML page (not redirect) to allow Whop validation to succeed
    // IMPORTANT: During installation validation, Whop may not send params, so we should
    // prioritize showing a valid page over trying to redirect or query the database
    if (isWhopContext && !experienceId && !companyId) {
      console.log('[Home] ✅ Whop context detected WITHOUT params - showing install page (this is Whop validation)')
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
    
    // If opened from Whop with companyId, redirect to company dashboard
    // BUT: Don't query database here - let the dashboard page handle it
    // This prevents database timeouts from breaking Whop validation
    if (companyId) {
      console.log('[Home] ✅ Redirecting to company dashboard:', companyId)
      redirect(`/dashboard/${companyId}`)
    }
    
    // No Whop context detected - but to be safe, return a valid HTML page
    // This ensures Whop validation never fails even if headers aren't detected
    // Only redirect to discover if we're 100% sure it's a direct browser access
    console.log('[Home] ℹ️ No Whop context detected - showing generic page')
    
    // If user-agent suggests it's a real browser (not Whop's validation bot), redirect to discover
    const isLikelyBrowser = userAgent.includes('Mozilla') && !referer.includes('whop.com')
    
    if (isLikelyBrowser) {
      console.log('[Home] ✅ Real browser detected - redirecting to discover')
      redirect('/discover')
    }
    
    // Otherwise, show a generic page (this handles Whop validation even if headers aren't detected)
    return (
      <html>
        <head>
          <title>Whoplytics</title>
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
              color: '#666'
            }}>
              Loading...
            </p>
          </div>
        </body>
      </html>
    )
  } catch (error: any) {
    // CRITICAL: Next.js redirect() throws NEXT_REDIRECT error - this is expected behavior
    // Don't catch redirect errors - let them propagate
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error // Re-throw redirect errors so Next.js can handle them
    }
    
    // CRITICAL: Never let errors break Whop validation
    // Always return a valid HTML page even on error
    console.error('[Home] ❌ Error in root page:', error)
    
    return (
      <html>
        <head>
          <title>Whoplytics</title>
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
              color: '#666'
            }}>
              Loading...
            </p>
          </div>
        </body>
      </html>
    )
  }
}
