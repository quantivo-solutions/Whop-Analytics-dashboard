/**
 * Modern Chart Component
 * Smooth line charts with subtle animations and beautiful gradients
 * Inspired by Linear, Vercel, and Stripe dashboards
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { DashboardSeries } from '@/lib/metrics'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface ModernChartProps {
  data: DashboardSeries[]
}

export function ModernChart({ data }: ModernChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'members'>('revenue')

  if (data.length === 0) {
    return null
  }

  // Calculate metrics
  const revenueData = data.map(d => d.grossRevenue)
  const membersData = data.map(d => d.activeMembers)
  
  const maxRevenue = Math.max(...revenueData, 1)
  const maxMembers = Math.max(...membersData, 1)
  
  const totalRevenue = revenueData.reduce((sum, v) => sum + v, 0)
  const avgRevenue = totalRevenue / revenueData.length
  const totalNewMembers = data.reduce((sum, d) => sum + d.newMembers, 0)
  
  // Calculate trends
  const revenueChange = revenueData.length > 1
    ? ((revenueData[revenueData.length - 1] - revenueData[0]) / revenueData[0]) * 100
    : 0
  const membersChange = membersData.length > 1
    ? ((membersData[membersData.length - 1] - membersData[0]) / membersData[0]) * 100
    : 0

  const currentData = selectedMetric === 'revenue' ? revenueData : membersData
  const maxValue = selectedMetric === 'revenue' ? maxRevenue : maxMembers

  // Generate SVG path for smooth line
  const generatePath = (values: number[], max: number) => {
    if (values.length === 0) return ''
    
    const width = 100
    const height = 100
    const padding = 5
    
    const points = values.map((value, index) => ({
      x: padding + (index / (values.length - 1)) * (width - padding * 2),
      y: height - padding - ((value / max) * (height - padding * 2))
    }))

    // Create smooth curve using quadratic bezier curves
    let path = `M ${points[0].x} ${points[0].y}`
    
    for (let i = 0; i < points.length - 1; i++) {
      const xMid = (points[i].x + points[i + 1].x) / 2
      const yMid = (points[i].y + points[i + 1].y) / 2
      
      path += ` Q ${points[i].x} ${points[i].y} ${xMid} ${yMid}`
    }
    
    path += ` T ${points[points.length - 1].x} ${points[points.length - 1].y}`
    
    return path
  }

  const linePath = generatePath(currentData, maxValue)
  
  // Generate gradient fill path (extends to bottom)
  const fillPath = linePath + ` L 100 100 L 0 100 Z`

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="space-y-6">
      {/* Main Chart Card */}
      <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-background to-muted/20">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">Performance Overview</CardTitle>
              <CardDescription className="text-base mt-1">
                Last {data.length} days of activity
              </CardDescription>
            </div>
            
            {/* Metric Selector */}
            <div className="flex gap-2 bg-muted/50 rounded-lg p-1">
              <button
                onClick={() => setSelectedMetric('revenue')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  selectedMetric === 'revenue'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Revenue
              </button>
              <button
                onClick={() => setSelectedMetric('members')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  selectedMetric === 'members'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Members
              </button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          {/* Chart Container */}
          <div className="relative h-64 w-full">
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full"
              preserveAspectRatio="none"
            >
              {/* Gradient definitions */}
              <defs>
                <linearGradient id="revenueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={selectedMetric === 'revenue' ? '#10b981' : '#3b82f6'} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={selectedMetric === 'revenue' ? '#10b981' : '#3b82f6'} stopOpacity="0" />
                </linearGradient>
                
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              {/* Grid lines */}
              {[0, 25, 50, 75, 100].map((y) => (
                <line
                  key={y}
                  x1="0"
                  y1={y}
                  x2="100"
                  y2={y}
                  stroke="currentColor"
                  strokeWidth="0.1"
                  className="text-muted-foreground/20"
                />
              ))}
              
              {/* Gradient fill */}
              <path
                d={fillPath}
                fill="url(#revenueGradient)"
                className="animate-in fade-in duration-1000"
              />
              
              {/* Line */}
              <path
                d={linePath}
                fill="none"
                stroke={selectedMetric === 'revenue' ? '#10b981' : '#3b82f6'}
                strokeWidth="0.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-in slide-in-from-left duration-1000"
                filter="url(#glow)"
              />
              
              {/* Data points */}
              {currentData.map((value, index) => {
                const x = 5 + (index / (currentData.length - 1)) * 90
                const y = 95 - ((value / maxValue) * 90)
                const isHovered = hoveredIndex === index
                
                return (
                  <g key={index}>
                    <circle
                      cx={x}
                      cy={y}
                      r={isHovered ? 1.5 : 0.8}
                      fill={selectedMetric === 'revenue' ? '#10b981' : '#3b82f6'}
                      className="transition-all duration-200 cursor-pointer"
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />
                    
                    {isHovered && (
                      <>
                        <circle
                          cx={x}
                          cy={y}
                          r={2.5}
                          fill="none"
                          stroke={selectedMetric === 'revenue' ? '#10b981' : '#3b82f6'}
                          strokeWidth="0.3"
                          className="animate-ping"
                        />
                      </>
                    )}
                  </g>
                )
              })}
            </svg>
            
            {/* Hover tooltip */}
            {hoveredIndex !== null && (
              <div
                className="absolute bg-background border shadow-lg rounded-lg px-3 py-2 pointer-events-none animate-in fade-in zoom-in-95 duration-200"
                style={{
                  left: `${(hoveredIndex / (currentData.length - 1)) * 100}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <p className="text-xs text-muted-foreground">
                  {formatDate(data[hoveredIndex].date)}
                </p>
                <p className="text-sm font-bold">
                  {selectedMetric === 'revenue' 
                    ? formatCurrency(data[hoveredIndex].grossRevenue)
                    : `${data[hoveredIndex].activeMembers} members`
                  }
                </p>
                {selectedMetric === 'members' && (
                  <p className="text-xs text-muted-foreground">
                    {data[hoveredIndex].newMembers > 0 && `+${data[hoveredIndex].newMembers} new `}
                    {data[hoveredIndex].cancellations > 0 && `-${data[hoveredIndex].cancellations} left`}
                  </p>
                )}
              </div>
            )}
          </div>
          
          {/* Chart Stats */}
          <div className="mt-8 grid grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total</p>
              <p className="text-xl font-bold">
                {selectedMetric === 'revenue' 
                  ? formatCurrency(totalRevenue)
                  : `${membersData[membersData.length - 1]} members`
                }
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Average</p>
              <p className="text-xl font-bold">
                {selectedMetric === 'revenue'
                  ? formatCurrency(avgRevenue)
                  : `${Math.round(membersData.reduce((a, b) => a + b, 0) / membersData.length)}`
                }
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                Trend
                {(selectedMetric === 'revenue' ? revenueChange : membersChange) > 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
              </p>
              <p className={`text-xl font-bold ${
                (selectedMetric === 'revenue' ? revenueChange : membersChange) > 0 
                  ? 'text-green-500' 
                  : 'text-red-500'
              }`}>
                {(selectedMetric === 'revenue' ? revenueChange : membersChange) > 0 ? '+' : ''}
                {(selectedMetric === 'revenue' ? revenueChange : membersChange).toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-1">Last {data.length} days</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">New Members</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">+{totalNewMembers}</p>
            <p className="text-xs text-muted-foreground mt-1">Joined this period</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Now</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600">{membersData[membersData.length - 1]}</p>
            <p className="text-xs text-muted-foreground mt-1">Current members</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

