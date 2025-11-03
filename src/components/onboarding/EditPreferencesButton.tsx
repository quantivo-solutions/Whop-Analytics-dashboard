'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Settings } from 'lucide-react'
import { Wizard } from './Wizard'

interface EditPreferencesButtonProps {
  companyId: string
  prefs: {
    goalAmount: number | null
    wantsDailyMail: boolean
    wantsDiscord: boolean
    completedAt: string | null
  } | null
}

export function EditPreferencesButton({ companyId, prefs }: EditPreferencesButtonProps) {
  const [showWizard, setShowWizard] = useState(false)

  if (showWizard) {
    return (
      <Wizard
        companyId={companyId}
        initialPrefs={prefs ? {
          goalAmount: prefs.goalAmount,
          completedAt: prefs.completedAt,
        } : undefined}
        onComplete={() => setShowWizard(false)}
      />
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setShowWizard(true)}
      className="gap-2"
    >
      <Settings className="h-4 w-4" />
      <span className="hidden sm:inline">Edit Preferences</span>
    </Button>
  )
}

