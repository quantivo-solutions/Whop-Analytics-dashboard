'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
      <Card 
        className="relative border-2 border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-md overflow-hidden h-full flex flex-col cursor-pointer hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
        onClick={() => setUpsellOpen(true)}
      >
        {/* Lock overlay */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center bg-white dark:bg-slate-900">
          <div className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 mb-2.5 ring-2 ring-slate-200 dark:ring-slate-700 flex-shrink-0">
            <Lock className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" />
          </div>
          <h3 className="text-sm font-bold mb-1.5 text-slate-900 dark:text-slate-100 leading-tight">{title}</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 leading-snug px-1 flex-1">{subtitle}</p>
          <Badge 
            variant="outline" 
            className="text-xs border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-colors mt-auto"
          >
            Pro Feature
          </Badge>
        </div>
      </Card>

      <UpsellModal open={upsellOpen} onClose={() => setUpsellOpen(false)} />
    </>
  )
}

