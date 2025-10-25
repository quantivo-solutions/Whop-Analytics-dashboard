/**
 * Plan badge component
 * Shows current plan with styling
 */

'use client'

import { getPlanBadgeClasses, getPlanDisplayName, type Plan } from '@/lib/plan'

interface PlanBadgeProps {
  plan: Plan
}

export function PlanBadge({ plan }: PlanBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${getPlanBadgeClasses(plan)}`}
    >
      Plan: {getPlanDisplayName(plan)}
    </span>
  )
}

