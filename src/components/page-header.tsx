/**
 * Shared Page Header Component
 * Consistent header styling matching dashboard/experience pages
 */

import { WhoplyticsLogo } from '@/components/whoplytics-logo'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home } from 'lucide-react'

interface PageHeaderProps {
  title?: string
  subtitle?: string
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/discover">
            <WhoplyticsLogo 
              personalizedText={title || 'Whoplytics'}
              tagline={subtitle || 'Business insights at a glance'}
            />
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/discover">
            <Button variant="ghost" size="sm">
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

