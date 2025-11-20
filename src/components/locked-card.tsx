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
          "relative border-2 border-dashed border-border/50",
          "bg-card/50 backdrop-blur-sm",
          "hover:bg-card/70 hover:border-border",
          "shadow-lg overflow-hidden h-full flex flex-col cursor-pointer",
          "transition-all duration-200"
        )}
        onClick={() => setUpsellOpen(true)}
      >
        {/* Lock overlay */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-5 text-center bg-card/50">
          <div className={cn(
            "p-2 rounded-full mb-2.5 ring-2 flex-shrink-0",
            "bg-muted/50 backdrop-blur-sm",
            "ring-border/50"
          )}>
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-bold mb-1.5 text-foreground leading-tight">{title}</h3>
          <p className="text-xs text-muted-foreground mb-2 leading-snug px-1 flex-1">{subtitle}</p>
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

