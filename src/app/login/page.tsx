/**
 * Login Page - Whop OAuth
 * Users click "Login with Whop" to authenticate
 */

import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { LoginForm } from '@/components/login-form'

export default async function LoginPage() {
  // Don't auto-redirect logged-in users here
  // They should access via /experiences/[experienceId] with proper experienceId context
  // This prevents redirects to old /dashboard route

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center">
        <p>Loading...</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}

