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


