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
 * Get installation by company ID
 * Used for Dashboard View pages
 * 
 * INTEGRITY: Always use this helper to ensure we're querying the correct company
 */
export async function getInstallationByCompany(companyId: CompanyID) {
  if (!companyId) {
    throw new Error('[Company Integrity] Missing companyId parameter')
  }
  return prisma.whopInstallation.findUnique({ 
    where: { companyId } 
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
  const installation = await prisma.whopInstallation.findUnique({
    where: { companyId },
  })
  
  console.log(`[Company] 📋 Installation fetched:`, {
    exists: !!installation,
    experienceId: installation?.experienceId || 'none',
    companyId: installation?.companyId || 'none',
  })
  
  let companyName: string | undefined = undefined
  
  // Strategy 1: Try to get company name from experience endpoint (if experienceId exists)
  if (installation?.experienceId) {
    try {
      console.log(`[Company] 📡 Trying to get company name via experienceId: ${installation.experienceId}`)
      const { getExperienceById } = await import('@/lib/whop-rest')
      const experienceData = await getExperienceById(installation.experienceId)
      
      if (experienceData) {
        console.log(`[Company] 📦 Experience data received:`, JSON.stringify(experienceData, null, 2))
        
        // Try to extract company name from experience data
        const expCompanyName = 
          experienceData.company?.name ||
          experienceData.company?.company_name ||
          experienceData.company?.title ||
          experienceData.name ||
          experienceData.title ||
          undefined
        
        if (expCompanyName) {
          companyName = expCompanyName
          console.log(`[Company] ✅ Found company name via experience: "${companyName}"`)
        }
      }
    } catch (expError) {
      console.warn(`[Company] ⚠️ Failed to get company name via experience:`, expError)
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
  if (companyName) {
    try {
      const updated = await prisma.whopInstallation.update({
        where: { companyId },
        data: { experienceName: companyName },
      })
      console.log(`[Company] ✅ Updated company name for ${companyId}: "${companyName}"`)
      console.log(`[Company] ✅ Installation updated:`, { id: updated.id, experienceName: updated.experienceName })
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
  
  // Try by company first
  const byCompany = await prisma.whopInstallation.findUnique({ where: { companyId } })
  
  if (byCompany) {
    if (byCompany.experienceId !== experienceId) {
      await prisma.whopInstallation.update({ 
        where: { companyId }, 
        data: { experienceId } 
      })
      console.log(`[Whoplytics] Updated installation: companyId ${companyId} now linked to experienceId ${experienceId}`)
      return { created: false, updated: true }
    }
    return { created: false, updated: false }
  }
  
  // Try by experience
  const byExp = await prisma.whopInstallation.findUnique({ where: { experienceId } }).catch(() => null)
  
  if (byExp) {
    if (byExp.companyId !== companyId) {
      // Update companyId if it changed (shouldn't happen, but handle gracefully)
      await prisma.whopInstallation.update({ 
        where: { experienceId }, 
        data: { companyId } 
      })
      console.log(`[Whoplytics] Updated installation: experienceId ${experienceId} now linked to companyId ${companyId}`)
      return { created: false, updated: true }
    }
    return { created: false, updated: false }
  }
  
  // Create minimal row; plan/token can be filled later via OAuth or webhook
  await prisma.whopInstallation.create({
    data: { 
      companyId, 
      experienceId, 
      plan: "free", 
      accessToken: process.env.WHOP_APP_SERVER_KEY || process.env.WHOP_API_KEY || "" 
    },
  })
  
  console.log(`[Whoplytics] Created new installation: companyId ${companyId} <-> experienceId ${experienceId}`)
  return { created: true, updated: false }
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
