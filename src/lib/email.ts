import { Resend } from 'resend'
import { prisma } from './prisma'

const resend = new Resend(process.env.RESEND_API_KEY)

interface WeeklySummary {
  totalRevenue: number
  churnRate: number
  newMembers: number
  trialsPaid: number
  startDate: string
  endDate: string
}

export interface WeeklyEmailKPIs {
  revenue: number
  churnRate: number
  newMembers: number
  cancellations: number
}

export interface DayData {
  date: string
  revenue: number
  newMembers: number
  cancellations: number
}

export interface WeeklyEmailProps {
  kpis: WeeklyEmailKPIs
  insights: [string, string, string]
  series: DayData[]
}

/**
 * Reusable Weekly Email Component
 * Renders a mobile-friendly email with header, insights, and data table
 * @param kpis Key performance indicators (revenue, churn, etc.)
 * @param insights Array of exactly 3 insight strings
 * @param series Daily data for the last 7 days
 * @returns HTML string for email
 */
export function WeeklyEmail({ kpis, insights, series }: WeeklyEmailProps): string {
  const formatCurrency = (amount: number) => 
    `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Weekly Analytics</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      line-height: 1.3;
    }
    .content {
      padding: 24px;
    }
    .insights {
      margin: 24px 0;
    }
    .insight-item {
      padding: 12px 16px;
      margin-bottom: 8px;
      background-color: #f8fafc;
      border-left: 3px solid #667eea;
      border-radius: 4px;
      font-size: 14px;
      color: #334155;
    }
    .table-container {
      margin-top: 24px;
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th {
      background-color: #f1f5f9;
      padding: 10px 12px;
      text-align: left;
      font-weight: 600;
      color: #475569;
      border-bottom: 2px solid #e2e8f0;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #e2e8f0;
      color: #334155;
    }
    tr:last-child td {
      border-bottom: none;
    }
    .revenue-cell {
      font-weight: 600;
      color: #059669;
    }
    .footer {
      padding: 20px 24px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      background-color: #f8fafc;
    }
    @media only screen and (max-width: 600px) {
      .container {
        margin: 0;
        border-radius: 0;
      }
      .header {
        padding: 24px 16px;
      }
      .content {
        padding: 16px;
      }
      th, td {
        padding: 8px 6px;
        font-size: 12px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>Your week on Analytics: ${formatCurrency(kpis.revenue)} revenue, churn ${kpis.churnRate.toFixed(1)}%</h1>
    </div>

    <!-- Content -->
    <div class="content">
      <!-- Insights -->
      <div class="insights">
        <div class="insight-item">💰 ${insights[0]}</div>
        <div class="insight-item">👥 ${insights[1]}</div>
        <div class="insight-item">📊 ${insights[2]}</div>
      </div>

      <!-- Data Table -->
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Revenue</th>
              <th>New</th>
              <th>Cancels</th>
            </tr>
          </thead>
          <tbody>
            ${series.map(day => `
              <tr>
                <td>${formatDate(day.date)}</td>
                <td class="revenue-cell">${formatCurrency(day.revenue)}</td>
                <td>+${day.newMembers}</td>
                <td>${day.cancellations}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>Generated on ${new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Calculate weekly summary from the last 7 days of metrics data
 */
async function getWeeklySummary(): Promise<WeeklySummary> {
  const today = new Date()
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(today.getDate() - 7)

  // Get last 7 days of data
  const metrics = await prisma.metricsDaily.findMany({
    where: {
      date: {
        gte: sevenDaysAgo,
        lte: today
      }
    },
    orderBy: { date: 'asc' }
  })

  if (metrics.length === 0) {
    throw new Error('No metrics data available for the last 7 days')
  }

  // Calculate totals (convert Decimal to number)
  const totalRevenue = metrics.reduce((sum, m) => sum + Number(m.grossRevenue), 0)
  const totalNewMembers = metrics.reduce((sum, m) => sum + m.newMembers, 0)
  const totalCancellations = metrics.reduce((sum, m) => sum + m.cancellations, 0)
  const totalTrialsPaid = metrics.reduce((sum, m) => sum + m.trialsPaid, 0)
  
  // Calculate average active members for churn rate calculation
  const avgActiveMembers = metrics.reduce((sum, m) => sum + m.activeMembers, 0) / metrics.length
  
  // Churn rate = (cancellations / avg active members) * 100
  const churnRate = avgActiveMembers > 0 ? (totalCancellations / avgActiveMembers) * 100 : 0

  return {
    totalRevenue,
    churnRate,
    newMembers: totalNewMembers,
    trialsPaid: totalTrialsPaid,
    startDate: metrics[0].date.toISOString().split('T')[0],
    endDate: metrics[metrics.length - 1].date.toISOString().split('T')[0]
  }
}

/**
 * Generate HTML email content for weekly summary
 */
function generateEmailHTML(summary: WeeklySummary): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Analytics Summary</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px 24px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
        📊 Weekly Analytics Summary
      </h1>
      <p style="margin: 8px 0 0 0; color: #e0e7ff; font-size: 14px;">
        ${summary.startDate} to ${summary.endDate}
      </p>
    </div>

    <!-- Summary Line -->
    <div style="padding: 24px; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
      <p style="margin: 0; font-size: 16px; color: #475569; line-height: 1.6;">
        <strong>Week in Review:</strong> Generated <strong style="color: #10b981;">$${summary.totalRevenue.toFixed(2)}</strong> in revenue, 
        welcomed <strong style="color: #3b82f6;">${summary.newMembers}</strong> new members, 
        and converted <strong style="color: #8b5cf6;">${summary.trialsPaid}</strong> trials to paid.
        ${summary.churnRate > 5 ? '⚠️ Churn rate needs attention.' : '✅ Churn rate is healthy.'}
      </p>
    </div>

    <!-- Metrics Cards -->
    <div style="padding: 32px 24px;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        
        <!-- Revenue Card -->
        <div style="background-color: #ecfdf5; border-radius: 8px; padding: 20px; border-left: 4px solid #10b981;">
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 24px; margin-right: 8px;">💰</span>
            <span style="font-size: 12px; color: #059669; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Revenue</span>
          </div>
          <div style="font-size: 32px; font-weight: 700; color: #047857; margin-bottom: 4px;">
            $${summary.totalRevenue.toFixed(2)}
          </div>
          <div style="font-size: 13px; color: #065f46;">
            Last 7 days
          </div>
        </div>

        <!-- Churn Rate Card -->
        <div style="background-color: ${summary.churnRate > 5 ? '#fef2f2' : '#f0fdf4'}; border-radius: 8px; padding: 20px; border-left: 4px solid ${summary.churnRate > 5 ? '#ef4444' : '#22c55e'};">
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 24px; margin-right: 8px;">${summary.churnRate > 5 ? '📉' : '📈'}</span>
            <span style="font-size: 12px; color: ${summary.churnRate > 5 ? '#dc2626' : '#16a34a'}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Churn Rate</span>
          </div>
          <div style="font-size: 32px; font-weight: 700; color: ${summary.churnRate > 5 ? '#b91c1c' : '#15803d'}; margin-bottom: 4px;">
            ${summary.churnRate.toFixed(1)}%
          </div>
          <div style="font-size: 13px; color: ${summary.churnRate > 5 ? '#991b1b' : '#14532d'};">
            ${summary.churnRate > 5 ? 'Needs attention' : 'Healthy range'}
          </div>
        </div>

        <!-- New Members Card -->
        <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px; border-left: 4px solid #3b82f6;">
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 24px; margin-right: 8px;">👋</span>
            <span style="font-size: 12px; color: #2563eb; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">New Members</span>
          </div>
          <div style="font-size: 32px; font-weight: 700; color: #1d4ed8; margin-bottom: 4px;">
            ${summary.newMembers}
          </div>
          <div style="font-size: 13px; color: #1e40af;">
            Joined this week
          </div>
        </div>

        <!-- Trials Paid Card -->
        <div style="background-color: #f5f3ff; border-radius: 8px; padding: 20px; border-left: 4px solid #8b5cf6;">
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 24px; margin-right: 8px;">✨</span>
            <span style="font-size: 12px; color: #7c3aed; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Trials Converted</span>
          </div>
          <div style="font-size: 32px; font-weight: 700; color: #6d28d9; margin-bottom: 4px;">
            ${summary.trialsPaid}
          </div>
          <div style="font-size: 13px; color: #5b21b6;">
            To paid plans
          </div>
        </div>

      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 24px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
      <p style="margin: 0; font-size: 13px; color: #64748b;">
        This is your automated weekly analytics report. Keep up the great work! 🚀
      </p>
      <p style="margin: 12px 0 0 0; font-size: 12px; color: #94a3b8;">
        Whoplytics • Generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </div>

  </div>
</body>
</html>
  `
}

/**
 * Send weekly summary email using the WeeklyEmail component
 * @param to Email address to send to
 * @returns Response from Resend API
 */
export async function sendWeeklySummaryEmail(to: string | string[]) {
  try {
    const today = new Date()
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 7)

    // Get last 7 days of data
    const metrics = await prisma.metricsDaily.findMany({
      where: {
        date: {
          gte: sevenDaysAgo,
          lte: today
        }
      },
      orderBy: { date: 'asc' }
    })

    if (metrics.length === 0) {
      throw new Error('No metrics data available for the last 7 days')
    }

    // Calculate KPIs (convert Decimal to number)
    const totalRevenue = metrics.reduce((sum, m) => sum + Number(m.grossRevenue), 0)
    const totalNewMembers = metrics.reduce((sum, m) => sum + m.newMembers, 0)
    const totalCancellations = metrics.reduce((sum, m) => sum + m.cancellations, 0)
    const avgActiveMembers = metrics.reduce((sum, m) => sum + m.activeMembers, 0) / metrics.length
    const churnRate = avgActiveMembers > 0 ? (totalCancellations / avgActiveMembers) * 100 : 0

    // Prepare data for WeeklyEmail component
    const kpis: WeeklyEmailKPIs = {
      revenue: totalRevenue,
      churnRate,
      newMembers: totalNewMembers,
      cancellations: totalCancellations
    }

    // Generate insights
    const avgDailyRevenue = totalRevenue / metrics.length
    const revenueChange = metrics.length > 1 
      ? ((Number(metrics[metrics.length - 1].grossRevenue) - Number(metrics[0].grossRevenue)) / Number(metrics[0].grossRevenue) * 100)
      : 0
    
    const insights: [string, string, string] = [
      `Average daily revenue of £${avgDailyRevenue.toFixed(2)} ${revenueChange > 0 ? '📈' : revenueChange < 0 ? '📉' : '➡️'}`,
      `${totalNewMembers} new members joined, with ${totalCancellations} cancellations`,
      `Churn rate at ${churnRate.toFixed(1)}% ${churnRate > 5 ? '(needs attention)' : '(healthy)'}`
    ]

    // Prepare series data (convert Decimal to number)
    const series: DayData[] = metrics.map(m => ({
      date: m.date.toISOString(),
      revenue: Number(m.grossRevenue),
      newMembers: m.newMembers,
      cancellations: m.cancellations
    }))

    // Generate HTML using WeeklyEmail component
    const html = WeeklyEmail({ kpis, insights, series })

    // Generate plain text version
    const text = `
Your week on Analytics: £${totalRevenue.toFixed(2)} revenue, churn ${churnRate.toFixed(1)}%

Insights:
💰 ${insights[0]}
👥 ${insights[1]}
📊 ${insights[2]}

Last 7 Days:
${series.map(day => {
  const date = new Date(day.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
  return `${date}: £${day.revenue.toFixed(2)} revenue, +${day.newMembers} new, ${day.cancellations} cancellations`
}).join('\n')}

Generated on ${new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
    `.trim()

    // Send email via Resend
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Whoplytics <onboarding@resend.dev>',
      to: Array.isArray(to) ? to : [to],
      subject: `📊 Your Weekly Analytics - £${totalRevenue.toFixed(2)} revenue`,
      html,
      text
    })

    console.log('✅ Weekly summary email sent successfully:', result)
    return { ...result, kpis }
  } catch (error) {
    console.error('❌ Failed to send weekly summary email:', error)
    throw error
  }
}

/**
 * Test function to send a sample email immediately
 */
export async function sendTestEmail(to: string) {
  return sendWeeklySummaryEmail(to)
}

/**
 * Send daily report email with yesterday's metrics
 */
export async function sendDailyReportEmail(to: string | string[], metric: any) {
  try {
    const metricDate = new Date(metric.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // Format currency (convert Decimal to number)
    const revenue = `$${Number(metric.grossRevenue).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`

    // Calculate churn rate
    const churnRate = metric.activeMembers > 0
      ? ((metric.cancellations / metric.activeMembers) * 100).toFixed(2)
      : '0.00'

    // Build HTML email
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px 10px 0 0;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .header p {
            margin: 10px 0 0;
            opacity: 0.9;
            font-size: 14px;
          }
          .content {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .summary {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .metric {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #e9ecef;
          }
          .metric:last-child {
            border-bottom: none;
          }
          .metric-label {
            font-weight: 600;
            color: #495057;
          }
          .metric-value {
            font-weight: 700;
            color: #212529;
          }
          .metric-value.positive {
            color: #28a745;
          }
          .metric-value.negative {
            color: #dc3545;
          }
          .footer {
            text-align: center;
            padding: 20px;
            color: #6c757d;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📊 Daily Analytics Report</h1>
          <p>${metricDate}</p>
        </div>
        <div class="content">
          <div class="summary">
            <div class="metric">
              <span class="metric-label">💰 Revenue</span>
              <span class="metric-value positive">${revenue}</span>
            </div>
            <div class="metric">
              <span class="metric-label">👥 Active Members</span>
              <span class="metric-value">${metric.activeMembers}</span>
            </div>
            <div class="metric">
              <span class="metric-label">👋 New Members</span>
              <span class="metric-value positive">+${metric.newMembers}</span>
            </div>
            <div class="metric">
              <span class="metric-label">❌ Cancellations</span>
              <span class="metric-value negative">${metric.cancellations}</span>
            </div>
            <div class="metric">
              <span class="metric-label">📉 Churn Rate</span>
              <span class="metric-value">${churnRate}%</span>
            </div>
            <div class="metric">
              <span class="metric-label">✨ Trials Converted</span>
              <span class="metric-value positive">${metric.trialsPaid}</span>
            </div>
          </div>
        </div>
        <div class="footer">
          <p>This is your automated daily analytics report.</p>
          <p>Generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </body>
      </html>
    `

    // Build plain text version
    const text = `
Daily Analytics Report
${metricDate}

💰 Revenue: ${revenue}
👥 Active Members: ${metric.activeMembers}
👋 New Members: +${metric.newMembers}
❌ Cancellations: ${metric.cancellations}
📉 Churn Rate: ${churnRate}%
✨ Trials Converted: ${metric.trialsPaid}

This is your automated daily analytics report.
Generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
    `.trim()

    // Send email via Resend
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Whoplytics <onboarding@resend.dev>',
      to: Array.isArray(to) ? to : [to],
      subject: `📊 Daily Analytics - ${metricDate}`,
      html,
      text
    })

    console.log('✅ Daily report email sent successfully:', result)
    return { success: true, data: result.data, error: null }
  } catch (error) {
    console.error('❌ Failed to send daily report email:', error)
    return { success: false, data: null, error }
  }
}

