import { NextResponse } from 'next/server'

/**
 * Test endpoint to verify Whop API connectivity
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')

    if (!secret || secret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const apiKey = process.env.WHOP_API_KEY || process.env.WHOP_SK

    if (!apiKey) {
      return NextResponse.json({
        ok: false,
        error: 'No API key found',
      })
    }

    console.log('Testing Whop API with key:', apiKey.substring(0, 15) + '...')

    // Test 1: Try /company endpoint (API v5)
    const companyTest = await testEndpoint(
      'https://api.whop.com/api/v5/company',
      apiKey
    )

    // Test 2: Try /me endpoint (API v2)
    const meTest = await testEndpoint(
      'https://api.whop.com/api/v2/me',
      apiKey
    )

    // Test 3: Try /payments endpoint (API v2)
    const paymentsTest = await testEndpoint(
      'https://api.whop.com/api/v2/payments?limit=1',
      apiKey
    )

    return NextResponse.json({
      ok: true,
      apiKeyFound: true,
      apiKeyLength: apiKey.length,
      apiKeyPrefix: apiKey.substring(0, 15),
      tests: {
        company_v5: companyTest,
        me_v2: meTest,
        payments_v2: paymentsTest,
      },
    })
  } catch (error) {
    console.error('Error in Whop test endpoint:', error)
    return NextResponse.json(
      {
        error: 'Test failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

async function testEndpoint(url: string, apiKey: string) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    const text = await response.text()
    let body
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }

    return {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      body: response.ok ? 'Success' : body,
    }
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

