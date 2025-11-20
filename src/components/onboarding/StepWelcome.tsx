'use client'

import { TrendingUp, Users, Target, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StepWelcome() {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-1.5">
        <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Welcome to Whoplytics</h2>
        <p className="text-sm text-muted-foreground">Your subscription business, at a glance.</p>
      </div>

      <div className="rounded-lg bg-muted/50 backdrop-blur-sm border border-border/50 p-4 sm:p-5 space-y-3">
        <h3 className="font-semibold text-sm">What you'll get:</h3>
        <ul className="space-y-2.5">
          <li className="flex items-start gap-2.5">
            <div className="mt-0.5 rounded-full bg-primary/10 p-1 flex-shrink-0">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Live revenue & member trends</p>
              <p className="text-xs text-muted-foreground">Real-time dashboard with key metrics</p>
            </div>
          </li>
          <li className="flex items-start gap-2.5">
            <div className="mt-0.5 rounded-full bg-primary/10 p-1 flex-shrink-0">
              <Users className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Weekly insights in your inbox</p>
              <p className="text-xs text-muted-foreground">Automated summaries every week</p>
            </div>
          </li>
          <li className="flex items-start gap-2.5">
            <div className="mt-0.5 rounded-full bg-primary/10 p-1 flex-shrink-0">
              <Target className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Clear goals with progress</p>
              <p className="text-xs text-muted-foreground">Track your monthly revenue targets</p>
            </div>
          </li>
        </ul>
      </div>

      {/* Dashboard preview illustration */}
      <div className="flex justify-center pt-4">
        <div className="relative w-full max-w-sm">
          <div className={cn(
            "grid grid-cols-3 gap-2 p-3 rounded-lg border shadow-md",
            "bg-card/80 backdrop-blur-sm",
            "border-border/50"
          )}>
            {/* Revenue Card */}
            <div className={cn(
              "rounded-md p-2 shadow-sm border",
              "bg-card/90 backdrop-blur-sm",
              "border-border/50"
            )}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                <span className="text-[10px] font-semibold text-muted-foreground">Revenue</span>
              </div>
              <div className="text-sm font-bold text-foreground">$12.5k</div>
              <div className="h-1 bg-muted/50 rounded-full mt-1.5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full" style={{ width: '75%' }}></div>
              </div>
            </div>
            
            {/* Members Card */}
            <div className={cn(
              "rounded-md p-2 shadow-sm border",
              "bg-card/90 backdrop-blur-sm",
              "border-border/50"
            )}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                <span className="text-[10px] font-semibold text-muted-foreground">Members</span>
              </div>
              <div className="text-sm font-bold text-foreground">248</div>
              <div className="h-1 bg-muted/50 rounded-full mt-1.5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full" style={{ width: '62%' }}></div>
              </div>
            </div>
            
            {/* Growth Card */}
            <div className={cn(
              "rounded-md p-2 shadow-sm border",
              "bg-card/90 backdrop-blur-sm",
              "border-border/50"
            )}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                <span className="text-[10px] font-semibold text-muted-foreground">Growth</span>
              </div>
              <div className="text-sm font-bold text-foreground">+24%</div>
              <div className="h-1 bg-muted/50 rounded-full mt-1.5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-400 to-pink-500 rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>
            
            {/* Chart preview below */}
            <div className={cn(
              "col-span-3 mt-1.5 rounded-md p-2 border",
              "bg-card/90 backdrop-blur-sm",
              "border-border/50"
            )}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-muted-foreground">Monthly Trend</span>
                <Sparkles className="h-2.5 w-2.5 text-cyan-500 dark:text-cyan-400" />
              </div>
              <div className="relative h-12">
                <svg viewBox="0 0 200 60" className="w-full h-full">
                  <defs>
                    <linearGradient id="trendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Trend line */}
                  <path
                    d="M 10 50 Q 40 45, 70 35 T 130 20 L 190 15"
                    stroke="#06B6D4"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                  />
                  {/* Gradient fill */}
                  <path
                    d="M 10 50 Q 40 45, 70 35 T 130 20 L 190 15 L 190 60 L 10 60 Z"
                    fill="url(#trendGradient)"
                  />
                  {/* Data points */}
                  <circle cx="40" cy="45" r="2" fill="#06B6D4" />
                  <circle cx="100" cy="28" r="2" fill="#06B6D4" />
                  <circle cx="160" cy="18" r="2" fill="#06B6D4" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

