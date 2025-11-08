'use client'

import { useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ExperienceDashboardCardProps {
  companyId: string
  experienceName?: string | null
  internalDashboardHref: string
  whopDashboardHref?: string | null
}

export function ExperienceDashboardCard({
  companyId,
  experienceName,
  internalDashboardHref,
  whopDashboardHref,
}: ExperienceDashboardCardProps) {
  const handleClick = useCallback(() => {
    const target = whopDashboardHref || internalDashboardHref

    try {
      if (typeof window !== 'undefined') {
        if (window.top) {
          window.top.location.href = target
          return
        }
        window.location.href = target
      }
    } catch {
      if (typeof window !== 'undefined') {
        window.location.href = target
      }
    }
  }, [internalDashboardHref, whopDashboardHref])

  return (
    <div className="relative max-w-3xl mx-auto">
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-100/60 via-white/40 to-purple-100/60 blur-3xl dark:from-blue-900/20 dark:via-slate-900/40 dark:to-purple-900/20" />
      <div className={cn(
        'relative rounded-3xl bg-white/80 dark:bg-slate-900/80',
        'border border-slate-200/70 dark:border-slate-700/60 shadow-2xl',
        'p-8 sm:p-10'
      )}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="text-left space-y-4">
            <div>
              <p className="text-sm uppercase tracking-wider text-blue-500 font-semibold">Whoplytics</p>
              <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100">
                {experienceName ? `${experienceName} Dashboard` : 'Your Creator Dashboard'}
              </h1>
            </div>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Unlock your revenue, members, and growth insights in the Whoplytics creator dashboard.
              Configure goals, export reports, and manage alerts with one secure workspace.
            </p>
            <div className="grid gap-2 text-sm text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span className="inline-flex size-2 rounded-full bg-emerald-500" />
                Live metrics synced for <span className="font-medium text-slate-900 dark:text-slate-100">{companyId}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex size-2 rounded-full bg-blue-500" />
                Secure access through your Whop dashboard
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center sm:items-end gap-4 w-full sm:w-auto">
            <Button onClick={handleClick} size="lg" className="px-8 w-full sm:w-auto">
              Open Creator Dashboard
            </Button>
            <Link
              href={internalDashboardHref}
              className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              Open inside current view →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

