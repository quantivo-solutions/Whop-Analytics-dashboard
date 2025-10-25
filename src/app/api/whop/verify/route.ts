import { NextResponse } from 'next/server'

/**
 * POST /api/whop/verify
 * 
 * Verifies a Whop API key by testing it against the Whop API.
 * 
 * Request body:
 * {
 *   "apiKey": "whop_xxx..."
 * }
 * 
 * Success response (200):
 * {
 *   "valid": true,
 *   "user": { ...userData }
 * }
 * 
 * Error response (401):
 * {
 *   "valid": false,
 *   "error": "Invalid API key"
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { apiKey } = body

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'API key is required' },
        { status: 400 }
      )
    }

    // Create an AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout

    try {
      // Test the API key against Whop's /me endpoint
      const response = await fetch('https://api.whop.com/api/v2/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        
        return NextResponse.json({
          valid: true,
          user: data,
        })
      }

      // Handle unauthorized or other error responses
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json(
          { valid: false, error: 'Invalid API key' },
          { status: 401 }
        )
      }

      // Handle other errors
      console.error(`Whop API returned status ${response.status}`)
      return NextResponse.json(
        { valid: false, error: 'Failed to verify API key' },
        { status: response.status }
      )

    } catch (fetchError) {
      clearTimeout(timeoutId)

      // Handle timeout
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('Whop API request timed out')
        return NextResponse.json(
          { valid: false, error: 'Request timed out' },
          { status: 408 }
        )
      }

      // Handle network or other fetch errors
      console.error('Error verifying Whop API key:', fetchError)
      return NextResponse.json(
        { valid: false, error: 'Failed to connect to Whop API' },
        { status: 503 }
      )
    }

  } catch (error) {
    console.error('Error in verify endpoint:', error)
    return NextResponse.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Reject all other HTTP methods
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  )
}

export async function PATCH() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  )
}

