'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Sparkles, TrendingUp, Mail, Zap, Download, Users, Crown, X } from 'lucide-react'

interface ProWelcomeModalProps {
  open: boolean
  onClose: () => void
}

export function ProWelcomeModal({ open, onClose }: ProWelcomeModalProps) {
  if (!open) return null

  const features = [
    { icon: Mail, text: 'Daily revenue email reports' },
    { icon: TrendingUp, text: 'Churn risk detection' },
    { icon: Zap, text: 'Discord alerts' },
    { icon: Download, text: 'CSV export & 90-day history' },
    { icon: Users, text: 'Top customers analytics' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
      {/* Background gradient overlay - matching Wizard style */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-slate-950/80 dark:from-black/90 dark:via-slate-900/70 dark:to-black/90" />
      
      <div className="relative w-full max-w-[720px] my-8">
        <Card className="relative rounded-2xl border shadow-2xl bg-background/95 backdrop-blur-sm overflow-hidden">
          {/* Decorative gradient border */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 opacity-50 pointer-events-none" />
          
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 z-10 hover:bg-primary/10"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          
          <CardContent className="relative p-6 md:p-8">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 mb-4 ring-4 ring-primary/10 animate-in zoom-in duration-500">
                <Crown className="h-10 w-10 text-primary" />
              </div>
              
              <h1 className="text-2xl md:text-3xl font-bold mb-2 text-foreground">
                Welcome to Whoplytics Pro!
              </h1>
              
              <p className="text-sm md:text-base text-muted-foreground">
                You're all set to unlock powerful analytics and insights
              </p>
            </div>

            {/* Pro Badge */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-primary/15 to-primary/10 border border-primary/30 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">Pro Plan Active</span>
              </div>
            </div>

            {/* Features list */}
            <div className="space-y-2.5 mb-6">
              <p className="text-xs font-semibold text-foreground mb-3 text-center uppercase tracking-wide">Your Pro Features</p>
              <div className="grid gap-2.5">
                {features.map((feature, index) => {
                  const Icon = feature.icon
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-muted/60 to-muted/40 border border-border/50 hover:border-primary/30 hover:from-primary/5 hover:to-primary/5 transition-all duration-200 group"
                    >
                      <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-foreground flex-1">{feature.text}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* CTA */}
            <div className="text-center pt-2">
              <Button
                onClick={onClose}
                size="lg"
                className="w-full md:w-auto min-w-[200px] px-8 py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Get Started
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

