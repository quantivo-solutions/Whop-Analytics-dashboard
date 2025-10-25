import { prisma } from '@/lib/prisma'

// Function to get metrics for the last N days (ordered chronologically for charts)
export async function getMetricsHistory(days: number = 30) {
  try {
    const metrics = await prisma.metricsDaily.findMany({
      orderBy: { date: 'asc' },
      take: days
    })

    return metrics
  } catch (error) {
    console.error('Error fetching metrics history:', error)
    return []
  }
}

// Function to get the latest metrics from the database
export async function getLatestMetrics() {
  try {
    const latestMetric = await prisma.metricsDaily.findFirst({
      orderBy: { date: 'desc' }
    })

    return latestMetric
  } catch (error) {
    console.error('Error fetching latest metrics:', error)
    return null
  }
}
