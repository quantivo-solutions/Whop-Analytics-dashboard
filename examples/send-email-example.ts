/**
 * Example: How to send weekly email reports programmatically
 * 
 * This file demonstrates different ways to use the email functionality.
 */

import { sendWeeklySummaryEmail } from '../src/lib/email'

/**
 * Example 1: Send to a single recipient
 */
async function sendToSingleRecipient() {
  try {
    console.log('📧 Sending to single recipient...')
    
    const result = await sendWeeklySummaryEmail('john@example.com')
    
    console.log('✅ Email sent successfully!')
    console.log('Email ID:', result.data?.id)
  } catch (error) {
    console.error('❌ Failed to send email:', error)
  }
}

/**
 * Example 2: Send to multiple recipients
 */
async function sendToMultipleRecipients() {
  try {
    console.log('📧 Sending to multiple recipients...')
    
    const recipients = [
      'ceo@company.com',
      'cfo@company.com',
      'team@company.com'
    ]
    
    const result = await sendWeeklySummaryEmail(recipients)
    
    console.log('✅ Email sent to', recipients.length, 'recipients')
    console.log('Email ID:', result.data?.id)
  } catch (error) {
    console.error('❌ Failed to send email:', error)
  }
}

/**
 * Example 3: Send with error handling
 */
async function sendWithErrorHandling() {
  try {
    console.log('📧 Sending with comprehensive error handling...')
    
    const result = await sendWeeklySummaryEmail('user@example.com')
    
    if (result.error) {
      console.error('❌ Resend API error:', result.error)
      // Handle error (log, alert, retry, etc.)
      return
    }
    
    console.log('✅ Success!')
    console.log('Email ID:', result.data?.id)
    console.log('From:', result.data?.from)
    console.log('To:', result.data?.to)
    
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Error:', error.message)
      
      // Handle specific errors
      if (error.message.includes('No metrics data')) {
        console.log('💡 Tip: Run `yarn db:seed` to add test data')
      } else if (error.message.includes('Missing API key')) {
        console.log('💡 Tip: Add RESEND_API_KEY to .env.local')
      }
    }
  }
}

/**
 * Example 4: Send as part of a scheduled job
 */
async function scheduledWeeklyReport() {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, etc.
  
  // Only run on Sundays
  if (dayOfWeek !== 0) {
    console.log('⏭️  Not Sunday, skipping...')
    return
  }
  
  console.log('📅 It\'s Sunday! Sending weekly report...')
  
  try {
    // Get recipients from environment variable or config
    const recipients = process.env.REPORT_RECIPIENTS?.split(',') || ['default@example.com']
    
    const result = await sendWeeklySummaryEmail(recipients)
    
    console.log('✅ Weekly report sent to', recipients.length, 'recipients')
    
    // Log to monitoring service
    // logToMonitoring({ event: 'weekly_report_sent', recipients: recipients.length })
    
  } catch (error) {
    console.error('❌ Weekly report failed:', error)
    
    // Alert on failure
    // sendAlertToSlack({ error, context: 'weekly_report' })
  }
}

/**
 * Example 5: Test mode - only log, don't send
 */
async function testMode() {
  console.log('🧪 TEST MODE - Will not actually send email')
  
  const isProduction = process.env.NODE_ENV === 'production'
  
  if (!isProduction) {
    console.log('📊 Would send weekly report to: user@example.com')
    console.log('💡 Set NODE_ENV=production to actually send')
    return
  }
  
  // In production, actually send
  await sendWeeklySummaryEmail('user@example.com')
}

/**
 * Example 6: Conditional sending based on metrics
 */
async function conditionalSend() {
  // You could import and check metrics first
  // const metrics = await getWeeklySummary()
  
  // Example: Only send if revenue > threshold
  // if (metrics.totalRevenue > 10000) {
  //   await sendWeeklySummaryEmail('highvalue@alerts.com')
  // }
  
  console.log('💡 This example shows conditional email sending')
  console.log('📊 Check metrics first, then decide whether to send')
}

/**
 * Example 7: Integration with other services
 */
async function integrateWithOtherServices() {
  try {
    // Send email report
    const result = await sendWeeklySummaryEmail('user@example.com')
    
    if (result.data?.id) {
      console.log('✅ Email sent:', result.data.id)
      
      // Also notify via Slack
      // await sendSlackNotification({ message: 'Weekly report sent', emailId: result.data.id })
      
      // Log to analytics
      // await logToAnalytics({ event: 'weekly_report', success: true })
      
      // Update dashboard
      // await updateDashboard({ lastReportSent: new Date() })
    }
  } catch (error) {
    console.error('❌ Error:', error)
    
    // Notify team of failure
    // await sendSlackAlert({ error, severity: 'high' })
  }
}

// Run examples (uncomment to test)
// sendToSingleRecipient()
// sendToMultipleRecipients()
// sendWithErrorHandling()
// scheduledWeeklyReport()
// testMode()

export {
  sendToSingleRecipient,
  sendToMultipleRecipients,
  sendWithErrorHandling,
  scheduledWeeklyReport,
  testMode,
  conditionalSend,
  integrateWithOtherServices
}

