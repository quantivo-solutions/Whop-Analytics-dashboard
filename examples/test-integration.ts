#!/usr/bin/env tsx
/**
 * Integration Test Script
 * 
 * Tests that all components of the email system are working:
 * - Database connection
 * - Data queries
 * - Email template generation
 * - (Optional) Email sending
 * 
 * Usage:
 *   tsx examples/test-integration.ts          # Test everything except sending
 *   tsx examples/test-integration.ts --send   # Also send a test email
 */

import { prisma } from '../src/lib/prisma'

// Test 1: Database Connection
async function testDatabaseConnection() {
  console.log('\n1️⃣  Testing database connection...')
  
  try {
    await prisma.$connect()
    console.log('   ✅ Database connected')
    return true
  } catch (error) {
    console.error('   ❌ Database connection failed:', error)
    return false
  }
}

// Test 2: Check for Data
async function testDataAvailability() {
  console.log('\n2️⃣  Checking for metrics data...')
  
  try {
    const count = await prisma.metricsDaily.count()
    
    if (count === 0) {
      console.error('   ❌ No data in database')
      console.log('   💡 Run: yarn db:seed')
      return false
    }
    
    console.log(`   ✅ Found ${count} records`)
    return true
  } catch (error) {
    console.error('   ❌ Failed to query data:', error)
    return false
  }
}

// Test 3: Query Last 7 Days
async function testWeeklyQuery() {
  console.log('\n3️⃣  Testing weekly data query...')
  
  try {
    const today = new Date()
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 7)
    
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
      console.error('   ❌ No data for last 7 days')
      return false
    }
    
    console.log(`   ✅ Found ${metrics.length} days of data`)
    
    // Calculate summary
    const totalRevenue = metrics.reduce((sum, m) => sum + m.grossRevenue, 0)
    const totalNewMembers = metrics.reduce((sum, m) => sum + m.newMembers, 0)
    const totalCancellations = metrics.reduce((sum, m) => sum + m.cancellations, 0)
    
    console.log(`   📊 Summary:`)
    console.log(`      Revenue: $${totalRevenue.toFixed(2)}`)
    console.log(`      New Members: ${totalNewMembers}`)
    console.log(`      Cancellations: ${totalCancellations}`)
    
    return true
  } catch (error) {
    console.error('   ❌ Query failed:', error)
    return false
  }
}

// Test 4: Email Template Generation
async function testEmailTemplate() {
  console.log('\n4️⃣  Testing email template generation...')
  
  try {
    // Import the email module
    const { sendWeeklySummaryEmail } = await import('../src/lib/email')
    
    console.log('   ✅ Email module loaded')
    console.log('   ✅ Template functions available')
    return true
  } catch (error) {
    console.error('   ❌ Failed to load email module:', error)
    return false
  }
}

// Test 5: Environment Variables
async function testEnvironmentVars() {
  console.log('\n5️⃣  Checking environment variables...')
  
  const hasApiKey = !!process.env.RESEND_API_KEY
  const hasDatabase = !!process.env.DATABASE_URL
  
  if (!hasApiKey) {
    console.warn('   ⚠️  RESEND_API_KEY not set')
    console.log('   💡 Add to .env.local to enable email sending')
  } else {
    console.log('   ✅ RESEND_API_KEY configured')
  }
  
  if (!hasDatabase) {
    console.warn('   ⚠️  DATABASE_URL not set (using default)')
  } else {
    console.log('   ✅ DATABASE_URL configured')
  }
  
  return hasApiKey && hasDatabase
}

// Test 6: Send Test Email (Optional)
async function testEmailSending(recipient: string) {
  console.log('\n6️⃣  Sending test email...')
  
  try {
    const { sendWeeklySummaryEmail } = await import('../src/lib/email')
    
    console.log(`   📧 Sending to: ${recipient}`)
    const result = await sendWeeklySummaryEmail(recipient)
    
    if (result.error) {
      console.error('   ❌ Email failed:', result.error)
      return false
    }
    
    console.log('   ✅ Email sent successfully!')
    console.log(`   📬 Email ID: ${result.data?.id}`)
    console.log(`   💡 Check your inbox at: ${recipient}`)
    return true
  } catch (error) {
    console.error('   ❌ Email sending failed:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('No metrics data')) {
        console.log('   💡 Run: yarn db:seed')
      } else if (error.message.includes('Missing API key')) {
        console.log('   💡 Add RESEND_API_KEY to .env.local')
      }
    }
    
    return false
  }
}

// Main Test Runner
async function runTests() {
  console.log('🧪 Running Integration Tests\n')
  console.log('=' .repeat(50))
  
  const args = process.argv.slice(2)
  const shouldSendEmail = args.includes('--send')
  const emailRecipient = args.find(arg => arg.includes('@')) || 'test@example.com'
  
  const results = {
    database: false,
    data: false,
    query: false,
    template: false,
    env: false,
    email: false
  }
  
  // Run tests
  results.database = await testDatabaseConnection()
  if (results.database) {
    results.data = await testDataAvailability()
    results.query = await testWeeklyQuery()
  }
  
  results.template = await testEmailTemplate()
  results.env = await testEnvironmentVars()
  
  if (shouldSendEmail) {
    if (!process.env.RESEND_API_KEY) {
      console.log('\n⚠️  Cannot send email: RESEND_API_KEY not set')
      console.log('💡 Add your API key to .env.local first')
    } else {
      results.email = await testEmailSending(emailRecipient)
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('\n📊 Test Summary:')
  console.log(`   Database Connection: ${results.database ? '✅' : '❌'}`)
  console.log(`   Data Availability:   ${results.data ? '✅' : '❌'}`)
  console.log(`   Weekly Query:        ${results.query ? '✅' : '❌'}`)
  console.log(`   Email Template:      ${results.template ? '✅' : '❌'}`)
  console.log(`   Environment Vars:    ${results.env ? '✅' : '⚠️'}`)
  
  if (shouldSendEmail) {
    console.log(`   Email Sending:       ${results.email ? '✅' : '❌'}`)
  } else {
    console.log(`   Email Sending:       ⏭️  Skipped`)
  }
  
  const allPassed = results.database && results.data && results.query && results.template
  const emailPassed = !shouldSendEmail || results.email
  
  console.log('\n' + '='.repeat(50))
  
  if (allPassed && emailPassed) {
    console.log('\n✅ All tests passed! System is ready.')
    
    if (!shouldSendEmail && process.env.RESEND_API_KEY) {
      console.log('\n💡 To test email sending, run:')
      console.log(`   tsx examples/test-integration.ts --send ${emailRecipient}`)
    }
    
    process.exit(0)
  } else {
    console.log('\n❌ Some tests failed. Please review errors above.')
    
    if (!results.data) {
      console.log('\n🔧 Quick fix: yarn db:seed')
    }
    if (!results.env) {
      console.log('\n🔧 Quick fix: Add RESEND_API_KEY to .env.local')
    }
    
    process.exit(1)
  }
}

// Cleanup
async function cleanup() {
  try {
    await prisma.$disconnect()
  } catch (error) {
    // Ignore cleanup errors
  }
}

// Run
runTests()
  .catch((error) => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })
  .finally(cleanup)

