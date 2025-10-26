/**
 * Friendly Error Display Components
 * Shows user-friendly messages instead of raw errors
 */

'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle, RefreshCw, Home, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface ErrorDisplayProps {
  title?: string
  message?: string
  showHomeButton?: boolean
  showBackButton?: boolean
  showRefreshButton?: boolean
  variant?: 'error' | 'warning' | 'info'
}

export function ErrorDisplay({
  title = 'Something went wrong',
  message = 'We encountered an unexpected error. Please try again or contact support if the problem persists.',
  showHomeButton = true,
  showBackButton = false,
  showRefreshButton = true,
  variant = 'error',
}: ErrorDisplayProps) {
  const variantStyles = {
    error: {
      card: 'border-red-200 dark:border-red-800',
      icon: 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400',
    },
    warning: {
      card: 'border-yellow-200 dark:border-yellow-800',
      icon: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-600 dark:text-yellow-400',
    },
    info: {
      card: 'border-blue-200 dark:border-blue-800',
      icon: 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400',
    },
  }

  const styles = variantStyles[variant]

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className={`max-w-md w-full ${styles.card}`}>
        <CardContent className="pt-6 text-center space-y-4">
          <div className={`rounded-full p-3 w-12 h-12 mx-auto flex items-center justify-center ${styles.icon}`}>
            <AlertCircle className="h-6 w-6" />
          </div>
          
          <h2 className="text-2xl font-bold">{title}</h2>
          
          <p className="text-muted-foreground">{message}</p>
          
          <div className="pt-4 flex flex-col gap-2">
            {showRefreshButton && (
              <Button onClick={() => window.location.reload()} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            )}
            
            {showHomeButton && (
              <Link href="/dashboard">
                <Button variant="outline" className="w-full gap-2">
                  <Home className="h-4 w-4" />
                  Go to Dashboard
                </Button>
              </Link>
            )}
            
            {showBackButton && (
              <Button variant="outline" onClick={() => window.history.back()} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </Button>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground pt-4">
            If this issue persists, please contact support with the details of what you were trying to do.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Database Error Display
 */
export function DatabaseError() {
  return (
    <ErrorDisplay
      title="Database Connection Issue"
      message="We're having trouble connecting to the database. Our team has been notified and is working on it."
      showRefreshButton={true}
      showHomeButton={true}
    />
  )
}

/**
 * Not Found Error Display
 */
export function NotFoundError({ resourceType = 'page' }: { resourceType?: string }) {
  return (
    <ErrorDisplay
      title="Not Found"
      message={`The ${resourceType} you're looking for doesn't exist or has been removed.`}
      showRefreshButton={false}
      showHomeButton={true}
      showBackButton={true}
      variant="warning"
    />
  )
}

/**
 * Permission Error Display
 */
export function PermissionError() {
  return (
    <ErrorDisplay
      title="Access Denied"
      message="You don't have permission to view this page. Please check your access level or contact support."
      showRefreshButton={false}
      showHomeButton={true}
      variant="warning"
    />
  )
}

/**
 * Loading Error Display (for failed data fetches)
 */
export function DataLoadError({ retry }: { retry?: () => void }) {
  return (
    <ErrorDisplay
      title="Failed to Load Data"
      message="We couldn't load the data you requested. This might be a temporary issue."
      showRefreshButton={true}
      showHomeButton={true}
    />
  )
}

