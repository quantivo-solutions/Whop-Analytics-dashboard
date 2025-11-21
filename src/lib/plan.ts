/**
 * Plan management utilities
 * Handles Free vs Pro vs Business plan logic
 */

import { prisma } from './prisma'

export type Plan = 'free' | 'pro' | 'business'

export interface PlanFeatures {
  weeklyEmail: boolean
  dailyEmail: boolean
  discordAlerts: boolean
  advancedInsights: boolean
  extendedHistory: boolean
  dataExports: boolean
  prioritySupport: boolean
}

/**
 * Get plan features based on plan type
 */
export function getPlanFeatures(plan: Plan): PlanFeatures {
  switch (plan) {
    case 'business':
      return {
        weeklyEmail: true,
        dailyEmail: true,
        discordAlerts: true,
        advancedInsights: true,
        extendedHistory: true,
        dataExports: true,
        prioritySupport: true,
      }
    case 'pro':
      return {
        weeklyEmail: true,
        dailyEmail: true,
        discordAlerts: true,
        advancedInsights: true,
        extendedHistory: false,
        dataExports: false,
        prioritySupport: false,
      }
    case 'free':
    default:
      return {
        weeklyEmail: true,
        dailyEmail: false,
        discordAlerts: false,
        advancedInsights: false,
        extendedHistory: false,
        dataExports: false,
        prioritySupport: false,
      }
  }
}

/**
 * Get plan for a specific user (USER-LEVEL entitlement)
 * This is the new way to check plans - plans are now user-level, not company-level
 * @param userId - Whop user ID to check
 * @returns Plan type (defaults to 'free' if not found)
 */
export async function getUserPlan(userId: string): Promise<Plan> {
  if (!userId) {
    console.warn('[Plan] getUserPlan called with empty userId, returning free')
    return 'free'
  }

  try {
    const userPlan = await prisma.userPlan.findUnique({
      where: { userId },
      select: { plan: true },
    })

    const planStr = userPlan?.plan?.toLowerCase() || 'free'
    
    // Normalize plan name
    if (planStr === 'pro' || planStr === 'professional') return 'pro'
    if (planStr === 'business' || planStr === 'enterprise') return 'business'
    
    return 'free'
  } catch (error) {
    console.error(`[Plan] Error fetching plan for user ${userId}:`, error)
    return 'free'
  }
}

/**
 * Set plan for a specific user (USER-LEVEL entitlement)
 * @param userId - Whop user ID
 * @param plan - Plan type to set
 */
export async function setUserPlan(userId: string, plan: Plan): Promise<void> {
  if (!userId) {
    throw new Error('[Plan] setUserPlan called with empty userId')
  }

  try {
    await prisma.userPlan.upsert({
      where: { userId },
      create: {
        userId,
        plan,
      },
      update: {
        plan,
        updatedAt: new Date(),
      },
    })
    console.log(`[Plan] ✅ Updated plan for user ${userId} to ${plan}`)
  } catch (error) {
    console.error(`[Plan] ❌ Error setting plan for user ${userId}:`, error)
    throw error
  }
}

/**
 * Get plan for a specific company (DEPRECATED - kept for backward compatibility)
 * @deprecated Use getUserPlan(userId) instead. Plans are now user-level, not company-level.
 * @param companyId - Company ID to check
 * @returns Plan type (defaults to 'free' if not found)
 */
export async function getPlanForCompany(companyId: string): Promise<Plan> {
  console.warn('[Plan] ⚠️ getPlanForCompany is deprecated. Use getUserPlan(userId) instead.')
  try {
    const installation = await prisma.whopInstallation.findFirst({
      where: { companyId },
      select: { userId: true, plan: true },
      orderBy: { updatedAt: 'desc' },
    })

    // If we have userId, use user-level plan
    if (installation?.userId) {
      return getUserPlan(installation.userId)
    }

    // Fallback to old company-level plan (for migration period)
    const planStr = installation?.plan?.toLowerCase() || 'free'
    
    // Normalize plan name
    if (planStr === 'pro' || planStr === 'professional') return 'pro'
    if (planStr === 'business' || planStr === 'enterprise') return 'business'
    
    return 'free'
  } catch (error) {
    console.error(`[Plan] Error fetching plan for company ${companyId}:`, error)
    return 'free'
  }
}

/**
 * Check if company has Pro or higher
 */
export function hasPro(plan: string): boolean {
  return plan === 'pro' || plan === 'business'
}

/**
 * Check if company has Business plan
 */
export function hasBusiness(plan: string): boolean {
  return plan === 'business'
}

/**
 * Check if plan is Free (or undefined/null)
 */
export function isFree(plan?: string): boolean {
  return !plan || plan === 'free'
}

/**
 * Check if plan is Pro or Business
 */
export function isPro(plan?: string): boolean {
  return plan === 'pro' || plan === 'business'
}

/**
 * Get plan display name
 */
export function getPlanDisplayName(plan: Plan): string {
  switch (plan) {
    case 'business':
      return 'Business'
    case 'pro':
      return 'Pro'
    case 'free':
    default:
      return 'Free'
  }
}

/**
 * Get plan badge color classes
 */
export function getPlanBadgeClasses(plan: Plan): string {
  switch (plan) {
    case 'business':
      return 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
    case 'pro':
      return 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
    case 'free':
    default:
      return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
  }
}

/**
 * Get Whop upgrade URL
 * NOTE: This is now deprecated in favor of in-app purchase using Whop iFrame SDK
 * Kept for backward compatibility with non-iframe upgrade buttons
 * @param companyId - Optional company ID (not used currently, but kept for future)
 * @returns URL to Pro Access Pass purchase (fallback only)
 */
export function getUpgradeUrl(companyId?: string): string {
  // Use environment variable for Plan ID
  // Get this from: Whop Dev Portal → Access Passes → Click on "Pro" → View Pricing → Copy Plan ID
  const planId = process.env.NEXT_PUBLIC_WHOP_PRO_PLAN_ID
  
  if (planId) {
    // Direct link to plan checkout page (fallback for non-iframe contexts)
    return `https://whop.com/purchase/${planId}`
  }
  
  // If no Plan ID is configured, return placeholder
  console.error('NEXT_PUBLIC_WHOP_PRO_PLAN_ID not configured! Please add it to environment variables.')
  return '#upgrade-not-configured'
}

