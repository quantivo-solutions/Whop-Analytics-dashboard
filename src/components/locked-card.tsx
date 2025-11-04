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
      <Card className="relative border-dashed border-2 border-slate-300 dark:border-slate-700 bg-gradient-to-br from-slate-50/50 to-slate-100/30 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm overflow-hidden">
        {/* Lock overlay */}
        <div className="absolute inset-0 bg-background/98 dark:bg-slate-950/98 backdrop-blur-md z-10 flex flex-col items-center justify-center p-6 sm:p-8 text-center">
          <div className="p-3.5 rounded-full bg-muted/80 dark:bg-slate-800/80 mb-4 ring-2 ring-slate-200 dark:ring-slate-700">
            <Lock className="h-6 w-6 text-slate-600 dark:text-slate-400" />
          </div>
          <h3 className="text-base font-bold mb-2.5 text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-xs leading-relaxed">{subtitle}</p>
          <Button
            size="default"
            onClick={() => setUpsellOpen(true)}
            className="bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-500 hover:to-sky-600 hover:shadow-[0_0_30px_rgba(56,189,248,0.35)] text-white font-semibold shadow-lg shadow-cyan-500/20 transition-all duration-300 px-6 py-2.5"
          >
            Upgrade to Pro
          </Button>
        </div>

        {/* Blurred content underneath */}
        <CardContent className="p-4 blur-sm opacity-30">
          <div className="h-24 bg-muted/50 rounded-lg" />
        </CardContent>
      </Card>

      <UpsellModal open={upsellOpen} onClose={() => setUpsellOpen(false)} />
    </>
  )
}

