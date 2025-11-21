/**
 * Dashboard View - Whop App
 * 
 * This is the Dashboard View for B2B analytics (per Whop App Views docs).
 * It appears in the creator's business dashboard sidebar.
 * 
 * According to Whop docs:
 * - Dashboard View is for: analytics dashboards, business operations, admin panels
 * - Should only be accessible to admins of the company
 * - Uses companyId from path: /dashboard/[companyId]
 * 
 * Access control:
 * 1. Verify user via Whop iframe headers (auto-login)
 * 2. Check user has admin access to company
 * 3. Create installation if needed
 * 4. Set session for persistence
 */

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Lock } from 'lucide-react'
import { DashboardView } from '@/components/dashboard-view'
import { getCompanySeries, getMonthlyRevenue } from '@/lib/metrics'
import { getPlanForCompany, getUpgradeUrl } from '@/lib/plan'
import { GoalProgress } from '@/components/goal-progress'
import { WhoplyticsLogo } from '@/components/whoplytics-logo'
import { getCompanyPrefs, isOnboardingComplete, getInstallationByCompany, CompanyID } from '@/lib/company'
import { PlanBadge } from '@/components/plan-badge'
import { UpgradeButtonIframe } from '@/components/upgrade-button-iframe'
import { UserProfileMenuClient } from '@/components/user-profile-menu-client'
import { verifyWhopUserToken } from '@/lib/whop-auth'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { SessionSetter } from '@/components/session-setter'
import { WizardWrapper } from '@/components/onboarding/WizardWrapper'
import { ProWelcomeWrapper } from '@/components/pro-welcome/ProWelcomeWrapper'
import { InsightsPanel } from '@/components/insights/InsightsPanel'
import { env } from '@/lib/env'
import { RemoveScopeBadge } from '@/components/remove-scope-badge'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Force no caching - ensure fresh data always
export const fetchCache = 'force-no-store'
export const preferredRegion = 'auto'

interface PageProps {
  params: Promise<{
    companyId: string
  }>
  searchParams: Promise<{
    token?: string
  }>
}

