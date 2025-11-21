/**
 * Company Preferences & Onboarding Helpers
 * 
 * Server-only utilities for managing company onboarding and preferences
 * 
 * TASK 1: Strong typing + helpers for multi-tenant isolation
 */

import { prisma } from './prisma'
import { Prisma } from '@prisma/client'

/**
 * Strong type for Company ID to ensure consistency
 */
export type CompanyID = string

/**
 * Get installation by experience ID
 * Used for Experience View pages
 */
export async function getInstallationByExperience(experienceId: string) {
  return prisma.whopInstallation.findUnique({ 
    where: { experienceId } 
  })
}

/**
 * Get installation by company ID and userId (if provided)
 * Used for Dashboard View pages
 * 
 * INTEGRITY: Always use this helper to ensure we're querying the correct company
 * 
 * Note: Since installations are now keyed by (companyId + userId), if userId is provided,
 * we use the composite key. Otherwise, we use findFirst to get any installation for the company.
 */
export async function getInstallationByCompany(companyId: CompanyID, userId?: string) {
  if (!companyId) {
    throw new Error('[Company Integrity] Missing companyId parameter')
  }
  
  // If userId is provided, use composite key
  if (userId) {
    return prisma.whopInstallation.findUnique({
      where: {
        companyId_userId: {
          companyId,
          userId,
        },
      },
    })
  }
  
  // Otherwise, get first installation for this company (for backward compatibility)
  return prisma.whopInstallation.findFirst({
    where: { companyId },
    orderBy: { updatedAt: 'desc' },
  })
}

export interface CompanyPrefsData {
  goalAmount?: number | null
  wantsDailyMail?: boolean
  wantsDiscord?: boolean
  completedAt?: Date | null
  proWelcomeShownAt?: Date | null
}

/**
 * Get company preferences, creating default row if it doesn't exist
 */
export async function getCompanyPrefs(companyId: string) {
  try {
    let prefs = await prisma.companyPrefs.findUnique({
      where: { companyId },
    })

    if (!prefs) {
      // Create default row
      prefs = await prisma.companyPrefs.create({
        data: {
          companyId,
          goalAmount: null,
          wantsDailyMail: false,
          wantsDiscord: false,
          completedAt: null,
          proWelcomeShownAt: null,
        },
      })
      console.log('[Company Prefs] Created default prefs for:', companyId)
    }

    return prefs
  } catch (error) {
    console.error('[Company Prefs] Error getting prefs:', error)
    throw error
  }
}

/**
 * Update company preferences (merge patch)
 */
export async function setCompanyPrefs(
  companyId: string,
  patch: CompanyPrefsData
): Promise<void> {
  try {
    const updateData: Prisma.CompanyPrefsUpdateInput = {}

    if (patch.goalAmount !== undefined) {
      updateData.goalAmount = patch.goalAmount !== null ? new Prisma.Decimal(patch.goalAmount) : null
    }
    if (patch.wantsDailyMail !== undefined) {
      updateData.wantsDailyMail = patch.wantsDailyMail
    }
    if (patch.wantsDiscord !== undefined) {
      updateData.wantsDiscord = patch.wantsDiscord
    }
    if (patch.completedAt !== undefined) {
      updateData.completedAt = patch.completedAt
    }
    if (patch.proWelcomeShownAt !== undefined) {
      updateData.proWelcomeShownAt = patch.proWelcomeShownAt
    }

    await prisma.companyPrefs.upsert({
      where: { companyId },
      create: {
        companyId,
        goalAmount: patch.goalAmount !== undefined && patch.goalAmount !== null ? new Prisma.Decimal(patch.goalAmount) : null,
        wantsDailyMail: patch.wantsDailyMail ?? false,
        wantsDiscord: patch.wantsDiscord ?? false,
        completedAt: patch.completedAt ?? null,
        proWelcomeShownAt: patch.proWelcomeShownAt ?? null,
      },
      update: updateData,
    })

    console.log('[Company Prefs] Updated prefs for:', companyId, patch)
  } catch (error) {
    console.error('[Company Prefs] Error setting prefs:', error)
    throw error
  }
}

/**
 * Fetch and update company name for an installation
 * This ensures the company name is always available for display
 */
