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

