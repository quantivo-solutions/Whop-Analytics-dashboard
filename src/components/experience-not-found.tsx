'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowRight, AlertCircle } from 'lucide-react'

interface ExperienceNotFoundProps {
  experienceId: string
  hasOtherInstallation?: boolean
  otherExperienceId?: string
}

export function ExperienceNotFound({ 
  experienceId, 
  hasOtherInstallation = false,
  otherExperienceId 
}: ExperienceNotFoundProps) {
  const router = useRouter()

  useEffect(() => {
    console.log('[ExperienceNotFound] Component mounted, experienceId:', experienceId)
    console.log('[ExperienceNotFound] Has other installation:', hasOtherInstallation)
  }, [experienceId, hasOtherInstallation])

  // CASE 1: User has an installation elsewhere (Pro membership Whop)
  if (hasOtherInstallation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-lg">
          <CardContent className="pt-6 text-center space-y-6">
            <div className="rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-4 w-16 h-16 mx-auto flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Whoplytics Not Available Here</h2>
              <p className="text-muted-foreground">
                You're viewing your Pro membership management page.
              </p>
            </div>
            
            <div className="p-4 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg text-left space-y-3">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                💡 How Whoplytics works:
              </p>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2 list-disc list-inside">
                <li>Whoplytics is installed in <strong>your company's Whop</strong></li>
                <li>This page is for <strong>Pro membership management</strong></li>
                <li>To access your analytics, switch to where the app is installed</li>
              </ul>
            </div>

            {otherExperienceId && (
              <Link href={`/experiences/${otherExperienceId}`}>
                <Button className="gap-2 w-full" size="lg">
                  Go to Your Dashboard <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}

            <div className="pt-4 border-t space-y-3">
              <p className="text-sm text-muted-foreground">
                <strong>To access Whoplytics:</strong>
              </p>
              <ol className="text-sm text-muted-foreground text-left space-y-2 list-decimal list-inside">
                <li>Look for <strong>your company's Whop</strong> in the sidebar</li>
                <li>Click on it to switch Whops</li>
                <li>You'll see your Whoplytics dashboard there! 🎉</li>
              </ol>
            </div>

            <div className="pt-4">
              <p className="text-xs text-muted-foreground">
                Experience ID: <code className="text-xs bg-muted px-2 py-1 rounded">{experienceId}</code>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // CASE 2: New installation - auto-redirect to login
  useEffect(() => {
    if (!hasOtherInstallation) {
      console.log('[ExperienceNotFound] Starting auto-redirect to login')
      const loginUrl = `/login?experienceId=${experienceId}`
      console.log('[ExperienceNotFound] Redirect URL:', loginUrl)
      
      // Immediate redirect using Next.js router
      console.log('[ExperienceNotFound] Calling router.push...')
      router.push(loginUrl)
      
      // Also use window.location as fallback
      console.log('[ExperienceNotFound] Also setting window.location...')
      setTimeout(() => {
        console.log('[ExperienceNotFound] Executing window.location redirect')
        window.location.href = loginUrl
      }, 300)
    }
  }, [hasOtherInstallation, experienceId, router])

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-md">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="relative w-12 h-12 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-primary/30"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin"></div>
          </div>
          <h2 className="text-xl font-semibold">Redirecting to login...</h2>
          <p className="text-sm text-muted-foreground">
            Please wait a moment
          </p>
          {/* Manual link as fallback */}
          <div className="pt-4">
            <Link href={`/login?experienceId=${experienceId}`}>
              <Button variant="outline" className="gap-2">
                Click here if not redirected <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

