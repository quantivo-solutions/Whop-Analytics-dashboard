/**
 * Example Usage of WeeklyEmail Component
 * 
 * This file demonstrates how to use the reusable WeeklyEmail component
 * to generate beautiful, mobile-friendly email HTML.
 */

import { WeeklyEmail, WeeklyEmailKPIs, DayData } from './email'

// Example 1: Basic Usage
export function exampleBasicUsage() {
  const kpis: WeeklyEmailKPIs = {
    revenue: 10847.32,
    churnRate: 2.8,
    newMembers: 67,
    cancellations: 19
  }

  const insights: [string, string, string] = [
    "Average daily revenue of £1,549.62 📈",
    "67 new members joined, with 19 cancellations",
    "Churn rate at 2.8% (healthy)"
  ]

  const series: DayData[] = [
    { date: "2025-10-19T00:00:00Z", revenue: 1487.23, newMembers: 11, cancellations: 3 },
    { date: "2025-10-20T00:00:00Z", revenue: 1625.89, newMembers: 9, cancellations: 2 },
    { date: "2025-10-21T00:00:00Z", revenue: 1402.56, newMembers: 12, cancellations: 4 },
    { date: "2025-10-22T00:00:00Z", revenue: 1738.45, newMembers: 8, cancellations: 2 },
    { date: "2025-10-23T00:00:00Z", revenue: 1512.78, newMembers: 10, cancellations: 3 },
    { date: "2025-10-24T00:00:00Z", revenue: 1389.12, newMembers: 9, cancellations: 3 },
    { date: "2025-10-25T00:00:00Z", revenue: 1691.29, newMembers: 8, cancellations: 2 }
  ]

  const html = WeeklyEmail({ kpis, insights, series })
  
  return html
}

// Example 2: From Database Metrics
export function exampleFromDatabase() {
  // Assume we have metrics from Prisma
  const metrics = [
    { date: new Date('2025-10-19'), grossRevenue: 1487.23, newMembers: 11, cancellations: 3, activeMembers: 95 },
    { date: new Date('2025-10-20'), grossRevenue: 1625.89, newMembers: 9, cancellations: 2, activeMembers: 102 },
    // ... more metrics
  ]

  // Calculate KPIs
  const totalRevenue = metrics.reduce((sum, m) => sum + m.grossRevenue, 0)
  const totalNewMembers = metrics.reduce((sum, m) => sum + m.newMembers, 0)
  const totalCancellations = metrics.reduce((sum, m) => sum + m.cancellations, 0)
  const avgActiveMembers = metrics.reduce((sum, m) => sum + m.activeMembers, 0) / metrics.length
  const churnRate = (totalCancellations / avgActiveMembers) * 100

  const kpis: WeeklyEmailKPIs = {
    revenue: totalRevenue,
    churnRate,
    newMembers: totalNewMembers,
    cancellations: totalCancellations
  }

  // Generate insights
  const avgDailyRevenue = totalRevenue / metrics.length
  const insights: [string, string, string] = [
    `Average daily revenue of £${avgDailyRevenue.toFixed(2)}`,
    `${totalNewMembers} new members joined, with ${totalCancellations} cancellations`,
    `Churn rate at ${churnRate.toFixed(1)}% ${churnRate > 5 ? '(needs attention)' : '(healthy)'}`
  ]

  // Prepare series data
  const series: DayData[] = metrics.map(m => ({
    date: m.date.toISOString(),
    revenue: m.grossRevenue,
    newMembers: m.newMembers,
    cancellations: m.cancellations
  }))

  return WeeklyEmail({ kpis, insights, series })
}

// Example 3: Custom Insights
export function exampleCustomInsights() {
  const kpis: WeeklyEmailKPIs = {
    revenue: 15234.56,
    churnRate: 1.2,
    newMembers: 89,
    cancellations: 8
  }

  // Custom insights based on business logic
  const insights: [string, string, string] = [
    "🚀 Best week ever! Revenue up 45% from last week",
    "💪 Strong retention with lowest churn rate this month",
    "🎯 Hit our weekly goal of 85+ new members"
  ]

  const series: DayData[] = [
    // ... daily data
  ]

  return WeeklyEmail({ kpis, insights, series })
}

// Example 4: Integration with Email Service
export async function exampleSendEmail() {
  const { Resend } = require('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  const html = exampleBasicUsage()

  const result = await resend.emails.send({
    from: 'Analytics Dashboard <onboarding@resend.dev>',
    to: 'user@example.com',
    subject: '📊 Your Weekly Analytics - £10,847.32 revenue',
    html
  })

  return result
}

