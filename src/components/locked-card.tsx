'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Lock } from 'lucide-react'
import { UpsellModal } from './upsell/UpsellModal'
import { useState } from 'react'
import { cn } from '@/lib/utils'

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
        className={cn(
          "relative border-2 border-dashed",
          "border-neutral-300 dark:border-neutral-700",
          "hover:border-neutral-400 dark:hover:border-neutral-600",
          "bg-white dark:bg-neutral-900",
          "shadow-md overflow-hidden h-full flex flex-col cursor-pointer transition-colors"
        )}
        onClick={() => setUpsellOpen(true)}
      >
        {/* Lock overlay */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center bg-white dark:bg-neutral-900">
          <div className={cn(
            "p-2 rounded-full mb-2.5 ring-2 flex-shrink-0",
            "bg-neutral-100 dark:bg-neutral-800",
            "ring-neutral-200 dark:ring-neutral-700"
          )}>
            <Lock className="h-3.5 w-3.5 text-neutral-700 dark:text-neutral-200" />
          </div>
          <h3 className="text-sm font-bold mb-1.5 text-neutral-900 dark:text-neutral-50 leading-tight">{title}</h3>
          <p className="text-xs text-neutral-600 dark:text-neutral-300 mb-2 leading-snug px-1 flex-1">{subtitle}</p>
          <Badge 
            variant="outline" 
            className="text-xs border-primary/30 text-primary dark:text-primary bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors mt-auto"
          >
            Pro Feature
          </Badge>
        </div>
      </Card>

      <UpsellModal open={upsellOpen} onClose={() => setUpsellOpen(false)} />
    </>
  )
}

