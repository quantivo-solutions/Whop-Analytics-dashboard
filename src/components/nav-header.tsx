/**
 * Shared navigation header component
 * Provides consistent navigation across all pages
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BarChart3, Settings, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavHeaderProps {
  showPlanBadge?: boolean
  planBadge?: React.ReactNode
  upgradeButton?: React.ReactNode
}

export function NavHeader({ showPlanBadge = false, planBadge, upgradeButton }: NavHeaderProps) {
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard' || pathname.startsWith('/dashboard/')
    }
    return pathname.startsWith(path)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        {/* Logo & Navigation */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="rounded-lg bg-primary p-2">
              <BarChart3 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg hidden sm:inline-block">Analytics</span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link href="/dashboard">
              <Button
                variant={isActive('/dashboard') ? 'default' : 'ghost'}
                size="sm"
                className="gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>

            <Link href="/discover">
              <Button
                variant={isActive('/discover') ? 'default' : 'ghost'}
                size="sm"
                className="gap-2"
              >
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Plans</span>
              </Button>
            </Link>

            <Link href="/settings">
              <Button
                variant={isActive('/settings') ? 'default' : 'ghost'}
                size="sm"
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </Button>
            </Link>
          </nav>
        </div>

        {/* Plan Badge & Actions */}
        {showPlanBadge && (
          <div className="flex items-center gap-2">
            {planBadge}
            {upgradeButton}
          </div>
        )}
      </div>
    </header>
  )
}