export async function updateInstallationCompanyName(companyId: CompanyID): Promise<void> {
  console.log(`[Company] 🔍 Fetching company name for ${companyId}...`)
  
  // First, try to get company name from the installation's experienceId if available
  const installation = await prisma.whopInstallation.findFirst({
    where: { companyId },
    orderBy: { updatedAt: 'desc' },
  })
  
  console.log(`[Company] 📋 Installation fetched:`, {
    exists: !!installation,
    experienceId: installation?.experienceId || 'none',
    companyId: installation?.companyId || 'none',
  })
  
  let companyName: string | undefined = undefined
  
  // Strategy 1: Try to get company name from experience using Whop SDK (if experienceId exists)
  if (installation?.experienceId) {
    try {
      console.log(`[Company] 📡 Trying to get company name via Whop SDK experienceId: ${installation.experienceId}`)
      const { whopSdk } = await import('@/lib/whop-sdk')
      const experience = await whopSdk.experiences.getExperience({ experienceId: installation.experienceId })
      
      if (experience) {
        console.log(`[Company] 📦 Experience data received from SDK, keys:`, Object.keys(experience))
        
        // Try to extract company name from experience data
        // The SDK might return company data in different formats
        const expCompanyName = 
          (experience as any).company?.name ||
          (experience as any).company?.company_name ||
          (experience as any).company?.title ||
          (experience as any).name ||
          (experience as any).title ||
          undefined
        
        console.log(`[Company] 📦 Extracted company name from experience: "${expCompanyName || 'none'}"`)
        console.log(`[Company] 📦 Full experience data:`, JSON.stringify(experience, null, 2))
        
        if (expCompanyName) {
          companyName = expCompanyName
          console.log(`[Company] ✅ Found company name via Whop SDK experience: "${companyName}"`)
        }
      }
    } catch (expError) {
      console.warn(`[Company] ⚠️ Failed to get company name via Whop SDK experience:`, expError)
      if (expError instanceof Error) {
        console.warn(`[Company] ⚠️ Error details:`, expError.message, expError.stack)
      }
    }
  }
  
  // Strategy 2: If not found via experience, try direct company endpoint
  if (!companyName) {
    try {
      console.log(`[Company] 📡 Trying to get company name via direct company endpoint...`)
      const { getCompanyById } = await import('@/lib/whop-rest')
      const companyData = await getCompanyById(companyId)
      
      console.log(`[Company] 📦 Company data received:`, JSON.stringify(companyData, null, 2))
      
      if (companyData?.name) {
        companyName = companyData.name
        console.log(`[Company] ✅ Found company name via company endpoint: "${companyName}"`)
      } else if (companyData) {
        console.warn(`[Company] ⚠️ Company data exists but no name field found. Data keys:`, Object.keys(companyData))
        console.warn(`[Company] ⚠️ Full company data:`, JSON.stringify(companyData, null, 2))
      }
    } catch (companyError) {
      console.warn(`[Company] ⚠️ Failed to get company name via company endpoint:`, companyError)
    }
  }
  
  // Update installation if we found a name
  if (companyName && installation) {
    try {
      let updated
      if (installation.userId) {
        updated = await prisma.whopInstallation.update({
          where: {
            companyId_userId: {
              companyId,
              userId: installation.userId,
            },
          },
          data: { experienceName: companyName },
        })
      } else {
        await prisma.whopInstallation.updateMany({
          where: { companyId },
          data: { experienceName: companyName },
        })
        updated = await prisma.whopInstallation.findFirst({
          where: { companyId },
          orderBy: { updatedAt: 'desc' },
        })
      }
      if (updated) {
        console.log(`[Company] ✅ Updated company name for ${companyId}: "${companyName}"`)
        console.log(`[Company] ✅ Installation updated:`, { id: updated.id, experienceName: updated.experienceName })
      }
    } catch (updateError) {
      console.error(`[Company] ❌ Failed to update installation with company name:`, updateError)
    }
  } else {
    console.warn(`[Company] ⚠️ Could not find company name for ${companyId} via any method`)
  }
}

/**
 * Link experience to company (upsert installation mapping)
 * This auto-claims installations when Whop opens /experiences/[experienceId]
 * 
 * @param params - Object with experienceId and companyId
 * @returns Object indicating if installation was created or updated
 */
export async function linkExperienceToCompany(params: { experienceId: string; companyId: string }) {
  const { experienceId, companyId } = params
  
  // GUARD: Ensure companyId is biz_* format
  if (!companyId?.startsWith("biz_")) {
    throw new Error(`[Whoplytics] Invalid companyId format: must start with 'biz_' but got '${companyId}'`)
  }
  
  console.log(`[Whoplytics] Linking experience ${experienceId} to company ${companyId}`)
  
  // Try by experience first (most reliable - experienceId is still unique)
  const byExp = await prisma.whopInstallation.findUnique({ where: { experienceId } }).catch(() => null)
  
  if (byExp) {
    if (byExp.companyId !== companyId) {
      // Update companyId if it changed (shouldn't happen, but handle gracefully)
      // Note: This requires userId for composite key, so we need to use findFirst and updateMany
      await prisma.whopInstallation.updateMany({
        where: { experienceId },
        data: { companyId },
      })
      console.log(`[Whoplytics] Updated installation: experienceId ${experienceId} now linked to companyId ${companyId}`)
      return { created: false, updated: true }
    }
    return { created: false, updated: false }
  }
  
  // Try by company (get first installation for this company)
  const byCompany = await prisma.whopInstallation.findFirst({ 
    where: { companyId },
    orderBy: { updatedAt: 'desc' },
  })
  
  if (byCompany) {
    if (byCompany.experienceId !== experienceId) {
      // Update experienceId if userId matches (or update first one found)
      if (byCompany.userId) {
        await prisma.whopInstallation.update({
          where: {
            companyId_userId: {
              companyId: byCompany.companyId,
              userId: byCompany.userId,
            },
          },
          data: { experienceId },
        })
      } else {
        // Fallback: updateMany if no userId
        await prisma.whopInstallation.updateMany({
          where: { companyId },
          data: { experienceId },
        })
      }
      console.log(`[Whoplytics] Updated installation: companyId ${companyId} now linked to experienceId ${experienceId}`)
      return { created: false, updated: true }
    }
    return { created: false, updated: false }
  }
  
  // NOTE: Cannot create installation without userId (required field)
  // This function should be called with userId from the calling context
  throw new Error(`[Whoplytics] Cannot create installation without userId. Please provide userId when linking experience to company.`)
}

/**
 * Ensure companyId is biz_* format (guard function)
 */
export function ensureBizCompanyId(companyId: string | null | undefined): CompanyID {
  if (!companyId) {
    throw new Error('[Whoplytics] Missing companyId parameter')
  }
  if (!companyId.startsWith('biz_')) {
    throw new Error(`[Whoplytics] Invalid companyId format: must start with 'biz_' but got '${companyId}'`)
  }
  return companyId as CompanyID
}

/**
 * Check if onboarding is complete for a company
 */
export async function isOnboardingComplete(companyId: string): Promise<boolean> {
  try {
    const prefs = await getCompanyPrefs(companyId)
    return prefs.completedAt !== null
  } catch (error) {
    console.error('[Company Prefs] Error checking onboarding status:', error)
    return false
  }
}
