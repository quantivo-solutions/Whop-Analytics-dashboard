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
    // DEBUG: Check if any data exists for this companyId
    const dataCount = await prisma.metricsDaily.count({
      where: { companyId },
    })
    console.log(`[Metrics] Data count for companyId ${companyId}: ${dataCount} records`)
    
    // If no data, check what companyIds DO have data (for debugging)
    if (dataCount === 0) {
      const allCompaniesWithData = await prisma.metricsDaily.groupBy({
        by: ['companyId'],
        _count: true,
      })
      console.log(`[Metrics] Companies with data:`, allCompaniesWithData.map(c => ({
        companyId: c.companyId,
        count: c._count
      })))
    }

    // Get latest metrics for KPIs
    const latestMetric = await prisma.metricsDaily.findFirst({
      where: { companyId },
      orderBy: { date: 'desc' },
    })

    // Get time series data (last N days)
    // Calculate date threshold
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)
    
    // IMPORTANT: Always fetch most recent data, ordered by date DESC then take last N
    const allSeries = await prisma.metricsDaily.findMany({
      where: { 
        companyId,
        date: {
          gte: startDate,
        }
      },
      orderBy: { date: 'desc' },
      take: days,
    })
    // Reverse to show chronological order (oldest to newest)
    const series = allSeries.reverse()
    
    console.log(`[Metrics] Fetched ${series.length} data points for companyId: ${companyId}`)

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

/**
 * Get monthly revenue for current month (UTC)
 * @param companyId - Company ID
 * @returns Total revenue for current month
 */
export async function getMonthlyRevenue(companyId: string): Promise<number> {
  try {
    const now = new Date()
    // Use local time for month boundaries to match user expectations
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    startOfMonth.setHours(0, 0, 0, 0)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    endOfMonth.setHours(23, 59, 59, 999)

    console.log(`[getMonthlyRevenue] Calculating for companyId: ${companyId}`)
    console.log(`[getMonthlyRevenue] Month range: ${startOfMonth.toISOString()} to ${endOfMonth.toISOString()}`)
    console.log(`[getMonthlyRevenue] Current date: ${now.toISOString()}`)

    // First, check all records for this company to see what dates exist
    const allRecords = await prisma.metricsDaily.findMany({
      where: { companyId },
      orderBy: { date: 'desc' },
      take: 10,
    })
    console.log(`[getMonthlyRevenue] Latest ${allRecords.length} records for companyId ${companyId}:`)
    allRecords.forEach((r, i) => {
      console.log(`[getMonthlyRevenue]   Record ${i}: date=${r.date.toISOString()}, grossRevenue=${r.grossRevenue}`)
    })

    const metrics = await prisma.metricsDaily.findMany({
      where: {
        companyId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      orderBy: {
        date: 'asc',
      },
    })

    console.log(`[getMonthlyRevenue] Found ${metrics.length} records for current month`)
    if (metrics.length === 0) {
      console.log(`[getMonthlyRevenue] ⚠️ No records found for current month. Checking if data exists in other months...`)
      // Check if there's any data at all for this company
      const anyData = await prisma.metricsDaily.findFirst({
        where: { companyId },
        orderBy: { date: 'desc' },
      })
      if (anyData) {
        console.log(`[getMonthlyRevenue] Latest record date: ${anyData.date.toISOString()}, month: ${anyData.date.getMonth() + 1}, current month: ${now.getMonth() + 1}`)
        // If data exists but in a different month, sum all available data as fallback
        const allMetrics = await prisma.metricsDaily.findMany({
          where: { companyId },
          orderBy: { date: 'asc' },
        })
        const totalRevenue = allMetrics.reduce((sum, m) => sum + Number(m.grossRevenue), 0)
        console.log(`[getMonthlyRevenue] Using fallback: summing all ${allMetrics.length} records = ${totalRevenue}`)
        return totalRevenue
      }
      return 0
    }

    metrics.forEach((m, i) => {
      console.log(`[getMonthlyRevenue] Record ${i}: date=${m.date.toISOString()}, grossRevenue=${m.grossRevenue}`)
    })

    const totalRevenue = metrics.reduce((sum, m) => {
      const revenue = Number(m.grossRevenue)
      return sum + revenue
    }, 0)
    
    console.log(`[getMonthlyRevenue] Total monthly revenue: ${totalRevenue}`)
    return totalRevenue
  } catch (error) {
    console.error(`Error calculating monthly revenue for ${companyId}:`, error)
    return 0
  }
}

