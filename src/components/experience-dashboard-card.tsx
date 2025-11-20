'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ExperienceDashboardCardProps {
  companyId: string
  experienceName?: string | null
  redirectHref: string
  highlights?: Array<{ icon: string; label: string }>
}

export function ExperienceDashboardCard({
  companyId,
  experienceName,
  redirectHref,
  highlights = [
    { icon: '📈', label: 'Real-time revenue & member insights' },
    { icon: '🎯', label: 'Goal tracking, alerts & scheduled exports' },
    { icon: '🤝', label: 'Secure workspace for your entire team' },
  ],
}: ExperienceDashboardCardProps) {
  const resolvedHref = redirectHref.replace(/\{companyId\}/g, companyId)

  return (
    <div className="relative max-w-4xl mx-auto">
      <div className="absolute inset-0 rounded-[42px] bg-gradient-to-br from-sky-200/65 via-white/55 to-indigo-200/55 blur-3xl dark:from-sky-900/25 dark:via-neutral-900/45 dark:to-indigo-900/35" />
      <div className={cn(
        'relative rounded-[32px] bg-white/85 dark:bg-neutral-900/85 backdrop-blur-xl',
        'border border-white/60 dark:border-neutral-700/50 shadow-[0_40px_80px_-40px_rgba(15,23,42,0.4)]',
        'p-8 sm:p-12'
      )}>
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-10">
          <div className="flex-1 text-left space-y-5">
            <div className="space-y-2">
              <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                WHOPLYTICS
              </span>
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                {experienceName ? `${experienceName} Dashboard` : 'Your Creator Dashboard'}
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                Welcome.
              </p>
            </div>
            <p className="text-base sm:text-lg text-neutral-700 dark:text-neutral-200 leading-relaxed max-w-2xl">
              Your analytics workspace lives in the creator dashboard. Track revenue momentum, member trends,
              churn risk, and goal progress with a single, secure login. Everything updates in real time.
            </p>
          </div>
          <div className="w-full lg:w-auto space-y-6">
            <div className="grid gap-3">
              {highlights.map((item, idx) => (
                <div
                  key={`${item.label}-${idx}`}
                  className="flex items-start gap-3 rounded-2xl bg-white/70 dark:bg-neutral-800/60 border border-white/60 dark:border-neutral-700/40 px-4 py-3 shadow-sm"
                >
                  <span className="text-lg">{item.icon}</span>
                  <p className="text-sm text-neutral-700 dark:text-neutral-200 leading-relaxed">{item.label}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-col items-stretch gap-2">
              <a
                href={resolvedHref}
                target="_top"
                rel="noopener noreferrer"
                className="inline-flex"
              >
                <Button
                  type="button"
                  size="lg"
                  className="h-12 text-base font-medium bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-50 dark:hover:bg-neutral-100 dark:text-neutral-900 shadow-lg w-full"
                >
                  Open Creator Dashboard
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}



