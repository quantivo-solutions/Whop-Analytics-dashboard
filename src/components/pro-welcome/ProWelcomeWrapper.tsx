'use client'

import { ProWelcomeModal } from './ProWelcomeModal'
import { useState, useEffect } from 'react'

interface ProWelcomeWrapperProps {
  companyId: string
  onClose: () => void
}

export function ProWelcomeWrapper({ companyId, onClose }: ProWelcomeWrapperProps) {
  const [open, setOpen] = useState(true)

  const handleClose = async () => {
    setOpen(false)
    // Mark Pro welcome as shown
    try {
      await fetch('/api/company/prefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          patch: { proWelcomeShownAt: new Date().toISOString() },
        }),
      })
    } catch (error) {
      console.error('[Pro Welcome] Error marking as shown:', error)
    }
    onClose()
  }

  return <ProWelcomeModal open={open} onClose={handleClose} />
}

