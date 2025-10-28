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
 * Direct link to Pro product purchase page
 * @param companyId - Optional company ID (not used currently, but kept for future)
 * @returns URL to Pro product purchase page
 */
export function getUpgradeUrl(companyId?: string): string {
  // Direct link to Pro product for immediate purchase
  // This works for both logged-in and new users
  return 'https://whop.com/quantivo-solutions/analytics-dashboard-pro/'
}

