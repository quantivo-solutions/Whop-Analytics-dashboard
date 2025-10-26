/**
 * Shared server-side functions for fetching and processing metrics data
 * Reusable across all dashboard views
 */

import { prisma } from './prisma'

export interface DashboardKPIs {
  grossRevenue: number
  activeMembers: number
  newMembers: number
  cancellations: number
  trialsPaid: number
  latestDate: Date | null
  isDataFresh: boolean
}

export interface DashboardSeries {
  date: Date
  grossRevenue: number
  activeMembers: number
  newMembers: number
  cancellations: number
  trialsPaid: number
}

export interface DashboardData {
  kpis: DashboardKPIs
  series: DashboardSeries[]
  hasData: boolean
  companyId: string
}

/**
 * Get dashboard data for a specific company
 * @param companyId - Company ID to fetch data for
 * @param days - Number of days to fetch (default: 30)
 * @returns Complete dashboard data (KPIs + time series)
 */
export async function getCompanySeries(
  companyId: string,
  days: number = 30
): Promise<DashboardData> {
  try {
    // Get latest metrics for KPIs
    const latestMetric = await prisma.metricsDaily.findFirst({
      where: { companyId },
      orderBy: { date: 'desc' },
    })

    // Get time series data (last N days)
    const series = await prisma.metricsDaily.findMany({
      where: { companyId },
      orderBy: { date: 'asc' },
      take: days,
    })

    // Check if data exists
    // Show "LIVE" badge if we have any data from the database
    const latestDate = latestMetric ? new Date(latestMetric.date) : null
    const isDataFresh = latestMetric !== null

    // Build KPIs
    const kpis: DashboardKPIs = {
      grossRevenue: latestMetric ? Number(latestMetric.grossRevenue) : 0,
      activeMembers: latestMetric?.activeMembers ?? 0,
      newMembers: latestMetric?.newMembers ?? 0,
      cancellations: latestMetric?.cancellations ?? 0,
      trialsPaid: latestMetric?.trialsPaid ?? 0,
      latestDate,
      isDataFresh,
    }

    // Convert series data
    const seriesData: DashboardSeries[] = series.map((m) => ({
      date: new Date(m.date),
      grossRevenue: Number(m.grossRevenue),
      activeMembers: m.activeMembers,
      newMembers: m.newMembers,
      cancellations: m.cancellations,
      trialsPaid: m.trialsPaid,
    }))

    return {
      kpis,
      series: seriesData,
      hasData: series.length > 0,
      companyId,
    }
  } catch (error) {
    console.error(`Error fetching dashboard data for company ${companyId}:`, error)
    
    // Return empty state on error
    return {
      kpis: {
        grossRevenue: 0,
        activeMembers: 0,
        newMembers: 0,
        cancellations: 0,
        trialsPaid: 0,
        latestDate: null,
        isDataFresh: false,
      },
      series: [],
      hasData: false,
      companyId,
    }
  }
}

/**
 * Get installation by experience ID
 * @param experienceId - Whop experience ID
 * @returns WhopInstallation or null
 */
export async function getInstallationByExperience(experienceId: string) {
  try {
    return await prisma.whopInstallation.findUnique({
      where: { experienceId },
    })
  } catch (error) {
    console.error(`Error fetching installation for experience ${experienceId}:`, error)
    return null
  }
}

/**
 * Get installation by company ID
 * @param companyId - Company ID
 * @returns WhopInstallation or null
 */
export async function getInstallationByCompany(companyId: string) {
  try {
    return await prisma.whopInstallation.findUnique({
      where: { companyId },
    })
  } catch (error) {
    console.error(`Error fetching installation for company ${companyId}:`, error)
    return null
  }
}

