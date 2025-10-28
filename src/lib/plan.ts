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
 * Get plan for a specific company
 * @param companyId - Company ID to check
 * @returns Plan type (defaults to 'free' if not found)
 */
export async function getPlanForCompany(companyId: string): Promise<Plan> {
  try {
    const installation = await prisma.whopInstallation.findUnique({
      where: { companyId },
      select: { plan: true },
    })

    const planStr = installation?.plan?.toLowerCase() || 'free'
    
    // Normalize plan name
    if (planStr === 'pro' || planStr === 'professional') return 'pro'
    if (planStr === 'business' || planStr === 'enterprise') return 'business'
    
    return 'free'
  } catch (error) {
    console.error(`Error fetching plan for company ${companyId}:`, error)
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
 * @param companyId - Optional company ID for iframe context
 * @returns URL to Whop's plan selection/upgrade page
 */
export function getUpgradeUrl(companyId?: string): string {
  const appId = process.env.NEXT_PUBLIC_WHOP_APP_ID
  
  // If in Whop iframe context (has companyId), use hub URL for better UX
  if (companyId && appId) {
    return `https://whop.com/hub/company/${companyId}/apps/${appId}`
  }
  
  // Fallback: direct app page (Whop will show pricing/upgrade options)
  return appId 
    ? `https://whop.com/apps/${appId}` 
    : 'https://whop.com/apps'
}

