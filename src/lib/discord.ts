/**
 * Discord Webhook Integration
 * Sends notifications to Discord channels via webhook URLs
 */

interface DiscordWebhookPayload {
  content: string
  username?: string
  avatar_url?: string
}

/**
 * Post a message to a Discord channel via webhook
 * @param webhookUrl The Discord webhook URL
 * @param content The message content to send
 * @returns Success status and optional error
 */
export async function postToDiscord(
  webhookUrl: string,
  content: string
): Promise<{ success: boolean; error?: any }> {
  try {
    if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
      console.warn('Invalid Discord webhook URL')
      return { success: false, error: 'Invalid webhook URL' }
    }

    const payload: DiscordWebhookPayload = {
      content,
      username: 'Analytics Dashboard',
      avatar_url: 'https://cdn.discordapp.com/embed/avatars/0.png'
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Discord webhook failed:', response.status, errorText)
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }

    console.log('✅ Discord notification sent successfully')
    return { success: true }
  } catch (error) {
    console.error('❌ Failed to send Discord notification:', error)
    return { success: false, error }
  }
}

/**
 * Format weekly summary for Discord
 * @param kpis Weekly KPI data
 * @returns Formatted Discord message
 */
export function formatWeeklySummary(kpis: {
  revenue: number
  churnRate: number
  newMembers: number
  cancellations: number
}): string {
  const revenue = `£${kpis.revenue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return `📊 **Weekly Report**: ${revenue} revenue | ${kpis.newMembers} new members | ${kpis.cancellations} cancellations | ${kpis.churnRate.toFixed(1)}% churn`
}

/**
 * Format daily summary for Discord
 * @param metric Daily metric data
 * @returns Formatted Discord message
 */
export function formatDailySummary(metric: {
  date: Date
  grossRevenue: number
  newMembers: number
  cancellations: number
  activeMembers: number
}): string {
  const revenue = `£${metric.grossRevenue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const churnRate = metric.activeMembers > 0 
    ? ((metric.cancellations / metric.activeMembers) * 100).toFixed(1)
    : '0.0'
  
  const dateStr = metric.date.toLocaleDateString('en-GB', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  })
  
  return `📈 **Daily Report (${dateStr})**: ${revenue} revenue | ${metric.newMembers} new | ${metric.cancellations} cancellations | ${churnRate}% churn`
}

