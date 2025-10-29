import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const headers = Object.fromEntries(request.headers.entries())
  
  console.log('[IFRAME TEST] Request received')
  console.log('[IFRAME TEST] URL:', url.toString())
  console.log('[IFRAME TEST] Search params:', Object.fromEntries(url.searchParams.entries()))
  console.log('[IFRAME TEST] Headers:', JSON.stringify(headers, null, 2))
  
  return new Response(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Iframe Test</title>
      </head>
      <body style="font-family: monospace; padding: 20px;">
        <h1>🎯 Iframe Test Page</h1>
        <p><strong>This page loaded successfully!</strong></p>
        <h2>Request Details:</h2>
        <pre>${JSON.stringify({
          url: url.toString(),
          searchParams: Object.fromEntries(url.searchParams.entries()),
          headers: headers,
        }, null, 2)}</pre>
        <hr>
        <p>Check Vercel logs for detailed request information</p>
      </body>
    </html>
  `, {
    headers: {
      'Content-Type': 'text/html',
    },
  })
}

