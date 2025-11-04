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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      {/* Background gradient overlay - matching Wizard style */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-slate-950/80 dark:from-black/90 dark:via-slate-900/70 dark:to-black/90" />
      
      <div className="relative w-full max-w-[520px] flex items-center">
        <Card className="relative rounded-xl border-2 border-cyan-400/30 dark:border-cyan-500/30 shadow-2xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 backdrop-blur-sm overflow-hidden w-full">
          {/* Decorative gradient border */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 via-sky-400/10 to-cyan-400/20 opacity-60 pointer-events-none" />
          
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 z-10 hover:bg-cyan-400/10 text-slate-600 dark:text-slate-400 h-7 w-7"
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
          
          <CardContent className="relative p-4">
            {/* Header */}
            <div className="text-center mb-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400/20 via-sky-400/20 to-cyan-400/10 mb-2 ring-2 ring-cyan-400/20 shadow-md">
                <Crown className="h-6 w-6 text-cyan-500 dark:text-cyan-400" />
              </div>
              
              <h1 className="text-xl md:text-2xl font-bold mb-1 bg-gradient-to-r from-cyan-600 to-sky-600 dark:from-cyan-400 dark:to-sky-400 bg-clip-text text-transparent">
                Welcome to Whoplytics Pro!
              </h1>
              
              <p className="text-xs text-slate-600 dark:text-slate-400">
                You're all set to unlock powerful analytics and insights
              </p>
            </div>

            {/* Pro Badge */}
            <div className="flex justify-center mb-3">
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-400 to-sky-500 shadow-md shadow-cyan-500/30 border border-cyan-300/50">
                <Sparkles className="h-2.5 w-2.5 text-white" />
                <span className="text-[10px] font-semibold text-white">Pro Plan Active</span>
              </div>
            </div>

            {/* Features list */}
            <div className="space-y-1.5 mb-3">
              <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 text-center uppercase tracking-wide">Your Pro Features</p>
              <div className="grid gap-1.5">
                {features.map((feature, index) => {
                  const Icon = feature.icon
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-cyan-400/50 dark:hover:border-cyan-500/50 transition-all duration-200 group shadow-sm"
                    >
                      <div className="p-1 rounded bg-gradient-to-br from-cyan-400/10 to-sky-400/10 group-hover:from-cyan-400/20 group-hover:to-sky-400/20 transition-colors flex-shrink-0">
                        <Icon className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      <span className="text-xs font-medium text-slate-900 dark:text-slate-100 flex-1 leading-tight">{feature.text}</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* CTA */}
            <div className="text-center">
              <Button
                onClick={onClose}
                size="sm"
                className="w-full px-4 py-2 text-xs font-semibold bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-500 hover:to-sky-600 hover:shadow-[0_0_30px_rgba(56,189,248,0.35)] text-white shadow-lg shadow-cyan-500/30 transition-all duration-300"
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Get Started
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

