#!/usr/bin/env node
/**
 * Test script to verify webhook endpoint is accessible
 * This helps diagnose why webhooks aren't reaching our server
 */

const PROD_URL = process.env.PROD_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://whop-analytics-dashboard-omega.vercel.app'

async function testWebhookEndpoint() {
  const webhookUrl = `${PROD_URL}/api/webhooks/whop`
  
  console.log('🔍 Testing webhook endpoint accessibility...\n')
  console.log(`📡 Webhook URL: ${webhookUrl}\n`)
  
  try {
    // Test 1: GET request (health check)
    console.log('Test 1: GET request (health check)...')
    const getResponse = await fetch(webhookUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    const getText = await getResponse.text()
    let getData
    try {
      getData = JSON.parse(getText)
    } catch (e) {
      console.log(`⚠️  GET response is not JSON: ${getText.substring(0, 200)}`)
      getData = { raw: getText.substring(0, 200) }
    }
    
    console.log(`✅ GET response: ${getResponse.status} ${getResponse.statusText}`)
    console.log(`   Response:`, JSON.stringify(getData, null, 2))
    console.log('')
    
    // Test 2: POST request with minimal payload
    console.log('Test 2: POST request with minimal payload...')
    const testPayload = {
      type: 'test',
      data: {
        company_id: 'test_company_123',
      },
    }
    
    const postResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    })
    
    const postText = await postResponse.text()
    console.log(`📥 POST response: ${postResponse.status} ${postResponse.statusText}`)
    console.log(`   Response:`, postText.substring(0, 500))
    console.log('')
    
    // Summary
    console.log('📊 Summary:')
    console.log(`   ✅ GET endpoint: ${getResponse.ok ? 'ACCESSIBLE' : 'FAILED'}`)
    console.log(`   ${postResponse.status === 200 || postResponse.status === 400 || postResponse.status === 403 ? '✅' : '❌'} POST endpoint: ${postResponse.status === 200 ? 'ACCESSIBLE' : postResponse.status === 400 ? 'ACCESSIBLE (payload rejected)' : postResponse.status === 403 ? 'ACCESSIBLE (signature required)' : 'FAILED'}`)
    console.log('')
    
    if (getResponse.ok) {
      console.log('✅ Webhook endpoint is accessible!')
      console.log('')
      console.log('🔧 Next steps:')
      console.log('   1. Verify webhook URL in Whop Developer Portal:')
      console.log(`      ${webhookUrl}`)
      console.log('   2. Check webhook events subscribed:')
      console.log('      - app.installed')
      console.log('      - app.uninstalled')
      console.log('      - membership.activated')
      console.log('      - membership.cancelled')
      console.log('   3. Check Vercel logs when installing app:')
      console.log('      https://vercel.com/dashboard -> Your Project -> Logs')
      console.log('')
    } else {
      console.log('❌ Webhook endpoint is NOT accessible!')
      console.log('')
      console.log('🔧 Troubleshooting:')
      console.log('   1. Check Vercel deployment status')
      console.log('   2. Verify the URL is correct in Whop Developer Portal')
      console.log('   3. Check Vercel function logs for errors')
      console.log('')
    }
    
  } catch (error) {
    console.error('❌ Error testing webhook endpoint:', error.message)
    console.error('')
    console.error('🔧 Troubleshooting:')
    console.error('   1. Check your internet connection')
    console.error(`   2. Verify ${PROD_URL} is accessible`)
    console.error('   3. Check DNS resolution')
    console.error('')
    process.exit(1)
  }
}

testWebhookEndpoint()

