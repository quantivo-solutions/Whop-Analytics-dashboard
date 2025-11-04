'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Lock } from 'lucide-react'

interface LockedCardProps {
  title: string
  subtitle: string
  companyId?: string
}

export function LockedCard({ title, subtitle, companyId }: LockedCardProps) {
  const appId = process.env.NEXT_PUBLIC_WHOP_APP_ID
  const upgradeUrl = appId ? `https://whop.com/apps/${appId}` : '#'

  return (
    <Card className="relative border-dashed border-2 bg-white/10 dark:bg-slate-900/20 backdrop-blur-sm overflow-hidden">
      {/* Blur overlay */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md z-10 flex flex-col items-center justify-center p-4 text-center">
        <div className="p-3 rounded-full bg-muted/50 mb-3">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-semibold mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground mb-3">{subtitle}</p>
        <Button
          size="sm"
          onClick={() => window.open(upgradeUrl, '_blank')}
          className="bg-gradient-to-r from-cyan-400 to-sky-500 hover:shadow-[0_0_30px_rgba(56,189,248,0.35)] text-white"
        >
          Upgrade to Pro
        </Button>
      </div>

      {/* Blurred content underneath */}
      <CardContent className="p-4 blur-sm">
        <div className="h-20 bg-muted/30 rounded" />
      </CardContent>
    </Card>
  )
}

