'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Lock } from 'lucide-react'
import { UpsellModal } from './upsell/UpsellModal'
import { useState } from 'react'

interface LockedCardProps {
  title: string
  subtitle: string
  companyId?: string
}

export function LockedCard({ title, subtitle, companyId }: LockedCardProps) {
  const [upsellOpen, setUpsellOpen] = useState(false)

  return (
    <>
      <Card className="relative border-2 border-dashed border-slate-400 dark:border-slate-500 bg-white dark:bg-slate-900 shadow-md overflow-hidden">
        {/* Lock overlay */}
        <div className="absolute inset-0 bg-white dark:bg-slate-900 z-10 flex flex-col items-center justify-center p-4 text-center">
          <div className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 mb-2.5 ring-2 ring-slate-200 dark:ring-slate-700">
            <Lock className="h-5 w-5 text-slate-700 dark:text-slate-300" />
          </div>
          <h3 className="text-sm font-bold mb-1.5 text-slate-900 dark:text-slate-100">{title}</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 leading-snug">{subtitle}</p>
          <Button
            size="sm"
            onClick={() => setUpsellOpen(true)}
            className="bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-500 hover:to-sky-600 hover:shadow-[0_0_30px_rgba(56,189,248,0.35)] text-white font-semibold shadow-md shadow-cyan-500/20 transition-all duration-300 px-4 py-1.5 text-xs"
          >
            Upgrade to Pro
          </Button>
        </div>

        {/* Blurred content underneath */}
        <CardContent className="p-3 blur-sm opacity-20">
          <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded" />
        </CardContent>
      </Card>

      <UpsellModal open={upsellOpen} onClose={() => setUpsellOpen(false)} />
    </>
  )
}

