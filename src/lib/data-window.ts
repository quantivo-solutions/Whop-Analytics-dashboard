/**
 * Data window utilities based on plan type
 * Determines how many days of historical data to fetch
 */

import { isPro } from './plan'

/**
 * Get the number of days of data to fetch based on plan
 * Free: 7 days
 * Pro/Business: 90 days
 */
export function getDaysForPlan(plan?: string): number {
  return isPro(plan) ? 90 : 7
}

/**
 * Get the date threshold for data queries
 * Returns the date that is N days ago from today
 */
export function getDataStartDate(plan?: string): Date {
  const days = getDaysForPlan(plan)
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(0, 0, 0, 0)
  return date
}

