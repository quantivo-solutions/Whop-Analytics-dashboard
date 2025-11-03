'use client'

import { Wizard } from './Wizard'

interface WizardWrapperProps {
  companyId: string
  initialPrefs?: {
    goalAmount: number | null
    completedAt: string | null
  }
  onComplete?: () => void
}

export function WizardWrapper({ companyId, initialPrefs, onComplete }: WizardWrapperProps) {
  return <Wizard companyId={companyId} initialPrefs={initialPrefs} onComplete={onComplete} />
}

