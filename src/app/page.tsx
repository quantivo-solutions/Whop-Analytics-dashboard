/**
 * Home Page
 * Redirects to dashboard if authenticated, otherwise to login
 */

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function Home() {
  const session = await getSession()
  
  if (session) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
