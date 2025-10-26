/**
 * Login Page - Whop OAuth
 * Users click "Login with Whop" to authenticate
 */

import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { LoginForm } from '@/components/login-form'

export default async function LoginPage() {
  // If already logged in, redirect to dashboard
  const session = await getSession()
  if (session) {
    redirect('/dashboard')
  }

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

