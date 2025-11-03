'use client'

import { TrendingUp, Users, Target, Sparkles } from 'lucide-react'

export function StepWelcome() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-semibold">Welcome to Whoplytics</h2>
        <p className="text-muted-foreground">Your subscription business, at a glance.</p>
      </div>

      <div className="rounded-lg bg-muted/50 p-6 space-y-4">
        <h3 className="font-semibold">What you'll get:</h3>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-primary/10 p-1.5">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium">Live revenue & member trends</p>
              <p className="text-sm text-muted-foreground">Real-time dashboard with key metrics</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-primary/10 p-1.5">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium">Weekly insights in your inbox</p>
              <p className="text-sm text-muted-foreground">Automated summaries every week</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-primary/10 p-1.5">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium">Clear goals with progress</p>
              <p className="text-sm text-muted-foreground">Track your monthly revenue targets</p>
            </div>
          </li>
        </ul>
      </div>

      {/* Simple SVG illustration */}
      <div className="flex justify-center pt-4">
        <div className="relative w-32 h-20">
          <svg viewBox="0 0 200 120" className="w-full h-full">
            <defs>
              <linearGradient id="graphGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#60A5FA" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Graph line */}
            <path
              d="M 20 80 Q 50 60, 80 50 T 140 40 L 180 30"
              stroke="#60A5FA"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            {/* Gradient fill under line */}
            <path
              d="M 20 80 Q 50 60, 80 50 T 140 40 L 180 30 L 180 120 L 20 120 Z"
              fill="url(#graphGradient)"
            />
          </svg>
        </div>
      </div>
    </div>
  )
}