export default async function CompanyDashboardPage({ params, searchParams }: PageProps) {
  const startTime = Date.now()
  const { companyId } = await params
  const resolvedSearchParams = await searchParams
  const { token } = resolvedSearchParams

  console.log('[Dashboard View] 🎯 START - Loading dashboard for:', companyId)
  
  try {

  // STEP 1: Verify user authentication via Whop iframe headers (Dashboard View pattern)
  // According to Whop docs: Dashboard apps should verify user token first
  console.log('[Dashboard View] Step 1: Verifying Whop user authentication...')
  const whopUser = await verifyWhopUserToken()

  let installation = null
  let session = await getSession(token).catch(() => null)
  
  // TASK 2 - Page guard: Resolve installation via getInstallationByCompany
  // INTEGRITY: Use helper function to ensure proper company isolation
  try {
    installation = await getInstallationByCompany(companyId as CompanyID)
    if (!installation) {
      // Do NOT return early here. When accessed from Whop, the URL companyId
      // can differ from the creator's current installation. We'll try to
      // resolve by authenticated Whop user below and proceed.
      console.warn('[Dashboard View] No installation found for companyId:', companyId)
    } else {
      console.log('[Dashboard View] ✅ Installation found via getInstallationByCompany:', installation.companyId)
    }
  } catch (error) {
    console.error('[Dashboard View] Error resolving installation:', error)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p className="text-muted-foreground">Failed to resolve installation.</p>
        </Card>
      </div>
    )
  }

    // STEP 2: If user is authenticated via Whop, verify admin access and create/update installation
    if (whopUser && whopUser.userId) {
      console.log('[Dashboard View] ✅ Whop user authenticated:', whopUser.userId)

      // Fetch user details from Whop API to get email, profilePicUrl, etc.
      // Use /api/v5/users/{userId} with app server key (can fetch any user's public info)
      let whopUserDetails: { username?: string; email?: string; profile_pic_url?: string } = {}
      try {
        const { env } = await import('@/lib/env')
        const userResponse = await fetch(`https://api.whop.com/api/v5/users/${whopUser.userId}`, {
          headers: {
            'Authorization': `Bearer ${env.WHOP_APP_SERVER_KEY}`,
          },
        })
        
        if (userResponse.ok) {
          const userData = await userResponse.json()
          whopUserDetails = {
            username: userData.username || userData.email || userData.name || undefined,
            email: userData.email || undefined,
            profile_pic_url: userData.profile_pic_url || undefined,
          }
          console.log('[Dashboard View] ✅ Fetched user details from Whop API:', {
            username: whopUserDetails.username,
            email: whopUserDetails.email ? 'present' : 'missing',
            profilePicUrl: whopUserDetails.profile_pic_url ? 'present' : 'missing',
          })
        } else {
          console.warn('[Dashboard View] ⚠️ Failed to fetch user details from Whop API:', userResponse.status)
          // Fallback: Use username from token if available
          if (whopUser.username) {
            whopUserDetails.username = whopUser.username
          }
        }
      } catch (userError) {
        console.warn('[Dashboard View] ⚠️ Error fetching user details:', userError)
        // Fallback: Use username from token if available
        if (whopUser.username) {
          whopUserDetails.username = whopUser.username
        }
        // Continue without user details - not critical
      }

          // STEP A: Look up installation by the requested companyId first
          installation = await prisma.whopInstallation.findFirst({
            where: { companyId },
            orderBy: { updatedAt: 'desc' },
          })
          if (installation) {
            console.log('[Dashboard View] ✅ Found installation by URL companyId:', companyId)
          }

          // STEP B: If not found, fall back to any installation owned by this user (legacy behavior)
          if (!installation) {
            console.log('[Dashboard View] No installation for companyId', companyId, '- checking user installations...')
            const userInstallations = await prisma.whopInstallation.findMany({
              where: { userId: whopUser.userId },
              orderBy: { updatedAt: 'desc' },
            })

            if (userInstallations.length > 0) {
              installation = userInstallations[0]
              console.log('[Dashboard View] ✅ Found installation by userId fallback:', installation.companyId, 'plan:', installation.plan)
              if (installation.companyId !== companyId) {
                console.log('[Dashboard View] ⚠️ URL companyId differs from fallback installation companyId:', {
                  urlCompanyId: companyId,
                  installationCompanyId: installation.companyId,
                })
                console.log('[Dashboard View] ⚠️ Consider reinstalling to relink this company automatically')
              }
            }
          }

          // STEP C: If still no installation, create a new one for this company
          if (!installation) {
            // No installation found - create one for this specific company
              // Create new installation
              console.log('[Dashboard View] 🎯 Step 2: Creating NEW installation for:', companyId)
              const { env } = await import('@/lib/env')
              
              // CRITICAL: Try to create a Whop experience if one doesn't exist
              let experienceId: string | null = null
              try {
                const { createExperienceForCompany } = await import('@/lib/create-experience')
                console.log('[Dashboard View] 🚀 Attempting to create Whop experience for company:', companyId)
                experienceId = await createExperienceForCompany(companyId, env.WHOP_APP_SERVER_KEY)
                
                if (experienceId) {
                  console.log('[Dashboard View] ✅ Created/found experienceId:', experienceId)
                } else {
                  console.warn('[Dashboard View] ⚠️ Could not create experience, will try fetching existing ones')
                }
              } catch (createExpError) {
                console.warn('[Dashboard View] ⚠️ Error creating experience:', createExpError)
              }
              
              // Fallback: Try to fetch existing experiences if creation failed
              if (!experienceId) {
                try {
                  // Get company's experiences to find the experienceId
                  const experiencesResponse = await fetch(`https://api.whop.com/api/v5/companies/${companyId}/experiences`, {
                    headers: {
                      'Authorization': `Bearer ${env.WHOP_APP_SERVER_KEY}`,
                    },
                  })
                  
                  if (experiencesResponse.ok) {
                    const experiencesData = await experiencesResponse.json()
                    const experiences = experiencesData.data || []
                    
                    if (experiences.length > 0) {
                      // Use the first experience (usually the main one)
                      const foundExperienceId = experiences[0].id
                      console.log('[Dashboard View] ✅ Found experienceId for company:', foundExperienceId)
                      
                      // Check if this experienceId is already taken by another installation
                      const existingByExp = await prisma.whopInstallation.findUnique({
                        where: { experienceId: foundExperienceId },
                      })
                      
                      if (existingByExp && existingByExp.companyId !== companyId) {
                        console.warn('[Dashboard View] ⚠️ ExperienceId already taken by another company, setting to null')
                        experienceId = null
                      } else {
                        experienceId = foundExperienceId
                      }
                    } else {
                      console.log('[Dashboard View] ⚠️ No experiences found for company:', companyId)
                    }
                  } else {
                    console.warn('[Dashboard View] ⚠️ Failed to fetch experiences (status:', experiencesResponse.status, ')')
                  }
                } catch (expError) {
                  console.warn('[Dashboard View] ⚠️ Error fetching experienceId:', expError)
                  // Continue without experienceId - it can be set later
                }
              }
              
              try {
                console.log('[Dashboard View] 🚀 Attempting to create installation with data:', {
                  companyId,
                  userId: whopUser.userId,
                  experienceId: experienceId || 'null',
                  plan: 'free',
                })
                
                installation = await prisma.whopInstallation.create({
                  data: {
                    companyId,
                    userId: whopUser.userId,
                    experienceId: experienceId || null,
                    accessToken: env.WHOP_APP_SERVER_KEY,
                    plan: 'free',
                    username: whopUserDetails.username || whopUser.username || null,
                    email: whopUserDetails.email || null,
                    profilePicUrl: whopUserDetails.profile_pic_url || null,
                  },
                })
                
                console.log('[Dashboard View] ✅ NEW installation created successfully:', {
                  id: installation.id,
                  companyId: installation.companyId,
                  experienceId: installation.experienceId || 'none',
                })
                
                // CRITICAL: Verify installation was actually created
                const verifyInstallation = await prisma.whopInstallation.findFirst({
                  where: { companyId },
                  orderBy: { updatedAt: 'desc' },
                })
                if (!verifyInstallation) {
                  console.error('[Dashboard View] ❌ CRITICAL: Installation creation verification failed - installation not found in database after create')
                  throw new Error('Installation creation failed - verification returned null')
                }
                console.log('[Dashboard View] ✅ VERIFIED installation exists in database:', verifyInstallation.companyId)
                
                // Log successful attempt
                try {
                  await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://whop-analytics-dashboard-omega.vercel.app'}/api/debug/log-install-attempt`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      companyId,
                      userId: whopUser.userId,
                      experienceId: experienceId || null,
                      success: true,
                      metadata: { source: 'dashboard_view', isNew: true }
                    })
                  }).catch(err => console.warn('[Dashboard View] Failed to log attempt:', err))
                } catch (logError) {
                  console.warn('[Dashboard View] Could not log installation attempt:', logError)
                }
                
              } catch (createError: any) {
                console.error('[Dashboard View] ❌ FAILED to create installation:', {
                  companyId,
                  userId: whopUser.userId,
                  error: createError instanceof Error ? createError.message : 'Unknown',
                  code: createError?.code,
                  meta: createError?.meta,
                  stack: createError instanceof Error ? createError.stack?.substring(0, 500) : undefined,
                })
                
                // Log failed attempt
                try {
                  await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://whop-analytics-dashboard-omega.vercel.app'}/api/debug/log-install-attempt`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      companyId,
                      userId: whopUser.userId,
                      experienceId: experienceId || null,
                      success: false,
                      errorMessage: createError instanceof Error ? createError.message : 'Unknown',
                      metadata: { 
                        source: 'dashboard_view',
                        code: createError?.code,
                        meta: createError?.meta,
                      }
                    })
                  }).catch(err => console.warn('[Dashboard View] Failed to log failed attempt:', err))
                } catch (logError) {
                  console.warn('[Dashboard View] Could not log failed installation attempt:', logError)
                }
                
                throw createError
              }
              
              // Fetch and store company name
              try {
                const { updateInstallationCompanyName } = await import('@/lib/company')
                await updateInstallationCompanyName(companyId)
              } catch (nameError) {
                console.warn('[Dashboard View] Failed to fetch company name:', nameError)
              }
              
              // Ensure CompanyPrefs exists
              try {
                const { getCompanyPrefs } = await import('@/lib/company')
                await getCompanyPrefs(companyId)
                console.log('[Dashboard View] ✅ Ensured CompanyPrefs exists for new installation')
              } catch (prefsError) {
                console.error('[Dashboard View] Error ensuring CompanyPrefs:', prefsError)
              }
          }
          
          // Installation exists - always update user data and fetch experienceId if missing
          if (installation) {
            // Check if experienceId is missing and fetch it
            if (!installation.experienceId) {
              console.log('[Dashboard View] ⚠️ Installation missing experienceId, fetching from Whop API...')
              const { env } = await import('@/lib/env')
              
              try {
                const experiencesResponse = await fetch(`https://api.whop.com/api/v5/companies/${installation.companyId}/experiences`, {
                  headers: {
                    'Authorization': `Bearer ${env.WHOP_APP_SERVER_KEY}`,
                  },
                })
                
                if (experiencesResponse.ok) {
                  const experiencesData = await experiencesResponse.json()
                  const experiences = experiencesData.data || []
                  
                  if (experiences.length > 0) {
                    const foundExperienceId = experiences[0].id
                    console.log('[Dashboard View] ✅ Found experienceId for existing installation:', foundExperienceId)
                    
                    // Check if this experienceId is already taken
                    const existingByExp = await prisma.whopInstallation.findUnique({
                      where: { experienceId: foundExperienceId },
                    })
                    
                    if (!existingByExp || existingByExp.companyId === installation.companyId) {
                      // Update installation with experienceId (use composite key if userId exists)
                      if (installation.userId) {
                        installation = await prisma.whopInstallation.update({
                          where: {
                            companyId_userId: {
                              companyId: installation.companyId,
                              userId: installation.userId,
                            },
                          },
                          data: { experienceId: foundExperienceId },
                        })
                      } else {
                        await prisma.whopInstallation.updateMany({
                          where: { companyId: installation.companyId },
                          data: { experienceId: foundExperienceId },
                        })
                        const updated = await prisma.whopInstallation.findFirst({
                          where: { companyId: installation.companyId },
                          orderBy: { updatedAt: 'desc' },
                        })
                        if (updated) installation = updated
                      }
                      console.log('[Dashboard View] ✅ Updated installation with experienceId:', foundExperienceId)
                    } else {
                      console.warn('[Dashboard View] ⚠️ ExperienceId already taken by another company, skipping')
                    }
                  } else {
                    console.log('[Dashboard View] ⚠️ No experiences found for company')
                  }
                } else {
                  console.warn('[Dashboard View] ⚠️ Failed to fetch experiences (status:', experiencesResponse.status, ')')
                }
              } catch (expError) {
                console.warn('[Dashboard View] ⚠️ Error fetching experienceId:', expError)
              }
            }
            
            // Update user data to ensure it's current
            const needsUpdate = 
              installation.userId !== whopUser.userId ||
              installation.username !== (whopUserDetails.username || whopUser.username || installation.username) ||
              installation.email !== (whopUserDetails.email || installation.email) ||
              installation.profilePicUrl !== (whopUserDetails.profile_pic_url || installation.profilePicUrl)
            
            if (needsUpdate) {
              // Update using composite key if userId exists, otherwise use updateMany
              if (installation.userId || whopUser.userId) {
                const targetUserId = whopUser.userId || installation.userId
                if (!targetUserId) {
                  // Fallback to updateMany if no userId available
                  await prisma.whopInstallation.updateMany({
                    where: { companyId: installation.companyId },
                    data: {
                      userId: whopUser.userId,
                      username: whopUserDetails.username || whopUser.username || installation.username || null,
                      email: whopUserDetails.email || installation.email || null,
                      profilePicUrl: whopUserDetails.profile_pic_url || installation.profilePicUrl || null,
                    },
                  })
                } else {
                  await prisma.whopInstallation.update({
                    where: {
                      companyId_userId: {
                        companyId: installation.companyId,
                        userId: targetUserId,
                      },
                    },
                    data: {
                      userId: whopUser.userId,
                      username: whopUserDetails.username || whopUser.username || installation.username || null,
                      email: whopUserDetails.email || installation.email || null,
                      profilePicUrl: whopUserDetails.profile_pic_url || installation.profilePicUrl || null,
                    },
                  })
                }
              } else {
                await prisma.whopInstallation.updateMany({
                  where: { companyId: installation.companyId },
                  data: {
                    userId: whopUser.userId,
                    username: whopUserDetails.username || whopUser.username || installation.username || null,
                    email: whopUserDetails.email || installation.email || null,
                    profilePicUrl: whopUserDetails.profile_pic_url || installation.profilePicUrl || null,
                  },
                })
              }
              console.log('[Dashboard View] ✅ Updated installation user data')
              // Refresh installation after update
              installation = await prisma.whopInstallation.findFirst({
                where: { companyId: installation.companyId },
                orderBy: { updatedAt: 'desc' },
              })
            }
            console.log('[Dashboard View] ✅ Installation exists:', installation?.companyId, 'plan:', installation?.plan || 'unknown', 'experienceId:', installation?.experienceId || 'none')
            
            // Refresh installation to get latest plan (webhook may have updated it)
            if (installation) {
              const freshInstallation = await prisma.whopInstallation.findFirst({
                where: { companyId: installation.companyId },
                orderBy: { updatedAt: 'desc' },
              })
              if (freshInstallation) {
                installation = freshInstallation
                console.log('[Dashboard View] ✅ Installation refreshed (before session check), plan:', installation.plan)
              }
            }
          }

          // Create session if we don't have one
          if (!session && installation) {
            console.log('[Dashboard View] Creating session from Whop auth...')
            const sessionUsername = whopUserDetails.username || whopUser.username || installation?.username || undefined
            const sessionToken = Buffer.from(JSON.stringify({
              companyId: installation.companyId,
              userId: whopUser.userId,
              username: sessionUsername,
              exp: Date.now() + (30 * 24 * 60 * 60 * 1000),
            })).toString('base64')
            
            session = {
              companyId: installation.companyId,
              userId: whopUser.userId,
              username: sessionUsername,
              exp: Date.now() + (30 * 24 * 60 * 60 * 1000),
            }
            
            // Store token for SessionSetter to set cookie
            ;(global as any).__whopSessionToken = sessionToken
            console.log('[Dashboard View] ✅ Session token created')
          }
      } else {
        // No Whop auth - check for existing session
        console.log('[Dashboard View] No Whop auth, checking session...')
        if (!session) {
          console.log('[Dashboard View] No session found - redirecting to login')
          redirect(`/login?companyId=${companyId}`)
        }

        // If we have session, get installation
        if (session) {
          installation = await prisma.whopInstallation.findFirst({
            where: { companyId: session.companyId },
            orderBy: { updatedAt: 'desc' },
          })
        }
      }

  // STEP 3: Verify user has access to this company
  // For Dashboard View, we should check admin access
  // Since checkAccess isn't available in SDK yet, we verify:
  // 1. User authenticated via Whop (already done above)
  // 2. Installation exists for this company (already done above)
  // 3. User owns this installation (userId matches) OR session matches companyId
  if (session && session.companyId !== companyId) {
    // Check if the user owns this installation (userId matches)
    const userOwnsInstallation = 
      (whopUser && installation && installation.userId === whopUser.userId) ||
      (session && session.userId === installation?.userId)
    
    if (!userOwnsInstallation) {
      console.log('[Dashboard View] ⚠️ Session companyId mismatch and user does not own installation, redirecting')
      redirect(`/login?companyId=${companyId}`)
    } else {
      console.log('[Dashboard View] ✅ User owns this installation, allowing access despite session mismatch')
      // Update session to match current companyId for future requests
      const sessionUsername = session.username || whopUser?.username || installation?.username || undefined
      const sessionToken = Buffer.from(JSON.stringify({
        companyId,
        userId: session.userId || whopUser?.userId || installation?.userId || '',
        username: sessionUsername,
        exp: Date.now() + (30 * 24 * 60 * 60 * 1000),
      })).toString('base64')
      ;(global as any).__whopSessionToken = sessionToken
    }
  }

  if (!installation) {
    console.log('[Dashboard View] No installation found for companyId:', companyId)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md border-red-200 dark:border-red-800">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="rounded-full bg-red-100 dark:bg-red-950 p-3 w-12 h-12 mx-auto flex items-center justify-center">
              <Lock className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold">Installation Not Found</h2>
            <p className="text-muted-foreground">
              This app has not been installed for this company yet.
            </p>
            <p className="text-sm text-muted-foreground">
              Company ID: <code className="text-xs bg-muted px-2 py-1 rounded">{companyId}</code>
            </p>
            <div className="pt-4">
              <Link href="/login">
                <Button>Go to Login</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  console.log('[Dashboard View] ✅ Access granted, loading dashboard data...')

  // CRITICAL: Always use URL companyId for prefs/data to ensure isolation
  // Installation lookup is only for access control and plan info
  // Each dashboard URL should have its own isolated prefs
  const finalCompanyId = companyId
  
  console.log('[Dashboard View] Using URL companyId for prefs/data:', finalCompanyId)
  
  // If URL companyId doesn't match installation companyId, log warning but use URL for data
  if (installation && installation.companyId !== companyId) {
    console.log('[Dashboard View] ⚠️ URL companyId mismatch:', {
      urlCompanyId: companyId,
      installationCompanyId: installation.companyId
    })
    console.log('[Dashboard View] ⚠️ Using URL companyId for prefs/data to ensure isolation')
  }

  // STEP 4: Do not auto-switch plans across installations.
  // Plan is managed by webhooks per installation.

  // STEP 5: Refresh installation to get latest plan (webhook may have updated it)
  console.log('[Dashboard View] Refreshing installation to get latest plan...')
  if (installation) {
    const freshInstallation = await prisma.whopInstallation.findFirst({
      where: { companyId: finalCompanyId },
      orderBy: { updatedAt: 'desc' },
    })
    if (freshInstallation) {
      installation = freshInstallation
      console.log('[Dashboard View] ✅ Installation refreshed, plan:', installation.plan)
    }
  }

  // CRITICAL: Check onboarding status FIRST before fetching dashboard data
  // Always use URL companyId for prefs to ensure each dashboard is isolated
  console.log('[Dashboard View] Checking onboarding status for companyId:', finalCompanyId)
  
  let prefs
  let onboardingComplete = false
  
  try {
    // SAFETY: If installation was just updated moments ago AND plan is free, treat as fresh and reset onboarding
    // BUT: Don't reset if user just upgraded to Pro (plan is pro/business)
    if (installation && installation.plan === 'free') {
      const updatedAgoMs = Date.now() - new Date(installation.updatedAt).getTime()
      if (updatedAgoMs < 5000) {
        try {
          const { setCompanyPrefs } = await import('@/lib/company')
          await setCompanyPrefs(finalCompanyId, { completedAt: null })
          console.log('[Dashboard View] ✅ [SAFETY] Reset onboarding due to recent installation update (', updatedAgoMs, 'ms )')
        } catch (sErr) {
          console.error('[Dashboard View] Error in safety onboarding reset:', sErr)
        }
      }
    }

    prefs = await getCompanyPrefs(finalCompanyId) // Always use URL companyId for isolation
    
    // USER-LEVEL PLAN: Check if user has Pro (from UserPlan table)
    let isPro = false
    if (whopUser?.userId) {
      const { getUserPlan } = await import('@/lib/plan')
      const userPlan = await getUserPlan(whopUser.userId)
      isPro = userPlan === 'pro' || userPlan === 'business'
    } else {
      // Fallback to installation.plan for old installations (migration period)
      isPro = installation && (installation.plan === 'pro' || installation.plan === 'business')
    }
    const updatedAgoMs = installation ? Date.now() - new Date(installation.updatedAt).getTime() : 0
    const wasRecentlyUpdated = updatedAgoMs < 60000 // 60 seconds
    const onboardingWasCompleted = prefs.completedAt !== null
    const proWelcomeNotShown = prefs.proWelcomeShownAt === null
    
    const showProWelcome = isPro && wasRecentlyUpdated && onboardingWasCompleted && proWelcomeNotShown
    
    if (showProWelcome) {
      console.log('[Dashboard View] ✅ Pro upgrade detected - showing Pro welcome modal')
      const sessionTokenForClient = (global as any).__whopSessionToken
      return (
        <div className="min-h-screen bg-background">
          {sessionTokenForClient && <SessionSetter sessionToken={sessionTokenForClient} />}
          <ProWelcomeWrapper
            companyId={finalCompanyId}
          />
        </div>
      )
    }
    
    onboardingComplete = await isOnboardingComplete(finalCompanyId)
    
    console.log('[Dashboard View] Onboarding status:', {
      companyId: finalCompanyId,
      urlCompanyId: companyId,
      completedAt: prefs.completedAt,
      isComplete: onboardingComplete,
      hasGoalAmount: !!prefs.goalAmount,
      showProWelcome,
    })
  } catch (prefsError) {
    console.error('[Dashboard View] Error checking onboarding status:', prefsError)
    // On error, assume not complete to show wizard
    onboardingComplete = false
    // Create minimal prefs object
    prefs = {
      goalAmount: null,
      completedAt: null,
      companyId: finalCompanyId,
    } as any
  }

  // BLOCK dashboard access until onboarding is complete
  if (!onboardingComplete) {
    console.log('[Dashboard View] Onboarding NOT complete - showing wizard')
    const sessionTokenForClient = (global as any).__whopSessionToken
    return (
      <div className="min-h-screen bg-background">
        {sessionTokenForClient && <SessionSetter sessionToken={sessionTokenForClient} />}
          <WizardWrapper
            companyId={finalCompanyId} // Use URL companyId for isolation
          initialPrefs={{
            goalAmount: prefs.goalAmount ? Number(prefs.goalAmount) : null,
            completedAt: prefs.completedAt?.toISOString() || null,
          }}
        />
      </div>
    )
  }
  
  console.log('[Dashboard View] Onboarding complete - proceeding to dashboard')

  // STEP 6: Fetch dashboard data (only after onboarding check)
  let dashboardData
  let plan: 'free' | 'pro' | 'business' = 'free'
  
  try {
    // USER-LEVEL PLAN: Get plan from UserPlan table (applies to all companies for this user)
    if (whopUser?.userId) {
      const { getUserPlan } = await import('@/lib/plan')
      plan = await getUserPlan(whopUser.userId)
      console.log('[Dashboard View] User-level plan:', plan, 'for userId:', whopUser.userId)
    } else {
      // Fallback to installation.plan for old installations without userId (migration period)
      plan = (installation?.plan as 'free' | 'pro' | 'business') || 'free'
      console.log('[Dashboard View] Using installation.plan fallback:', plan)
    }
    
    // CRITICAL: Use dataCompanyId (may be userId-based if migration needed)
    // This handles cases where data exists under old user-based companyId
    // Pro users get 90 days extended history, Free users get 7 days
    const { getDaysForPlan } = await import('@/lib/data-window')
    const daysToFetch = getDaysForPlan(plan)
    console.log('[Dashboard View] Fetching data for companyId:', finalCompanyId, '(URL:', companyId, ', days:', daysToFetch, ')')
    dashboardData = await getCompanySeries(finalCompanyId, daysToFetch)
    console.log('[Dashboard View] ✅ Dashboard data loaded for companyId:', companyId, 'plan:', plan)
    console.log('[Dashboard View] Dashboard data companyId:', dashboardData.companyId, 'hasData:', dashboardData.hasData)
    console.log('[Dashboard View] Dashboard data series length:', dashboardData.series.length)
    console.log('[Dashboard View] Dashboard data KPIs:', {
      grossRevenue: dashboardData.kpis.grossRevenue,
      activeMembers: dashboardData.kpis.activeMembers,
      latestDate: dashboardData.kpis.latestDate,
      isDataFresh: dashboardData.kpis.isDataFresh,
    })

    // STEP 6.5: Guard against stale Pro — verify active membership ONLY if installation wasn't recently updated
    // Skip check if installation was updated within last 60 seconds (webhook may have just upgraded)
    try {
      if (whopUser && whopUser.userId && installation && plan !== 'free') {
        const updatedAgoMs = Date.now() - new Date(installation.updatedAt).getTime()
        const wasRecentlyUpdated = updatedAgoMs < 60000 // 60 seconds
        
        if (wasRecentlyUpdated) {
          console.log('[Dashboard View] ⚠️ Skipping membership check - installation updated', Math.round(updatedAgoMs / 1000), 'seconds ago (likely from webhook)')
        } else {
          const userResponse = await fetch(`https://api.whop.com/api/v5/users/${whopUser.userId}/memberships`, {
            headers: { 'Authorization': `Bearer ${env.WHOP_APP_SERVER_KEY}` },
            next: { revalidate: 0 },
          })
          let shouldDowngrade = false
          if (userResponse.ok) {
            const memberships = await userResponse.json()
            const planId = process.env.NEXT_PUBLIC_WHOP_PRO_PLAN_ID
            const hasPro = Array.isArray(memberships) && memberships.some((m: any) => {
              const status = m.status || m.state || m.membership_status
              const productId = m.product?.id || m.access_pass?.id || m.product_id
              return (status === 'valid' || status === 'active') && (!planId || productId === planId)
            })
            shouldDowngrade = !hasPro
          } else {
            // Don't downgrade on API errors - only downgrade if we can confirm no membership
            console.warn('[Dashboard View] ⚠️ Unable to verify memberships, status:', userResponse.status, '- NOT downgrading (API may be unavailable)')
            shouldDowngrade = false
          }
          if (shouldDowngrade) {
            // Update using composite key if userId exists, otherwise use updateMany
            if (installation.userId) {
              await prisma.whopInstallation.update({
                where: {
                  companyId_userId: {
                    companyId: installation.companyId,
                    userId: installation.userId,
                  },
                },
                data: { plan: 'free', updatedAt: new Date() },
              })
            } else {
              await prisma.whopInstallation.updateMany({
                where: { companyId: installation.companyId },
                data: { plan: 'free', updatedAt: new Date() },
              })
            }
            plan = 'free'
            console.log('[Dashboard View] ✅ Downgraded to free (confirmed no active membership)')
            const { setCompanyPrefs } = await import('@/lib/company')
            await setCompanyPrefs(finalCompanyId, { completedAt: null })
            console.log('[Dashboard View] ✅ Reset onboarding due to downgrade')
          }
        }
      }
    } catch (verifyErr) {
      console.error('[Dashboard View] Error verifying memberships:', verifyErr)
    }
  } catch (error) {
    console.error('[Dashboard View] Error loading dashboard data:', error)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md border-red-200 dark:border-red-800">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="rounded-full bg-red-100 dark:bg-red-950 p-3 w-12 h-12 mx-auto flex items-center justify-center">
              <Lock className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold">Unable to Load Dashboard</h2>
            <p className="text-muted-foreground">
              We encountered an issue while loading this company's dashboard.
            </p>
            <div className="pt-4">
              <Link href={`/dashboard/${companyId}`}>
                <Button variant="default" className="w-full">
                  Try Again
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  console.log('[Dashboard View] Onboarding status:', {
    companyId,
    completedAt: prefs.completedAt,
    isComplete: onboardingComplete
  })

  // BLOCK dashboard access until onboarding is complete
  if (!onboardingComplete) {
    const sessionTokenForClient = (global as any).__whopSessionToken
    return (
      <div className="min-h-screen bg-background">
        {sessionTokenForClient && <SessionSetter sessionToken={sessionTokenForClient} />}
        <WizardWrapper
          companyId={companyId}
          initialPrefs={{
            goalAmount: prefs.goalAmount ? Number(prefs.goalAmount) : null,
            completedAt: prefs.completedAt?.toISOString() || null,
          }}
        />
      </div>
    )
  }

  // Get upgrade URL with company context (use URL companyId)
  const upgradeUrl = getUpgradeUrl(finalCompanyId)

  // Calculate monthly revenue and get last sync date
  const monthlyRevenue = await getMonthlyRevenue(finalCompanyId)
  const lastSyncAt = dashboardData.kpis.latestDate
  const goalAmount = prefs.goalAmount ? Number(prefs.goalAmount) : null

  // Get session token for SessionSetter (if created from Whop auth)
  const sessionTokenForClient = (global as any).__whopSessionToken

  // Always ensure company name is stored in installation (fetch and update if missing or empty)
  if (installation) {
    if (!installation.experienceName) {
      console.log('[Dashboard View] 🔍 Company name missing, fetching from Whop API...')
      try {
        const { updateInstallationCompanyName } = await import('@/lib/company')
        await updateInstallationCompanyName(finalCompanyId)
        // Refresh installation to get updated name
        installation = await prisma.whopInstallation.findFirst({
          where: { companyId: finalCompanyId },
          orderBy: { updatedAt: 'desc' },
        })
        console.log('[Dashboard View] ✅ Installation refreshed, experienceName:', installation?.experienceName || 'still null')
      } catch (nameError) {
        console.error('[Dashboard View] ❌ Failed to update company name:', nameError)
      }
    } else {
      console.log('[Dashboard View] ✅ Company name already stored:', installation.experienceName)
    }
  } else {
    console.warn('[Dashboard View] ⚠️ No installation found, cannot fetch company name')
  }

  // Determine display name: prefer stored company name from installation, fallback to fetching fresh, then username
  const companyDisplayName =
    installation?.experienceName ||
    installation?.username ||
    'Your Dashboard'

  return (
    <div className="min-h-screen bg-background">
      {/* Set session cookie if needed */}
      {sessionTokenForClient && <SessionSetter sessionToken={sessionTokenForClient} />}
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-7xl">
        <RemoveScopeBadge />
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <WhoplyticsLogo 
                personalizedText={companyDisplayName}
                tagline="Business insights at a glance"
              />
              {/* Company/scope badge removed per request */}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <PlanBadge plan={plan} />
              {plan === 'free' && <UpgradeButtonIframe plan={plan} />}
              {installation && (
                <UserProfileMenuClient
                  companyId={finalCompanyId} // Use URL companyId for isolation
                  username={installation.username}
                  email={installation.email}
                  profilePicUrl={installation.profilePicUrl}
                  plan={plan}
                  prefs={{
                    goalAmount: prefs.goalAmount ? Number(prefs.goalAmount) : null,
                    completedAt: prefs.completedAt?.toISOString() || null,
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Goal Progress Bar */}
        <div className="mb-6">
          <GoalProgress
            goalAmount={goalAmount}
            revenueThisMonth={monthlyRevenue}
            lastSyncAt={lastSyncAt}
            companyId={finalCompanyId}
          />
        </div>

        {/* Dashboard view */}
        <DashboardView data={dashboardData} showBadge={true} plan={plan} upgradeUrl={upgradeUrl} companyId={finalCompanyId} />

        {/* Insights Panel */}
        <div className="mt-8">
          <InsightsPanel data={dashboardData} plan={plan} goalAmount={goalAmount} />
        </div>
      </div>
    </div>
  )
  } catch (error: any) {
    // CRITICAL: Never 500 on unknown IDs - return friendly 200 OK response instead
    console.error('[Whoplytics] Error loading dashboard:', {
      companyId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
    })
    
    // Return friendly "Not installed yet" state with Install CTA (200 OK, not 500)
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-4xl">
          <Card className="p-8 text-center">
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-2xl font-bold">Whoplytics Setup Required</h2>
              <p className="text-muted-foreground">
                We couldn't automatically set up your analytics dashboard. Please install Whoplytics from your Whop dashboard.
              </p>
              <div className="pt-4">
                <Link href="/discover">
                  <Button variant="default">Learn More</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }
}

