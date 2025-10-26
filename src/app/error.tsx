/**
 * Global Error Boundary
 * Catches all unhandled errors in the app and shows a friendly message
 */

'use client'

import { useEffect } from 'react'
import { ErrorDisplay } from '@/components/error-boundary'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to console for debugging (in development)
    if (process.env.NODE_ENV === 'development') {
      console.error('Global error caught:', error)
    }
    
    // In production, you might want to send this to an error tracking service
    // like Sentry, LogRocket, etc.
  }, [error])

  // Check if it's a database error
  const isDatabaseError = error.message?.includes('Prisma') || 
                          error.message?.includes('database') ||
                          error.message?.includes('column')

  // Check if it's an authentication error
  const isAuthError = error.message?.includes('unauthorized') ||
                      error.message?.includes('permission') ||
                      error.message?.includes('access')

  if (isDatabaseError) {
    return (
      <ErrorDisplay
        title="Database Connection Issue"
        message="We're having trouble connecting to the database. Please try refreshing the page."
        showRefreshButton={true}
        showHomeButton={true}
      />
    )
  }

  if (isAuthError) {
    return (
      <ErrorDisplay
        title="Access Issue"
        message="There was a problem verifying your access. Please try logging in again."
        showRefreshButton={false}
        showHomeButton={true}
        variant="warning"
      />
    )
  }

  // Generic error fallback
  return (
    <ErrorDisplay
      title="Something Went Wrong"
      message="We encountered an unexpected error. Please try refreshing the page."
      showRefreshButton={true}
      showHomeButton={true}
    />
  )
}

